import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// RSVP endpoints
router.post('/rsvp', authMiddleware, async (req: AuthRequest, res, next) => {
  const { event_id, status } = req.body;
  if (!event_id) {
    return res.status(400).json({ error: 'event_id is required' });
  }

  try {
    const result = await query(
      'INSERT INTO rsvps (user_id, event_id, status) VALUES ($1, $2, $3) ON CONFLICT (user_id, event_id) DO UPDATE SET status = $3 RETURNING id, user_id, event_id, status',
      [req.userId, event_id, status || 'attending']
    );

    // Log activity
    const [user, event] = await Promise.all([
      query('SELECT name FROM users WHERE id = $1', [req.userId]),
      query('SELECT title FROM events WHERE id = $1', [event_id]),
    ]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'event_rsvp', `RSVPed to event: ${event.rows[0]?.title || ''}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.get('/rsvp/event/:eventId', async (req, res, next) => {
  const eventId = Number(req.params.eventId);
  try {
    const result = await query('SELECT user_id, status FROM rsvps WHERE event_id = $1', [eventId]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/rsvp/user', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await query(
      'SELECT e.id, e.title, e.event_date, r.status FROM rsvps r JOIN events e ON r.event_id = e.id WHERE r.user_id = $1 ORDER BY e.event_date',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Review endpoints
router.post('/review', authMiddleware, async (req: AuthRequest, res, next) => {
  const { community_id, event_id, rating, comment } = req.body;
  if (!rating || (!community_id && !event_id)) {
    return res.status(400).json({ error: 'Rating and either community_id or event_id are required' });
  }

  try {
    const result = await query(
      'INSERT INTO reviews (user_id, community_id, event_id, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING id, rating, comment',
      [req.userId, community_id || null, event_id || null, rating, comment || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.get('/review/community/:communityId', async (req, res, next) => {
  const communityId = Number(req.params.communityId);
  try {
    const result = await query(
      'SELECT r.id, r.rating, r.comment, u.name, r.created_at FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.community_id = $1 ORDER BY r.created_at DESC',
      [communityId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/review/event/:eventId', async (req, res, next) => {
  const eventId = Number(req.params.eventId);
  try {
    const result = await query(
      'SELECT r.id, r.rating, r.comment, u.name, r.created_at FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.event_id = $1 ORDER BY r.created_at DESC',
      [eventId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get user's joined communities
router.get('/community/my-joined', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.description, c.category, c.member_count, cm.joined_at
       FROM community_members cm
       JOIN communities c ON cm.community_id = c.id
       WHERE cm.user_id = $1
       ORDER BY cm.joined_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Check if user is member of a community
router.get('/community/is-member/:communityId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.communityId);
  try {
    const result = await query(
      'SELECT 1 FROM community_members WHERE user_id = $1 AND community_id = $2',
      [req.userId, communityId]
    );
    res.json({ isMember: result.rows.length > 0 });
  } catch (error) {
    next(error);
  }
});

// Join community
router.post('/community/join/:communityId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.communityId);
  try {
    await query('INSERT INTO community_members (user_id, community_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
      req.userId,
      communityId,
    ]);

    // Log activity
    const [user, community] = await Promise.all([
      query('SELECT name FROM users WHERE id = $1', [req.userId]),
      query('SELECT name FROM communities WHERE id = $1', [communityId]),
    ]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'community_join', `Joined community: ${community.rows[0]?.name || ''}`]
    );

    res.json({ message: 'Joined community' });
  } catch (error) {
    next(error);
  }
});

router.get('/community/members/:communityId', async (req, res, next) => {
  const communityId = Number(req.params.communityId);
  try {
    const result = await query('SELECT u.id, u.name, u.email FROM community_members cm JOIN users u ON cm.user_id = u.id WHERE cm.community_id = $1', [
      communityId,
    ]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
