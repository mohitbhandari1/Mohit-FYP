import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendEmail, welcomeEmail } from '../email';

const router = express.Router();

// Helper to set the JWT as an httpOnly cookie
function setTokenCookie(res: express.Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

router.post('/register', async (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  try {
    const hashedPassword = await bcryptjs.hash(password, 10);
    const result = await query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );

    // Log activity
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [result.rows[0].id, name, 'user_registered', `New user registered: ${email}`]
    );

    // Send welcome email (non-blocking, errors caught)
    const emailContent = welcomeEmail(name);
    sendEmail(email, emailContent.subject, emailContent.html).catch((err) =>
      console.error('Failed to send welcome email:', err)
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.message.includes('duplicate')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await query('SELECT id, name, email, password, role FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is an organizer who was recently approved and hasn't changed temp password
    let needsPasswordChange = false;
    const appResult = await query(
      'SELECT id, temp_password FROM organizer_applications WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
      [user.id, 'approved']
    );
    if (appResult.rows.length > 0 && appResult.rows[0].temp_password) {
      const isTempPassword = await bcryptjs.compare(password, appResult.rows[0].temp_password);
      if (isTempPassword) {
        needsPasswordChange = true;
      }
    }

    const jwtSecret = process.env.JWT_SECRET || 'secret-key';
    const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, {
      expiresIn: '7d',
    });

    // Set httpOnly cookie (secure, persists across browser sessions)
    setTokenCookie(res, token);

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      needsPasswordChange,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/change-password - Change password (for temp password flow)
router.put('/change-password', authMiddleware, async (req: AuthRequest, res, next) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    const userResult = await query('SELECT id, password FROM users WHERE id = $1', [req.userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const passwordMatch = await bcryptjs.compare(current_password, user.password);

    if (!passwordMatch) {
      // Check if it matches the temp password
      const appResult = await query(
        'SELECT temp_password FROM organizer_applications WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
        [req.userId, 'approved']
      );

      if (appResult.rows.length === 0 || !appResult.rows[0].temp_password) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const tempMatch = await bcryptjs.compare(current_password, appResult.rows[0].temp_password);
      if (!tempMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const hashedPassword = await bcryptjs.hash(new_password, 10);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.userId]);

    // Clear the temp password in the application record
    await query(
      'UPDATE organizer_applications SET temp_password = NULL WHERE user_id = $1 AND status = $2',
      [req.userId, 'approved']
    );

    // Generate new token
    const jwtSecret = process.env.JWT_SECRET || 'secret-key';
    const token = jwt.sign({ id: req.userId, role: req.userRole }, jwtSecret, {
      expiresIn: '7d',
    });

    // Update the httpOnly cookie with the new token
    setTokenCookie(res, token);

    res.json({ message: 'Password changed successfully', token });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout - Clear the auth cookie
router.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, interests, bio, is_admin, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/profile', authMiddleware, async (req: AuthRequest, res, next) => {
  const { name, bio, interests } = req.body;
  try {
    const result = await query(
      'UPDATE users SET name = COALESCE($1, name), bio = COALESCE($2, bio), interests = COALESCE($3, interests) WHERE id = $4 RETURNING id, name, email, bio, interests',
      [name || null, bio || null, interests || null, req.userId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
