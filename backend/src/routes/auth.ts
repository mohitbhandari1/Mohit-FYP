import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db';
import { authMiddleware, AuthRequest, optionalAuth } from '../middleware/auth';
import { sendEmail, verificationCodeEmail, passwordResetCodeEmail, applicationApprovedEmail } from '../email';

const router = express.Router();

// Generate a 6-digit numeric code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to set the JWT as an httpOnly cookie
function setTokenCookie(res: express.Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

// ─── Registration Flow ───
// POST /api/auth/register - Send verification code (does NOT create user yet)
router.post('/register', async (req, res, next) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check if user already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Invalidate any previous pending registration codes for this email
    await query(
      "UPDATE verification_codes SET used = TRUE WHERE email = $1 AND purpose = 'registration'",
      [email]
    );

    // Generate code and hash password
    const code = generateCode();
    const hashedPassword = await bcryptjs.hash(password, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store the pending registration
    await query(
      `INSERT INTO verification_codes (email, code, purpose, name, password, expires_at)
       VALUES ($1, $2, 'registration', $3, $4, $5)`,
      [email, code, name, hashedPassword, expiresAt]
    );

    // Send verification code email (non-blocking)
    const emailContent = verificationCodeEmail(name, code);
    sendEmail(email, emailContent.subject, emailContent.html).catch((err) =>
      console.error('Failed to send verification code email:', err)
    );

    res.status(200).json({
      message: 'Verification code sent to your email',
      email,
    });
  } catch (error: any) {
    next(error);
  }
});

// POST /api/auth/verify-registration - Verify code and create user account
router.post('/verify-registration', async (req, res, next) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  try {
    const result = await query(
      `SELECT id, name, password, expires_at FROM verification_codes
       WHERE email = $1 AND code = $2 AND purpose = 'registration' AND used = FALSE`,
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const record = result.rows[0];

    // Check if code expired
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Mark the code as used
    await query('UPDATE verification_codes SET used = TRUE WHERE id = $1', [record.id]);

    // Create the user account
    const userResult = await query(
      'INSERT INTO users (name, email, password, email_verified) VALUES ($1, $2, $3, TRUE) RETURNING id, name, email, role',
      [record.name, email, record.password]
    );

    const user = userResult.rows[0];

    // Log activity
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [user.id, user.name, 'user_registered', `New user registered: ${email}`]
    );

    // Generate JWT token and set cookie
    const jwtSecret = process.env.JWT_SECRET || 'secret-key';
    const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, {
      expiresIn: '7d',
    });

    setTokenCookie(res, token);

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user,
    });
  } catch (error: any) {
    if (error.message && error.message.includes('duplicate')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    next(error);
  }
});

// POST /api/auth/resend-verification-code - Resend verification code for registration
router.post('/resend-verification-code', async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Check if there's a pending registration
    const pending = await query(
      "SELECT name, password FROM verification_codes WHERE email = $1 AND purpose = 'registration' AND used = FALSE AND expires_at > NOW()",
      [email]
    );

    if (pending.rows.length === 0) {
      // Check if user already exists
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'This email is already registered. Please log in.' });
      }
      return res.status(400).json({ error: 'No pending registration found. Please start registration again.' });
    }

    const record = pending.rows[0];

    // Invalidate old codes
    await query(
      "UPDATE verification_codes SET used = TRUE WHERE email = $1 AND purpose = 'registration'",
      [email]
    );

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      `INSERT INTO verification_codes (email, code, purpose, name, password, expires_at)
       VALUES ($1, $2, 'registration', $3, $4, $5)`,
      [email, code, record.name, record.password, expiresAt]
    );

    // Send new code
    const emailContent = verificationCodeEmail(record.name, code);
    sendEmail(email, emailContent.subject, emailContent.html).catch((err) =>
      console.error('Failed to resend verification code:', err)
    );

    res.json({ message: 'New verification code sent to your email' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await query('SELECT id, name, email, password, role, interests FROM users WHERE email = $1', [email]);
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

    setTokenCookie(res, token);

    const needsOnboarding = !user.interests || user.interests.trim() === '';

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      needsPasswordChange,
      needsOnboarding,
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

    await query(
      'UPDATE organizer_applications SET temp_password = NULL WHERE user_id = $1 AND status = $2',
      [req.userId, 'approved']
    );

    const jwtSecret = process.env.JWT_SECRET || 'secret-key';
    const token = jwt.sign({ id: req.userId, role: req.userRole }, jwtSecret, {
      expiresIn: '7d',
    });

    setTokenCookie(res, token);

    res.json({ message: 'Password changed successfully', token });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ message: 'Logged out successfully' });
});

