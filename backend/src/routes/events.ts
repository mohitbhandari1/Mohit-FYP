import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
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

// Computed column: how many seats are still open (null when unlimited)
const SEATS_REMAINING = `CASE WHEN e.max_attendees IS NULL THEN NULL ELSE GREATEST(e.max_attendees - e.attendee_count, 0) END AS seats_remaining`;

// ─── Custom registration questions ───────────────────────────────────────

interface EventQuestion {
  question: string;
  type: 'text' | 'textarea' | 'select' | 'file' | 'image';
  required: boolean;
  options: string[];
  sort_order: number;
}

/** Parses the `questions` JSON array sent by the create/edit forms. */
function parseQuestions(raw: any): EventQuestion[] {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((q) => q && typeof q.question === 'string' && q.question.trim())
    .map((q, i) => ({
      question: q.question.trim(),
      type: ['text', 'textarea', 'select', 'file', 'image'].includes(q.type) ? q.type : 'text',
      required: !!q.required,
      options: Array.isArray(q.options) ? q.options.map(String).filter(Boolean) : [],
      sort_order: i,
    }));
}

/** Replaces all custom registration questions for an event. */
async function replaceEventQuestions(eventId: number, rawQuestions: any): Promise<void> {
  const questions = parseQuestions(rawQuestions);
  await query('DELETE FROM event_questions WHERE event_id = $1', [eventId]);
  for (const q of questions) {
    await query(
      `INSERT INTO event_questions (event_id, question, type, required, options, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [eventId, q.question, q.type, q.required, q.options.length > 0 ? JSON.stringify(q.options) : null, q.sort_order]
    );
  }
}

/** Loads custom registration questions for an event (ordered). */
async function getEventQuestions(eventId: number) {
  const result = await query(
    'SELECT id, question, type, required, options, sort_order FROM event_questions WHERE event_id = $1 ORDER BY sort_order ASC, id ASC',
    [eventId]
  );
  return result.rows.map((r: any) => ({
    id: r.id,
    question: r.question,
    type: r.type,
    required: r.required,
    options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options || [],
  }));
}

// GET /api/events - List events with filtering
router.get('/', async (req, res, next) => {
  const communityId = req.query.communityId ? Number(req.query.communityId) : undefined;
  const upcoming = req.query.upcoming === 'true';
  const past = req.query.past === 'true';
  const category = req.query.category as string;
  const search = req.query.search as string;
  const eventType = req.query.event_type as string;
  const filter = req.query.filter as string; // today | week | month | fourMonths
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 20;
  const offset = (page - 1) * (limit || pageSize);

  try {
    let sql = `SELECT e.id, e.title, e.description, e.event_date, e.start_time, e.end_date, e.end_time,
              e.location, e.event_type, e.community_id, e.attendee_count, e.max_attendees,
              ${SEATS_REMAINING},
              e.banner_image, e.topics, e.payment_type, e.duration,
              e.age_limit, e.requires_documents, e.document_instructions,
              c.name as community_name, c.owner_id, c.logo as community_logo,
              u.name as community_owner_name,
              (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE event_id = e.id) as avg_rating
              FROM events e JOIN communities c ON e.community_id = c.id
              LEFT JOIN users u ON c.owner_id = u.id
              WHERE e.deleted_at IS NULL AND c.deleted_at IS NULL`;
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
    if (filter) {
      // Date-range filters based on the event date.
      if (filter === 'today') {
        sql += ` AND e.event_date >= date_trunc('day', NOW())
                AND e.event_date < date_trunc('day', NOW()) + INTERVAL '1 day'`;
      } else if (filter === 'week') {
        sql += ` AND e.event_date >= NOW()
                AND e.event_date < NOW() + INTERVAL '7 days'`;
      } else if (filter === 'month') {
        sql += ` AND e.event_date >= NOW()
                AND e.event_date < NOW() + INTERVAL '30 days'`;
      } else if (filter === 'fourMonths') {
        sql += ` AND e.event_date >= NOW()
                AND e.event_date < NOW() + INTERVAL '4 months'`;
      }
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

    // When a date-range filter is active, show the soonest events first.
    sql += ' ORDER BY e.event_date' + (upcoming || filter ? ' ASC' : ' DESC');

    if (limit) {
      sql += ` LIMIT $${paramIdx++}`;
      params.push(limit);
    } else {
      sql += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(pageSize, offset);
      paramIdx += 2;
    }

    const result = await query(sql, params);

    // Related events from OTHER categories (upcoming first). Returned when a
    // category filter is active and few/no events match, so the page never
    // looks empty and users discover events in similar categories.
    let related: any[] = [];
    const includeRelated = req.query.includeRelated === 'true';
    if (category && includeRelated && result.rows.length < 4) {
      const excludeIds = result.rows.map((r: any) => r.id);
      const relatedRes = await query(
        `SELECT e.id, e.title, e.description, e.event_date, e.start_time, e.end_date, e.end_time,
                e.location, e.event_type, e.community_id, e.attendee_count, e.max_attendees,
                ${SEATS_REMAINING},
                e.banner_image, e.topics, e.payment_type, e.duration,
                e.age_limit, e.requires_documents, e.document_instructions,
                c.name as community_name, c.owner_id, c.logo as community_logo,
                u.name as community_owner_name,
                (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE event_id = e.id) as avg_rating
         FROM events e JOIN communities c ON e.community_id = c.id
         LEFT JOIN users u ON c.owner_id = u.id
         WHERE e.deleted_at IS NULL AND c.deleted_at IS NULL
           AND (e.topics IS NULL OR e.topics NOT ILIKE $1)
           AND (c.category IS NULL OR c.category NOT ILIKE $1)
           AND NOT (e.id = ANY($2::int[]))
         ORDER BY e.event_date ASC
         LIMIT 3`,
        [`%${category}%`, excludeIds.length ? excludeIds : [0]]
      );
      related = relatedRes.rows;
    }

    if (includeRelated) {
      res.json({ events: result.rows, related, total: result.rows.length });
    } else {
      res.json(result.rows);
    }
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
              ${SEATS_REMAINING},
              e.banner_image, e.topics, e.payment_type,
              e.age_limit, e.requires_documents, e.document_instructions,
              c.name as community_name, c.logo as community_logo,
              u.name as community_owner_name,
              (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE event_id = e.id) as avg_rating
       FROM events e JOIN communities c ON e.community_id = c.id
       LEFT JOIN users u ON c.owner_id = u.id
       WHERE e.event_date >= NOW() AND e.deleted_at IS NULL AND c.deleted_at IS NULL
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
              e.community_id, e.attendee_count, e.max_attendees, ${SEATS_REMAINING}, e.event_type, e.start_time,
              c.name as community_name,
              u.name as community_owner_name,
              (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE event_id = e.id) as avg_rating
       FROM saved_events se
       JOIN events e ON se.event_id = e.id
       JOIN communities c ON e.community_id = c.id
       LEFT JOIN users u ON c.owner_id = u.id
       WHERE se.user_id = $1 AND e.deleted_at IS NULL AND c.deleted_at IS NULL
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
              ${SEATS_REMAINING},
              e.banner_image, e.topics, e.payment_type,
              e.age_limit, e.requires_documents, e.document_instructions,
              c.name as community_name
       FROM events e
       JOIN communities c ON e.community_id = c.id
       WHERE c.owner_id = $1 AND e.deleted_at IS NULL AND c.deleted_at IS NULL
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
      `SELECT e.*, ${SEATS_REMAINING},
              c.name as community_name, c.owner_id as community_owner_id,
              c.logo as community_logo, c.banner_image as community_banner,
              c.description as community_description, c.category as community_category,
              c.member_count as community_member_count,
              u.name as community_owner_name
       FROM events e
       JOIN communities c ON e.community_id = c.id
       LEFT JOIN users u ON c.owner_id = u.id
       WHERE e.id = $1 AND e.deleted_at IS NULL`,
      [eventId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const eventData = result.rows[0];
    // Attach custom registration questions
    eventData.questions = await getEventQuestions(eventId);
    res.json(eventData);
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
    agenda, requirements, instructions, questions,
    age_limit, requires_documents, document_instructions
  } = req.body;

  if (!community_id || !title || !description || !event_date) {
    return res.status(400).json({ error: 'community_id, title, description, and event_date are required' });
  }

  try {
    // Check that the user owns the community (or is admin)
    const community = await query('SELECT owner_id FROM communities WHERE id = $1 AND deleted_at IS NULL', [community_id]);
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
        agenda, requirements, instructions,
        age_limit, requires_documents, document_instructions, attendee_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, 0)
       RETURNING *`,
      [community_id, title, description, event_date, start_time || null, end_date || null, end_time || null,
       duration || null, location || null, event_type || 'physical', bannerImage,
       max_attendees || null, allow_guests || false, guest_limit || null,
       rsvp_deadline || null, payment_type || 'free', topics || null, hosts || null, speakers || null,
       agenda || null, requirements || null, instructions || null,
       age_limit || null, requires_documents === 'true' || requires_documents === true, document_instructions || null]
    );

    // Save custom registration questions (seat limit lives in max_attendees)
    await replaceEventQuestions(result.rows[0].id, questions);

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'event_created', `Created event: ${title} in community #${community_id}`]
    );

    const created = result.rows[0];
    created.questions = await getEventQuestions(created.id);
    created.seats_remaining = created.max_attendees != null
      ? Math.max(Number(created.max_attendees) - (created.attendee_count || 0), 0)
      : null;
    res.status(201).json(created);
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
    agenda, requirements, instructions, questions,
    age_limit, requires_documents, document_instructions
  } = req.body;

  try {
    // Check authorization (owner or admin)
    const event = await query(
      `SELECT e.id, e.banner_image, e.community_id FROM events e JOIN communities c ON e.community_id = c.id
       WHERE e.id = $1 AND e.deleted_at IS NULL AND (c.owner_id = $2 OR $3 = 'admin')`,
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
        max_attendees = CASE WHEN $11 = '' THEN NULL ELSE COALESCE($11::int, max_attendees) END,
        allow_guests = CASE WHEN $12 = '' THEN NULL ELSE COALESCE($12::boolean, allow_guests) END,
        guest_limit = CASE WHEN $13 = '' THEN NULL ELSE COALESCE($13::int, guest_limit) END,
        rsvp_deadline = COALESCE($14, rsvp_deadline),
        payment_type = COALESCE($15, payment_type),        topics = $16,
        hosts = COALESCE($17, hosts), speakers = COALESCE($18, speakers),
        agenda = COALESCE($19, agenda), requirements = COALESCE($20, requirements),
        instructions = COALESCE($21, instructions),
        age_limit = CASE WHEN $22 = '' THEN NULL ELSE COALESCE($22, age_limit) END,
        requires_documents = CASE WHEN $23 = '' THEN NULL ELSE COALESCE($23::boolean, requires_documents) END,
        document_instructions = CASE WHEN $24 = '' THEN NULL ELSE COALESCE($24, document_instructions) END
       WHERE id = $25 RETURNING *`,
      [title || null, description || null, event_date || null, start_time || null,
       end_date || null, end_time || null, duration || null, location || null,
       event_type || null, banner_image || null, max_attendees ?? null, allow_guests ?? null,
       guest_limit || null, rsvp_deadline || null, payment_type || null, topics || null,
       hosts || null, speakers || null, agenda || null, requirements || null, instructions || null,
       age_limit || null, requires_documents ?? null, document_instructions || null,
       eventId]
    );

    // Save custom registration questions — only when the organizer sent them
    // (so a seat-limit-only edit never wipes existing questions)
    if (questions !== undefined) {
      await replaceEventQuestions(eventId, questions);
    }

    const updated = result.rows[0];
    updated.questions = await getEventQuestions(eventId);
    updated.seats_remaining = updated.max_attendees != null
      ? Math.max(Number(updated.max_attendees) - (updated.attendee_count || 0), 0)
      : null;
    res.json(updated);
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
       WHERE e.id = $1 AND e.deleted_at IS NULL AND (c.owner_id = $2 OR $3 = 'admin')`,
      [eventId, req.userId, req.userRole]
    );
    if (event.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await query('UPDATE events SET deleted_at = NOW() WHERE id = $1', [eventId]);

    // Log activity
    const user = await query('SELECT name FROM users WHERE id = $1', [req.userId]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, user.rows[0]?.name || '', 'event_deleted', `Moved event to trash: ${event.rows[0].title}`]
    );

    res.json({ message: 'Event moved to trash.' });
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

// GET /api/events/:id/export - Download attendee list as XLSX (organizer/admin only)
router.get('/:id/export', authMiddleware, async (req: AuthRequest, res, next) => {
  const eventId = Number(req.params.id);
  try {
    // Only the community owner (organizer) or an admin can export
    const eventRes = await query(
      `SELECT e.id, e.title, c.owner_id
       FROM events e JOIN communities c ON e.community_id = c.id
       WHERE e.id = $1 AND e.deleted_at IS NULL AND c.deleted_at IS NULL`,
      [eventId]
    );
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (eventRes.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to export this event' });
    }

    const questions = await query(
      'SELECT id, question FROM event_questions WHERE event_id = $1 ORDER BY sort_order ASC, id ASC',
      [eventId]
    );
    const rsvpRes = await query(
      `SELECT r.status, r.full_name, r.phone, r.email, r.answers, r.created_at,
              r.document_url, r.document_name, r.document_status,
              u.name as user_name, u.email as user_email
       FROM rsvps r JOIN users u ON r.user_id = u.id
       WHERE r.event_id = $1
       ORDER BY r.created_at ASC`,
      [eventId]
    );

    const header = ['Name', 'Email', 'Phone', 'Status', 'RSVP Date', 'Verification Document', 'Document Status', ...questions.rows.map((q: any) => q.question)];
    const rows = rsvpRes.rows.map((r: any) => {
      const answers: Record<string, any> = r.answers || {};
      return [
        r.full_name || r.user_name || '',
        r.email || r.user_email || '',
        r.phone || '',
        r.status === 'attending' ? 'Attending' : 'Not attending',
        r.created_at ? new Date(r.created_at).toLocaleString() : '',
        r.document_url || '',
        r.document_status || 'Pending',
        ...questions.rows.map((q: any) => answers[String(q.id)] ?? answers[q.question] ?? ''),
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = header.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendees');

    // Second sheet: the community's member/follower list (organizer/manager only —
    // this whole route is gated to owner/admin above)
    const members = await query(
      `SELECT u.name, u.email, u.role, cm.joined_at
       FROM community_members cm JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = (SELECT community_id FROM events WHERE id = $1)
       ORDER BY cm.joined_at ASC`,
      [eventId]
    );
    const mHeader = ['Name', 'Email', 'Role', 'Joined Date'];
    const mRows = members.rows.map((m: any) => [
      m.name || '',
      m.email || '',
      m.role || 'member',
      m.joined_at ? new Date(m.joined_at).toLocaleString() : '',
    ]);
    const wsMembers = XLSX.utils.aoa_to_sheet([mHeader, ...mRows]);
    wsMembers['!cols'] = mHeader.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, wsMembers, 'Community Members');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `${eventRes.rows[0].title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_attendees.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

export default router;
