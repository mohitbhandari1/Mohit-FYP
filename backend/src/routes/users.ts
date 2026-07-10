import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/users - List users (public, limited info)
router.get('/', async (req, res, next) => {
  const search = req.query.search as string;
  const limit = Number(req.query.limit) || 20;

  try {
    let sql = 'SELECT id, name, avatar_url, role FROM users WHERE deleted_at IS NULL';
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      sql += ` AND (name ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    sql += ` ORDER BY name ASC LIMIT $${paramIdx}`;
    params.push(limit);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id - Get public user profile
router.get('/:id', async (req, res, next) => {
  const userId = Number(req.params.id);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const result = await query(
      'SELECT id, name, bio, interests, avatar_url, banner_image, role, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get community memberships
    const communities = await query(
      `SELECT c.id, c.name, c.category, c.logo
       FROM community_members cm JOIN communities c ON cm.community_id = c.id
       WHERE cm.user_id = $1
       ORDER BY cm.joined_at DESC LIMIT 10`,
      [userId]
    );

    res.json({
      ...result.rows[0],
      communities: communities.rows,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
