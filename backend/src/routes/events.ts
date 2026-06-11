import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', async (req, res, next) => {
  const communityId = req.query.communityId ? Number(req.query.communityId) : undefined;
  const upcoming = req.query.upcoming === 'true';

  try {
    let sql: string;
    const params: any[] = [];
    let paramIndex = 1;

    if (communityId) {
      sql = `SELECT e.id, e.title, e.description, e.event_date, e.location, e.community_id, e.attendee_count, c.name as community_name, c.owner_id
             FROM events e JOIN communities c ON e.community_id = c.id
             WHERE e.community_id = $${paramIndex}`;
      params.push(communityId);
      paramIndex++;
    } else {
      sql = `SELECT e.id, e.title, e.description, e.event_date, e.location, e.community_id, e.attendee_count, c.name as community_name, c.owner_id
             FROM events e JOIN communities c ON e.community_id = c.id`;
    }

    if (upcoming) {
      sql += ` AND e.event_date >= NOW()`;
    }

    sql += ' ORDER BY e.event_date' + (upcoming ? ' ASC' : ' DESC');

    if (upcoming) {
      sql += ' LIMIT 6';
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  const eventId = Number(req.params.id);
  try {
    const result = await query(
      `SELECT e.id, e.title, e.description, e.event_date, e.location, e.community_id, e.attendee_count, c.name as community_name, c.owner_id
       FROM events e JOIN communities c ON e.community_id = c.id WHERE e.id = $1`,
      [eventId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res, next) => {
  const { community_id, title, description, event_date, location } = req.body;
  if (!community_id || !title || !description || !event_date) {
    return res.status(400).json({ error: 'community_id, title, description, and event_date are required' });
  }

  try {
    // Verify user is the community owner
    const community = await query('SELECT owner_id FROM communities WHERE id = $1', [community_id]);
    if (community.rows.length === 0 || community.rows[0].owner_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to create events for this community' });
    }

    const result = await query(
      'INSERT INTO events (community_id, title, description, event_date, location, attendee_count) VALUES ($1, $2, $3, $4, $5, 0) RETURNING id, community_id, title, description, event_date, location, attendee_count',
      [community_id, title, description, event_date, location || null]
    );

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'event_created', `Created event: ${title} in community #${community_id}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  const eventId = Number(req.params.id);
  const { title, description, event_date, location } = req.body;

  try {
    // Get the event and check if user owns the community
    const event = await query(
      'SELECT e.id, e.community_id FROM events e JOIN communities c ON e.community_id = c.id WHERE e.id = $1 AND c.owner_id = $2',
      [eventId, req.userId]
    );

    if (event.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to edit this event' });
    }

    const result = await query(
      'UPDATE events SET title = COALESCE($1, title), description = COALESCE($2, description), event_date = COALESCE($3, event_date), location = COALESCE($4, location) WHERE id = $5 RETURNING id, community_id, title, description, event_date, location',
      [title || null, description || null, event_date || null, location || null, eventId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  const eventId = Number(req.params.id);

  try {
    const event = await query(
      'SELECT e.id FROM events e JOIN communities c ON e.community_id = c.id WHERE e.id = $1 AND c.owner_id = $2',
      [eventId, req.userId]
    );

    if (event.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await query('DELETE FROM events WHERE id = $1', [eventId]);
    res.json({ message: 'Event deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
