import express from 'express';
import { query } from '../db';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Admin only - List all users
router.get('/users', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const result = await query('SELECT id, name, email, role, is_admin, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Admin only - Update user role
router.put('/users/:userId/role', authMiddleware, adminMiddleware, async (req, res, next) => {
  const { role } = req.body;
  const userId = Number(req.params.userId);

  try {
    const result = await query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role', [role, userId]);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Admin only - Delete user
router.delete('/users/:userId', authMiddleware, adminMiddleware, async (req, res, next) => {
  const userId = Number(req.params.userId);

  try {
    await query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
});

// Admin stats
router.get('/stats', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const users = await query('SELECT COUNT(*) as count FROM users');
    const communities = await query('SELECT COUNT(*) as count FROM communities');
    const events = await query('SELECT COUNT(*) as count FROM events');

    res.json({
      totalUsers: users.rows[0].count,
      totalCommunities: communities.rows[0].count,
      totalEvents: events.rows[0].count,
    });
  } catch (error) {
    next(error);
  }
});

// Admin manage communities
// GET /api/admin/communities - List all communities (admin)
router.get('/communities', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT c.id, c.name, c.description, c.category, c.member_count, c.owner_id, u.name as owner_name, c.created_at FROM communities c LEFT JOIN users u ON c.owner_id = u.id ORDER BY c.created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/communities/:id - Edit any community (admin)
router.put('/communities/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  const communityId = Number(req.params.id);
  const { name, description, category, website } = req.body;

  try {
    const result = await query(
      'UPDATE communities SET name = COALESCE($1, name), description = COALESCE($2, description), category = COALESCE($3, category), website = COALESCE($4, website) WHERE id = $5 RETURNING id, name, description, category, website',
      [name || null, description || null, category || null, website || null, communityId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/communities/:id - Delete any community (admin)
router.delete('/communities/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  const communityId = Number(req.params.id);
  try {
    await query('DELETE FROM communities WHERE id = $1', [communityId]);
    res.json({ message: 'Community deleted' });
  } catch (error) {
    next(error);
  }
});

// Admin manage events
// GET /api/admin/events - List all events (admin)
router.get('/events', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT e.id, e.title, e.description, e.event_date, e.location, e.community_id, e.attendee_count, c.name as community_name FROM events e JOIN communities c ON e.community_id = c.id ORDER BY e.created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/events/:id - Edit any event (admin)
router.put('/events/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  const eventId = Number(req.params.id);
  const { title, description, event_date, location } = req.body;

  try {
    const result = await query(
      'UPDATE events SET title = COALESCE($1, title), description = COALESCE($2, description), event_date = COALESCE($3, event_date), location = COALESCE($4, location) WHERE id = $5 RETURNING id, title, description, event_date, location',
      [title || null, description || null, event_date || null, location || null, eventId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/events/:id - Delete any event (admin)
router.delete('/events/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  const eventId = Number(req.params.id);
  try {
    await query('DELETE FROM events WHERE id = $1', [eventId]);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
