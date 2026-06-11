import express from 'express';
import { query } from '../db';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/admin/activity - Get activity log (admin only)
router.get('/activity', authMiddleware, adminMiddleware, async (req, res, next) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  try {
    const result = await query(
      `SELECT a.id, a.user_id, a.user_name, a.action, a.description, a.created_at
       FROM activity_log a
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/activity/stats - Get activity summary stats (admin only)
router.get('/activity/stats', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT action, COUNT(*) as count
       FROM activity_log
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY action
       ORDER BY count DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
