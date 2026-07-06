import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

// ─── Avatar Upload Setup ───
const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
    }
  },
});

// ─── Banner Upload Setup ───
const bannerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../../uploads/banners');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `banner-${uniqueSuffix}${ext}`);
  },
});

const uploadBanner = multer({
  storage: bannerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
    }
  },
});

// POST /api/auth/banner - Upload profile banner/cover
router.post('/banner', authMiddleware, uploadBanner.single('banner'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const bannerUrl = '/uploads/banners/' + req.file.filename;

    // Delete old banner file if exists
    const oldUser = await query('SELECT banner_image FROM users WHERE id = $1', [req.userId]);
    if (oldUser.rows.length > 0 && oldUser.rows[0].banner_image) {
      const oldPath = path.join(__dirname, '../..', oldUser.rows[0].banner_image);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const result = await query(
      'UPDATE users SET banner_image = $1 WHERE id = $2 RETURNING id, banner_image',
      [bannerUrl, req.userId]
    );

    res.json({ banner_image: result.rows[0].banner_image });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/auth/banner - Remove profile banner
router.delete('/banner', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await query('SELECT banner_image FROM users WHERE id = $1', [req.userId]);
    if (user.rows.length > 0 && user.rows[0].banner_image) {
      const oldPath = path.join(__dirname, '../..', user.rows[0].banner_image);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await query('UPDATE users SET banner_image = NULL WHERE id = $1', [req.userId]);
    res.json({ message: 'Banner removed' });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, interests, bio, is_admin, avatar_url, banner_image, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.rows[0];
    // Check if user owns any communities
    const ownedResult = await query(
      'SELECT COUNT(*) as count FROM communities WHERE owner_id = $1',
      [req.userId]
    );
    user.owns_community = parseInt(ownedResult.rows[0].count) > 0;
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/avatar - Upload profile avatar
router.post('/avatar', authMiddleware, uploadAvatar.single('avatar'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = '/uploads/avatars/' + req.file.filename;

    // Delete old avatar file if exists
    const oldUser = await query('SELECT avatar_url FROM users WHERE id = $1', [req.userId]);
    if (oldUser.rows.length > 0 && oldUser.rows[0].avatar_url) {
      const oldPath = path.join(__dirname, '../..', oldUser.rows[0].avatar_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const result = await query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, avatar_url',
      [avatarUrl, req.userId]
    );

    res.json({ avatar_url: result.rows[0].avatar_url });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/auth/avatar - Remove profile avatar
router.delete('/avatar', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const user = await query('SELECT avatar_url FROM users WHERE id = $1', [req.userId]);
    if (user.rows.length > 0 && user.rows[0].avatar_url) {
      const oldPath = path.join(__dirname, '../..', user.rows[0].avatar_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await query('UPDATE users SET avatar_url = NULL WHERE id = $1', [req.userId]);
    res.json({ message: 'Avatar removed' });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', authMiddleware, async (req: AuthRequest, res, next) => {
  const { name, bio, interests } = req.body;
  try {
    const result = await query(
      'UPDATE users SET name = COALESCE($1, name), bio = COALESCE($2, bio), interests = COALESCE($3, interests) WHERE id = $4 RETURNING id, name, email, bio, interests, avatar_url',
      [name || null, bio || null, interests || null, req.userId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