// ─── Forgot Password Flow ───
// POST /api/auth/forgot-password - Send password reset code
router.post('/forgot-password', async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const userResult = await query('SELECT id, name, email FROM users WHERE email = $1', [email]);

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return res.json({ message: 'If that email exists, a password reset code has been sent.' });
    }

    const user = userResult.rows[0];

    // Invalidate any previous reset codes for this email
    await query(
      "UPDATE verification_codes SET used = TRUE WHERE email = $1 AND purpose = 'password_reset'",
      [email]
    );

    // Generate code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await query(
      `INSERT INTO verification_codes (email, code, purpose, expires_at)
       VALUES ($1, $2, 'password_reset', $3)`,
      [email, code, expiresAt]
    );

    // Send code (non-blocking)
    const emailContent = passwordResetCodeEmail(user.name, code);
    sendEmail(email, emailContent.subject, emailContent.html).catch((err) =>
      console.error('Failed to send password reset code:', err)
    );

    // Log activity
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [user.id, user.name, 'password_reset_requested', `Password reset requested for ${email}`]
    );

    res.json({ message: 'If that email exists, a password reset code has been sent.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify-reset-code - Verify password reset code
router.post('/verify-reset-code', async (req, res, next) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  try {
    const result = await query(
      `SELECT id, expires_at FROM verification_codes
       WHERE email = $1 AND code = $2 AND purpose = 'password_reset' AND used = FALSE`,
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const record = result.rows[0];

    // Check if code expired
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Mark as used
    await query('UPDATE verification_codes SET used = TRUE WHERE id = $1', [record.id]);

    res.json({ message: 'Code verified successfully. You can now set a new password.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/resend-reset-code - Resend password reset code
router.post('/resend-reset-code', async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const userResult = await query('SELECT id, name, email FROM users WHERE email = $1', [email]);

    // Always return success
    if (userResult.rows.length === 0) {
      return res.json({ message: 'If that email exists, a new password reset code has been sent.' });
    }

    const user = userResult.rows[0];

    // Invalidate old codes
    await query(
      "UPDATE verification_codes SET used = TRUE WHERE email = $1 AND purpose = 'password_reset'",
      [email]
    );

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(
      `INSERT INTO verification_codes (email, code, purpose, expires_at)
       VALUES ($1, $2, 'password_reset', $3)`,
      [email, code, expiresAt]
    );

    const emailContent = passwordResetCodeEmail(user.name, code);
    sendEmail(email, emailContent.subject, emailContent.html).catch((err) =>
      console.error('Failed to resend password reset code:', err)
    );

    res.json({ message: 'If that email exists, a new password reset code has been sent.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password - Reset password with code
router.post('/reset-password', async (req, res, next) => {
  const { email, code, new_password } = req.body;

  if (!email || !code || !new_password) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  try {
    // Find and validate the verification code
    const codeResult = await query(
      `SELECT id, expires_at FROM verification_codes
       WHERE email = $1 AND code = $2 AND purpose = 'password_reset' AND used = FALSE`,
      [email, code]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or already used verification code' });
    }

    const record = codeResult.rows[0];

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Mark code as used
    await query('UPDATE verification_codes SET used = TRUE WHERE id = $1', [record.id]);

    // Find user and update password
    const userResult = await query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const hashedPassword = await bcryptjs.hash(new_password, 10);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);

    // Log activity
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [user.id, user.name, 'password_reset', `Password reset completed for ${user.email}`]
    );

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
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

// DELETE /api/auth/banner
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

// GET /api/auth/me
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
    const ownedResult = await query(
      'SELECT COUNT(*) as count FROM communities WHERE owner_id = $1 AND deleted_at IS NULL',
      [req.userId]
    );
    user.owns_community = parseInt(ownedResult.rows[0].count) > 0;
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/avatar
router.post('/avatar', authMiddleware, uploadAvatar.single('avatar'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = '/uploads/avatars/' + req.file.filename;

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

// DELETE /api/auth/avatar
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

// PUT /api/auth/profile
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
