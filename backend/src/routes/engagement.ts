import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ─── RSVP Endpoints ───

// POST /api/engagement/rsvp - RSVP to an event (attending/not_attending)
router.post('/rsvp', authMiddleware, async (req: AuthRequest, res, next) => {
  const { event_id, status, full_name, phone, email } = req.body;
  if (!event_id) {
    return res.status(400).json({ error: 'event_id is required' });
  }

  const rsvpStatus = status || 'attending';
  if (!['attending', 'not_attending'].includes(rsvpStatus)) {
    return res.status(400).json({ error: 'Status must be "attending" or "not_attending"' });
  }

  try {
    // Check if event exists
    const eventCheck = await query('SELECT id, community_id, title FROM events WHERE id = $1', [event_id]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check previous RSVP status before upsert
    const prevRsvp = await query(
      'SELECT status FROM rsvps WHERE user_id = $1 AND event_id = $2',
      [req.userId, event_id]
    );
    const prevStatus = prevRsvp.rows[0]?.status;

    const result = await query(
      `INSERT INTO rsvps (user_id, event_id, status, full_name, phone, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, event_id)
       DO UPDATE SET status = $3, full_name = COALESCE($4, rsvps.full_name), phone = COALESCE($5, rsvps.phone), email = COALESCE($6, rsvps.email)
       RETURNING id, user_id, event_id, status`,
      [req.userId, event_id, rsvpStatus, full_name || null, phone || null, email || null]
    );

    // Update attendee_count based on status change
    const newStatus = result.rows[0]?.status;
    if (prevStatus !== newStatus) {
      if (newStatus === 'attending') {
        await query('UPDATE events SET attendee_count = attendee_count + 1 WHERE id = $1', [event_id]);

        // Auto-join the community when user attends an event
        const communityId = eventCheck.rows[0].community_id;
        if (communityId) {
          const existingMember = await query(
            'SELECT 1 FROM community_members WHERE user_id = $1 AND community_id = $2',
            [req.userId, communityId]
          );
          if (existingMember.rows.length === 0) {
            await query('INSERT INTO community_members (user_id, community_id) VALUES ($1, $2)', [
              req.userId, communityId
            ]);
            await query('UPDATE communities SET member_count = member_count + 1 WHERE id = $1', [communityId]);
          }
        }
      } else if (prevStatus === 'attending') {
        // User changed from attending to not_attending
        await query('UPDATE events SET attendee_count = GREATEST(attendee_count - 1, 0) WHERE id = $1', [event_id]);
      }
    }

    // Log activity
    const [user] = await Promise.all([
      query('SELECT name FROM users WHERE id = $1', [req.userId]),
    ]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'event_rsvp', `${newStatus === 'attending' ? 'RSVPed attending to' : 'Marked not attending for'} event: ${eventCheck.rows[0].title}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/engagement/rsvp - Cancel RSVP
router.delete('/rsvp', authMiddleware, async (req: AuthRequest, res, next) => {
  const { event_id } = req.body;
  if (!event_id) {
    return res.status(400).json({ error: 'event_id is required' });
  }

  try {
    const prevRsvp = await query(
      'SELECT status FROM rsvps WHERE user_id = $1 AND event_id = $2',
      [req.userId, event_id]
    );

    if (prevRsvp.rows.length === 0) {
      return res.status(404).json({ error: 'No RSVP found for this event' });
    }

    // If was attending, decrement count
    if (prevRsvp.rows[0].status === 'attending') {
      await query('UPDATE events SET attendee_count = GREATEST(attendee_count - 1, 0) WHERE id = $1', [event_id]);
    }

    await query('DELETE FROM rsvps WHERE user_id = $1 AND event_id = $2', [req.userId, event_id]);
    res.json({ message: 'RSVP cancelled' });
  } catch (error) {
    next(error);
  }
});

// GET /api/engagement/rsvp/event/:eventId - Get RSVPs for an event
router.get('/rsvp/event/:eventId', async (req, res, next) => {
  const eventId = Number(req.params.eventId);
  try {
    const result = await query(
      `SELECT r.user_id, r.status, r.full_name, r.phone, r.email, r.created_at, u.name, u.avatar_url
       FROM rsvps r JOIN users u ON r.user_id = u.id
       WHERE r.event_id = $1
       ORDER BY r.created_at DESC`,
      [eventId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/engagement/rsvp/user - Get current user's RSVPs
router.get('/rsvp/user', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, e.title, e.event_date, e.location, e.community_id, r.status, c.name as community_name
       FROM rsvps r
       JOIN events e ON r.event_id = e.id
       JOIN communities c ON e.community_id = c.id
       WHERE r.user_id = $1
       ORDER BY e.event_date`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/engagement/rsvp/status/:eventId - Get current user's RSVP status for an event
router.get('/rsvp/status/:eventId', authMiddleware, async (req: AuthRequest, res, next) => {
  const eventId = Number(req.params.eventId);
  try {
    const result = await query(
      'SELECT status FROM rsvps WHERE user_id = $1 AND event_id = $2',
      [req.userId, eventId]
    );
    if (result.rows.length === 0) {
      return res.json({ status: null });
    }
    res.json({ status: result.rows[0].status });
  } catch (error) {
    next(error);
  }
});

// ─── Review Endpoints ───

// POST /api/engagement/review - Create a review for a community or event
router.post('/review', authMiddleware, async (req: AuthRequest, res, next) => {
  const { community_id, event_id, rating, comment } = req.body;
  if (!rating || (!community_id && !event_id)) {
    return res.status(400).json({ error: 'Rating and either community_id or event_id are required' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    // Check for duplicate review
    const existing = await query(
      `SELECT id FROM reviews WHERE user_id = $1
       AND ($2::int IS NULL OR community_id = $2)
       AND ($3::int IS NULL OR event_id = $3)`,
      [req.userId, community_id || null, event_id || null]
    );

    if (existing.rows.length > 0) {
      // Update existing review
      const result = await query(
        'UPDATE reviews SET rating = $1, comment = $2 WHERE id = $3 RETURNING id, rating, comment, created_at',
        [rating, comment || null, existing.rows[0].id]
      );
      return res.json(result.rows[0]);
    }

    const result = await query(
      'INSERT INTO reviews (user_id, community_id, event_id, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING id, rating, comment, created_at',
      [req.userId, community_id || null, event_id || null, rating, comment || null]
    );

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    const target = community_id ? `community #${community_id}` : `event #${event_id}`;
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'review_created', `Left a ${rating}-star review on ${target}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/engagement/review/community/:communityId - Get reviews for a community
router.get('/review/community/:communityId', async (req, res, next) => {
  const communityId = Number(req.params.communityId);
  try {
    const result = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.user_id,
              u.name, u.avatar_url
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.community_id = $1
       ORDER BY r.created_at DESC`,
      [communityId]
    );

    // Also calculate average rating
    const avgResult = await query(
      'SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as total FROM reviews WHERE community_id = $1',
      [communityId]
    );

    res.json({
      reviews: result.rows,
      avg_rating: parseFloat(avgResult.rows[0].avg_rating) || 0,
      total_reviews: parseInt(avgResult.rows[0].total) || 0,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/engagement/review/event/:eventId - Get reviews for an event
router.get('/review/event/:eventId', async (req, res, next) => {
  const eventId = Number(req.params.eventId);
  try {
    const result = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.user_id,
              u.name, u.avatar_url
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.event_id = $1
       ORDER BY r.created_at DESC`,
      [eventId]
    );

    // Also calculate average rating
    const avgResult = await query(
      'SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as total FROM reviews WHERE event_id = $1',
      [eventId]
    );

    res.json({
      reviews: result.rows,
      avg_rating: parseFloat(avgResult.rows[0].avg_rating) || 0,
      total_reviews: parseInt(avgResult.rows[0].total) || 0,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Community Membership Endpoints ───

// GET /api/engagement/community/my-joined - Get user's joined communities
router.get('/community/my-joined', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.description, c.category, c.member_count, c.logo, c.banner_image, cm.joined_at
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

// GET /api/engagement/community/is-member/:communityId - Check if user is member
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

// POST /api/engagement/community/join/:communityId - Join a community
router.post('/community/join/:communityId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.communityId);
  try {
    // Check community exists
    const community = await query('SELECT id, name FROM communities WHERE id = $1', [communityId]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }

    // Check if user is already a member
    const existing = await query(
      'SELECT 1 FROM community_members WHERE user_id = $1 AND community_id = $2',
      [req.userId, communityId]
    );

    if (existing.rows.length > 0) {
      return res.json({ message: 'Already a member', already_member: true });
    }

    await query('INSERT INTO community_members (user_id, community_id) VALUES ($1, $2)', [
      req.userId,
      communityId,
    ]);
    // Increment member_count
    await query('UPDATE communities SET member_count = member_count + 1 WHERE id = $1', [communityId]);

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'community_join', `Joined community: ${community.rows[0].name}`]
    );

    res.json({ message: 'Joined community', joined: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/engagement/community/leave/:communityId - Leave a community
router.post('/community/leave/:communityId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.communityId);
  try {
    // Check community exists
    const community = await query('SELECT id, name, owner_id FROM communities WHERE id = $1', [communityId]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }

    // Owner cannot leave their own community
    if (community.rows[0].owner_id === req.userId) {
      return res.status(400).json({ error: 'Community owner cannot leave their own community' });
    }

    // Check if user is a member
    const existing = await query(
      'SELECT 1 FROM community_members WHERE user_id = $1 AND community_id = $2',
      [req.userId, communityId]
    );

    if (existing.rows.length === 0) {
      return res.status(400).json({ error: 'You are not a member of this community' });
    }

    await query('DELETE FROM community_members WHERE user_id = $1 AND community_id = $2', [
      req.userId,
      communityId,
    ]);
    // Decrement member_count
    await query('UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [communityId]);

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'community_leave', `Left community: ${community.rows[0].name}`]
    );

    res.json({ message: 'Left community', left: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/engagement/community/members/:communityId - Get community members list
router.get('/community/members/:communityId', async (req, res, next) => {
  const communityId = Number(req.params.communityId);
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.avatar_url, u.role, cm.joined_at
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = $1
       ORDER BY cm.joined_at ASC`,
      [communityId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/engagement/community/count/:communityId - Get community member count
router.get('/community/count/:communityId', async (req, res, next) => {
  const communityId = Number(req.params.communityId);
  try {
    const result = await query(
      'SELECT member_count FROM communities WHERE id = $1',
      [communityId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    res.json({ member_count: result.rows[0].member_count });
  } catch (error) {
    next(error);
  }
});

// GET /api/engagement/event/count/:eventId - Get event attendee count
router.get('/event/count/:eventId', async (req, res, next) => {
  const eventId = Number(req.params.eventId);
  try {
    const result = await query(
      'SELECT attendee_count FROM events WHERE id = $1',
      [eventId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ attendee_count: result.rows[0].attendee_count });
  } catch (error) {
    next(error);
  }
});

export default router;
