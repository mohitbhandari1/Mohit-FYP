import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', async (req, res, next) => {
  const searchTerm = req.query.search ? `%${req.query.search}%` : null;
  const category = req.query.category;

  try {
    let sql = 'SELECT c.id, c.name, c.description, c.category, c.website, c.owner_id, c.member_count, u.name as owner_name FROM communities c LEFT JOIN users u ON c.owner_id = u.id WHERE 1=1';
    const params: any[] = [];

    if (searchTerm) {
      sql += ' AND (c.name ILIKE $1 OR c.description ILIKE $1)';
      params.push(searchTerm);
    }

    if (category) {
      sql += ` AND c.category = $${params.length + 1}`;
      params.push(category);
    }

    sql += ' ORDER BY c.id DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  const communityId = Number(req.params.id);
  try {
    const result = await query(
      'SELECT c.id, c.name, c.description, c.category, c.website, c.owner_id, c.member_count, u.name as owner_name FROM communities c LEFT JOIN users u ON c.owner_id = u.id WHERE c.id = $1',
      [communityId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  const { name, description, category, website } = req.body;
  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required' });
  }

  try {
    const result = await query(
      'INSERT INTO communities (name, description, category, website, owner_id, member_count) VALUES ($1, $2, $3, $4, $5, 1) RETURNING id, name, description, category, website, owner_id, member_count',
      [name, description, category || null, website || null, req.userId]
    );

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'community_created', `Created community: ${name}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  const { name, description, category, website } = req.body;

  try {
    // Check ownership
    const community = await query('SELECT owner_id FROM communities WHERE id = $1', [communityId]);
    if (community.rows.length === 0 || community.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this community' });
    }

    const result = await query(
      'UPDATE communities SET name = COALESCE($1, name), description = COALESCE($2, description), category = COALESCE($3, category), website = COALESCE($4, website) WHERE id = $5 RETURNING id, name, description, category, website',
      [name || null, description || null, category || null, website || null, communityId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);

  try {
    const community = await query('SELECT owner_id FROM communities WHERE id = $1', [communityId]);
    if (community.rows.length === 0 || community.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this community' });
    }

    await query('DELETE FROM communities WHERE id = $1', [communityId]);
    res.json({ message: 'Community deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
