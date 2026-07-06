import express from 'express';
import { query } from '../db';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ─── Admin Stats ───

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const [users, communities, events, pendingApps, reviews] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM communities'),
      query('SELECT COUNT(*) as count FROM events'),
      query("SELECT COUNT(*) as count FROM organizer_applications WHERE status = 'pending'"),
      query('SELECT COUNT(*) as count FROM reviews'),
    ]);

    // Recent activity counts (last 7 days)
    const recentUsers = await query(
      "SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '7 days'"
    );
    const recentEvents = await query(
      "SELECT COUNT(*) as count FROM events WHERE created_at > NOW() - INTERVAL '7 days'"
    );

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalCommunities: parseInt(communities.rows[0].count),
      totalEvents: parseInt(events.rows[0].count),
      pendingApplications: parseInt(pendingApps.rows[0].count),
      totalReviews: parseInt(reviews.rows[0].count),
      recentUsers: parseInt(recentUsers.rows[0].count),
      recentEvents: parseInt(recentEvents.rows[0].count),
    });
  } catch (error) {
    next(error);
  }
});

// ─── User Management ───

// GET /api/admin/users - List all users (optionally filter by role)
router.get('/users', authMiddleware, adminMiddleware, async (req, res, next) => {
  const { role, search } = req.query;
  try {
    let sql = 'SELECT id, name, email, role, is_admin, avatar_url, created_at FROM users WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (role && typeof role === 'string') {
      sql += ` AND role = $${paramIdx++}`;
      params.push(role);
    }

    if (search && typeof search === 'string') {
      sql += ` AND (name ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users/:userId - Get single user details
router.get('/users/:userId', authMiddleware, adminMiddleware, async (req, res, next) => {
  const userId = Number(req.params.userId);
  try {
    const result = await query(
      'SELECT id, name, email, role, is_admin, interests, bio, avatar_url, banner_image, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:userId/role - Update user role
router.put('/users/:userId/role', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const { role } = req.body;
  const userId = Number(req.params.userId);

  if (!role || !['member', 'organizer', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be one of: member, organizer, admin' });
  }

  try {
    const result = await query(
      'UPDATE users SET role = $1, is_admin = $2 WHERE id = $3 RETURNING id, name, email, role',
      [role, role === 'admin', userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log activity
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Admin', 'user_role_changed', `Changed user #${userId} role to ${role}`]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/users/:userId - Delete user
router.delete('/users/:userId', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const userId = Number(req.params.userId);

  // Prevent deleting yourself
  if (userId === req.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const userCheck = await query('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await query('DELETE FROM users WHERE id = $1', [userId]);

    // Log activity
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Admin', 'user_deleted', `Deleted user: ${userCheck.rows[0].name} (#${userId})`]
    );

    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
});

// ─── Community Management ───

// GET /api/admin/communities - List all communities (admin)
router.get('/communities', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.description, c.category, c.member_count, c.owner_id, c.is_verified,
              u.name as owner_name, c.created_at
       FROM communities c
       LEFT JOIN users u ON c.owner_id = u.id
       ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/communities/:id - Edit any community (admin)
router.put('/communities/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  const { name, description, category, website, is_verified } = req.body;

  try {
    const result = await query(
      `UPDATE communities SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        website = COALESCE($4, website),
        is_verified = COALESCE($5, is_verified)
       WHERE id = $6 RETURNING id, name, description, category, website, is_verified`,
      [name || null, description || null, category || null, website || null, is_verified, communityId]
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
router.delete('/communities/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.id);
  try {
    const community = await query('SELECT name FROM communities WHERE id = $1', [communityId]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }

    await query('DELETE FROM communities WHERE id = $1', [communityId]);

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Admin', 'community_deleted', `Deleted community: ${community.rows[0].name}`]
    );

    res.json({ message: 'Community deleted' });
  } catch (error) {
    next(error);
  }
});

// ─── Event Management ───

// GET /api/admin/events - List all events (admin)
router.get('/events', authMiddleware, adminMiddleware, async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, e.title, e.description, e.event_date, e.location, e.community_id,
              e.attendee_count, e.max_attendees, e.event_type,
              c.name as community_name
       FROM events e
       JOIN communities c ON e.community_id = c.id
       ORDER BY e.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/events/:id - Edit any event (admin)
router.put('/events/:id', authMiddleware, adminMiddleware, async (_req, res, next) => {
  const eventId = Number(_req.params.id);
  const { title, description, event_date, location } = _req.body;

  try {
    const result = await query(
      `UPDATE events SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        event_date = COALESCE($3, event_date),
        location = COALESCE($4, location)
       WHERE id = $5
       RETURNING id, title, description, event_date, location`,
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
router.delete('/events/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res, next) => {
  const eventId = Number(req.params.id);
  try {
    const event = await query('SELECT title FROM events WHERE id = $1', [eventId]);
    if (event.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await query('DELETE FROM events WHERE id = $1', [eventId]);

    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, 'Admin', 'event_deleted', `Deleted event: ${event.rows[0].title}`]
    );

    res.json({ message: 'Event deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
