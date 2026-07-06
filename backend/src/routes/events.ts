import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// ─── File Upload Setup for Events ───
const eventStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../../uploads/events');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `event-${uniqueSuffix}${ext}`);
  },
});

const uploadEventImage = multer({
  storage: eventStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
    }
  },
});

// GET /api/events - List events with filtering
router.get('/', async (req, res, next) => {
  const communityId = req.query.communityId ? Number(req.query.communityId) : undefined;
  const upcoming = req.query.upcoming === 'true';
  const past = req.query.past === 'true';
  const category = req.query.category as string;
  const search = req.query.search as string;
  const eventType = req.query.event_type as string;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const offset = (page - 1) * (limit || pageSize);

  try {
    let sql = `SELECT e.id, e.title, e.description, e.event_date, e.start_time, e.end_date, e.end_time,
              e.location, e.event_type, e.community_id, e.attendee_count, e.max_attendees,
              e.banner_image, e.topics, e.payment_type, e.duration,
              c.name as community_name, c.owner_id, c.logo as community_logo
              FROM events e JOIN communities c ON e.community_id = c.id WHERE 1=1`;
    const params: any[] = [];
    let paramIdx = 1;

    if (communityId) {
      sql += ` AND e.community_id = $${paramIdx++}`;
      params.push(communityId);
    }
    if (upcoming) {
      sql += ` AND e.event_date >= NOW()`;
    }
    if (past) {
      sql += ` AND e.event_date < NOW()`;
    }
    if (category) {
      sql += ` AND (e.topics ILIKE $${paramIdx} OR c.category ILIKE $${paramIdx})`;
      params.push(`%${category}%`);
      paramIdx++;
    }
    if (eventType) {
      sql += ` AND e.event_type = $${paramIdx++}`;
      params.push(eventType);
    }
    if (search) {
      sql += ` AND (e.title ILIKE $${paramIdx} OR e.description ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    sql += ' ORDER BY e.event_date' + (upcoming ? ' ASC' : ' DESC');

    if (limit) {
      sql += ` LIMIT $${paramIdx++}`;
      params.push(limit);
    } else {
      sql += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(pageSize, offset);
      paramIdx += 2;
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/events/upcoming - Get upcoming events (shortcut)
router.get('/upcoming', async (req, res, next) => {
  const limit = Number(req.query.limit) || 10;
  try {
    const result = await query(
      `SELECT e.id, e.title, e.description, e.event_date, e.start_time, e.location,
              e.event_type, e.community_id, e.attendee_count, e.max_attendees,
              e.banner_image, e.topics, e.payment_type,
              c.name as community_name, c.logo as community_logo
       FROM events e JOIN communities c ON e.community_id = c.id
       WHERE e.event_date >= NOW()
       ORDER BY e.event_date ASC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/events/my-saved - Get user's saved events (must be before /:id)
router.get('/my-saved', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, e.title, e.description, e.event_date, e.location, e.banner_image,
              e.community_id, e.attendee_count, e.max_attendees, e.event_type,
              c.name as community_name
       FROM saved_events se
       JOIN events e ON se.event_id = e.id
       JOIN communities c ON e.community_id = c.id
       WHERE se.user_id = $1
       ORDER BY se.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/events/organizer - Get events for organizer's communities (must be before /:id)
router.get('/organizer', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, e.title, e.description, e.event_date, e.start_time, e.end_date, e.end_time,
              e.location, e.event_type, e.community_id, e.attendee_count, e.max_attendees,
              e.banner_image, e.topics, e.payment_type,
              c.name as community_name
       FROM events e
       JOIN communities c ON e.community_id = c.id
       WHERE c.owner_id = $1
       ORDER BY e.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/events/:id - Get event details
router.get('/:id', async (req, res, next) => {
  const eventId = Number(req.params.id);
  if (isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid event ID' });
  }

  try {
    const result = await query(
      `SELECT e.*, c.name as community_name, c.owner_id as community_owner_id,
              c.logo as community_logo, c.banner_image as community_banner,
              c.description as community_description, c.category as community_category,
              c.member_count as community_member_count,
              u.name as community_owner_name
       FROM events e
       JOIN communities c ON e.community_id = c.id
       LEFT JOIN users u ON c.owner_id = u.id
       WHERE e.id = $1`,
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

// POST /api/events - Create event (supports file uploads)
router.post('/', authMiddleware, uploadEventImage.single('banner_image'), async (req: AuthRequest, res, next) => {
  const {
    community_id, title, description, event_date, start_time, end_date, end_time,
    duration, location, event_type, max_attendees, allow_guests,
    guest_limit, rsvp_deadline, payment_type, topics, hosts, speakers,
    agenda, requirements, instructions
  } = req.body;

  if (!community_id || !title || !description || !event_date) {
    return res.status(400).json({ error: 'community_id, title, description, and event_date are required' });
  }

  try {
    // Check that the user owns the community (or is admin)
    const community = await query('SELECT owner_id FROM communities WHERE id = $1', [community_id]);
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    if (community.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to create events for this community' });
    }

    // Get uploaded file URL or body field
    let bannerImage = req.body.banner_image || null;
    if (req.file) {
      bannerImage = '/uploads/events/' + req.file.filename;
    }

    const result = await query(
      `INSERT INTO events (community_id, title, description, event_date, start_time, end_date, end_time,
        duration, location, event_type, banner_image, max_attendees, allow_guests,
        guest_limit, rsvp_deadline, payment_type, topics, hosts, speakers,
        agenda, requirements, instructions, attendee_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 0)
       RETURNING *`,
      [community_id, title, description, event_date, start_time || null, end_date || null, end_time || null,
       duration || null, location || null, event_type || 'physical', bannerImage,
       max_attendees || null, allow_guests || false, guest_limit || null,
       rsvp_deadline || null, payment_type || 'free', topics || null, hosts || null, speakers || null,
       agenda || null, requirements || null, instructions || null]
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

// PUT /api/events/:id - Update event (supports file uploads)
router.put('/:id', authMiddleware, uploadEventImage.single('banner_image'), async (req: AuthRequest, res, next) => {
  const eventId = Number(req.params.id);
  const {
    title, description, event_date, start_time, end_date, end_time,
    duration, location, event_type, max_attendees, allow_guests,
    guest_limit, rsvp_deadline, payment_type, topics, hosts, speakers,
    agenda, requirements, instructions
  } = req.body;

  try {
    // Check authorization (owner or admin)
    const event = await query(
      `SELECT e.id, e.banner_image, e.community_id FROM events e JOIN communities c ON e.community_id = c.id
       WHERE e.id = $1 AND (c.owner_id = $2 OR $3 = 'admin')`,
      [eventId, req.userId, req.userRole]
    );

    if (event.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to edit this event' });
    }

    // Get uploaded file URL or body field
    let banner_image = req.body.banner_image || event.rows[0].banner_image;
    if (req.file) {
      banner_image = '/uploads/events/' + req.file.filename;
      // Delete old file
      if (event.rows[0].banner_image) {
        const oldPath = path.join(__dirname, '../..', event.rows[0].banner_image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    const result = await query(
      `UPDATE events SET
        title = COALESCE($1, title), description = COALESCE($2, description),
        event_date = COALESCE($3, event_date), start_time = COALESCE($4, start_time),
        end_date = COALESCE($5, end_date), end_time = COALESCE($6, end_time),
        duration = COALESCE($7, duration), location = COALESCE($8, location),
        event_type = COALESCE($9, event_type), banner_image = COALESCE($10, banner_image),
        max_attendees = COALESCE($11, max_attendees), allow_guests = COALESCE($12, allow_guests),
        guest_limit = COALESCE($13, guest_limit), rsvp_deadline = COALESCE($14, rsvp_deadline),
        payment_type = COALESCE($15, payment_type), topics = COALESCE($16, topics),
        hosts = COALESCE($17, hosts), speakers = COALESCE($18, speakers),
        agenda = COALESCE($19, agenda), requirements = COALESCE($20, requirements),
        instructions = COALESCE($21, instructions)
       WHERE id = $22 RETURNING *`,
      [title || null, description || null, event_date || null, start_time || null,
       end_date || null, end_time || null, duration || null, location || null,
       event_type || null, banner_image || null, max_attendees || null, allow_guests ?? null,
       guest_limit || null, rsvp_deadline || null, payment_type || null, topics || null,
       hosts || null, speakers || null, agenda || null, requirements || null, instructions || null,
       eventId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/events/:id - Delete event
router.delete('/:id', authMiddleware, async (req: AuthRequest, res, next) => {
  const eventId = Number(req.params.id);
  try {
    const event = await query(
      `SELECT e.id, e.title FROM events e JOIN communities c ON e.community_id = c.id
       WHERE e.id = $1 AND (c.owner_id = $2 OR $3 = 'admin')`,
      [eventId, req.userId, req.userRole]
    );
    if (event.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await query('DELETE FROM events WHERE id = $1', [eventId]);

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'event_deleted', `Deleted event: ${event.rows[0].title}`]
    );

    res.json({ message: 'Event deleted' });
  } catch (error) {
    next(error);
  }
});

// POST /api/events/:id/save - Save/unsave an event
router.post('/:id/save', authMiddleware, async (req: AuthRequest, res, next) => {
  const eventId = Number(req.params.id);
  try {
    const existing = await query(
      'SELECT 1 FROM saved_events WHERE user_id = $1 AND event_id = $2',
      [req.userId, eventId]
    );
    if (existing.rows.length > 0) {
      await query('DELETE FROM saved_events WHERE user_id = $1 AND event_id = $2', [req.userId, eventId]);
      res.json({ saved: false });
    } else {
      await query('INSERT INTO saved_events (user_id, event_id) VALUES ($1, $2)', [req.userId, eventId]);
      res.json({ saved: true });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/events/:id/saved - Check if event is saved
router.get('/:id/saved', authMiddleware, async (req: AuthRequest, res, next) => {
  const eventId = Number(req.params.id);
  try {
    const result = await query(
      'SELECT 1 FROM saved_events WHERE user_id = $1 AND event_id = $2',
      [req.userId, eventId]
    );
    res.json({ saved: result.rows.length > 0 });
  } catch (error) {
    next(error);
  }
});

// GET /api/events/:id/attendees - Get attendees for an event
router.get('/:id/attendees', async (req, res, next) => {
  const eventId = Number(req.params.id);
  try {
    const result = await query(
      `SELECT u.id, u.name, u.avatar_url, r.status, r.created_at
       FROM rsvps r JOIN users u ON r.user_id = u.id
       WHERE r.event_id = $1 AND r.status = 'attending'
       ORDER BY r.created_at ASC`,
      [eventId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
