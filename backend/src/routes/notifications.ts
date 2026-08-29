import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/notifications - Get current user's notifications
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;

    const result = await query(
      `SELECT id, type, title, message, link, is_read, created_at, community_logo
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.userId, limit, offset]
    );

    // Get unread count
    const countResult = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.userId]
    );

    res.json({
      notifications: result.rows,
      unread_count: parseInt(countResult.rows[0].count) || 0,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.userId]
    );
    res.json({ unread_count: parseInt(result.rows[0].count) || 0 });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/:id/read - Mark a notification as read
router.patch('/:id/read', authMiddleware, async (req: AuthRequest, res, next) => {
  const notifId = Number(req.params.id);
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [notifId, req.userId]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [req.userId]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/:id - Delete a notification
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  const notifId = Number(req.params.id);
  try {
    await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notifId, req.userId]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
