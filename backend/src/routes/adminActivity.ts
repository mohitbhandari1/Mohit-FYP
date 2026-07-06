import express from 'express';
import { query } from '../db';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = express.Router();

// GET /api/admin/activity - Get activity log (admin only)
router.get('/activity', authMiddleware, adminMiddleware, async (req, res, next) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const action = req.query.action as string;

  try {
    let sql = `SELECT a.id, a.user_id, a.user_name, a.action, a.description, a.created_at
               FROM activity_log a WHERE 1=1`;
    const params: any[] = [];
    let paramIdx = 1;

    if (action) {
      sql += ` AND a.action ILIKE $${paramIdx}`;
      params.push(`%${action}%`);
      paramIdx++;
    }

    sql += ` ORDER BY a.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/activity/stats - Get activity summary stats (admin only)
router.get('/activity/stats', authMiddleware, adminMiddleware, async (_req, res, next) => {
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
