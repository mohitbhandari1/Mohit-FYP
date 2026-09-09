import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  sendEmail,
  rsvpConfirmationEmail,
  rsvpPendingApprovalEmail,
  rsvpApprovedEmail,
  rsvpRejectedEmail,
  rsvpDocumentPendingEmail,
  rsvpDocumentApprovedEmail,
  rsvpDocumentRejectedEmail,
  answerVerifiedEmail,
  answerRejectedEmail,
  communityJoinedEmail,
  communityLeftEmail,
  rsvpCancelledEmail,
  rsvpCancelledOrganizerEmail,
  newRegistrationEmail,
  newRegistrationRequestEmail,
} from '../email';
import { createNotification, createNotificationsForUsers } from '../notificationHelper';

const router = express.Router();

// ─── File Upload Setup for RSVP verification documents ───
const rsvpDocStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '../../uploads/rsvp-documents');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `rsvp-${uniqueSuffix}${ext}`);
  },
});

const uploadRsvpDocument = multer({
  storage: rsvpDocStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, and image files (JPG, PNG, GIF, WEBP) are allowed'));
    }
  },
});

// ─── RSVP Endpoints ───

// POST /api/engagement/rsvp - RSVP to an event (attending/not_attending)
// Accepts multipart/form-data so attendees can upload:
//   - `document`  → event-level verification document (when the organizer requires one)
//   - `answer_files` + `answer_file_questions` → file answers for "file"-type
//     registration questions (files and their question ids arrive in the same order)
// `answers` (text answers) is sent as a JSON string.
router.post('/rsvp', authMiddleware, uploadRsvpDocument.fields([
  { name: 'document', maxCount: 1 },
  { name: 'answer_files', maxCount: 20 },
]), async (req: AuthRequest, res, next) => {
  const { event_id, status, full_name, phone, email, answers } = req.body;
  if (!event_id) {
    return res.status(400).json({ error: 'event_id is required' });
  }

  const rsvpStatus = status || 'attending';
  if (!['attending', 'not_attending'].includes(rsvpStatus)) {
    return res.status(400).json({ error: 'Status must be "attending" or "not_attending"' });
  }

  // ─── 10-digit phone validation ───
  // Accepts optional +, then digits/spaces/dashes/parentheses — must reduce to
  // exactly 10 digits (local convention). Rejections list the offending field.
  if (phone !== undefined && phone !== null && String(phone).trim() !== '') {
    const digits = String(phone).replace(/\D/g, '');
    const local = digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
    if (local.length !== 10) {
      return res.status(400).json({
        error: 'Phone number must be exactly 10 digits',
        message: 'Please enter a valid 10-digit phone number (e.g. 9876543210).',
      });
    }
  }

  // `answers` arrives as a JSON string in multipart form data
  let parsedAnswers: Record<string, any> = {};
  if (typeof answers === 'string' && answers) {
    try {
      parsedAnswers = JSON.parse(answers);
    } catch {
      parsedAnswers = {};
    }
  } else if (answers && typeof answers === 'object' && !Array.isArray(answers)) {
    parsedAnswers = answers;
  }

  try {
    // Check if event exists (include seat capacity + document requirement)
    const eventCheck = await query(
      'SELECT id, community_id, title, max_attendees, attendee_count, requires_documents, require_approval FROM events WHERE id = $1 AND deleted_at IS NULL',
      [event_id]
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = eventCheck.rows[0];

    // Check previous RSVP status before upsert
    const prevRsvp = await query(
      'SELECT status, answers FROM rsvps WHERE user_id = $1 AND event_id = $2',
      [req.userId, event_id]
    );
    const prevStatus = prevRsvp.rows[0]?.status;

    // ─── One-time registration guard ───
    // A user can only register ONCE per event. While an active registration
    // exists (attending or pending), further "attending" attempts are rejected
    // with 409 so the UI can show the "Already registered" popup. Cancelling
    // (not_attending) is always allowed — the seat is released and re-registering
    // afterwards is a fresh registration.
    if (rsvpStatus === 'attending' && (prevStatus === 'attending' || prevStatus === 'pending')) {
      return res.status(409).json({
        error: 'Already registered for this event',
        message: prevStatus === 'pending'
          ? 'You already have a pending registration for this event. Please wait for organizer approval.'
          : 'You are already registered for this event. Check My Events for details.',
        already_registered: true,
        status: prevStatus,
      });
    }

    // ─── Validate answers for required registration questions ───
    // (Must run BEFORE claiming a seat — a rejected RSVP must not take a seat.)
    const questions = await query(
      'SELECT id, question, type, required FROM event_questions WHERE event_id = $1 ORDER BY sort_order ASC, id ASC',
      [event_id]
    );

    // ─── File answers for "file"-type registration questions ───
    // Pair each uploaded file with its question id (same order as multipart fields).
    const files = (req as any).files || {};
    const answerFiles: Express.Multer.File[] = files['answer_files'] || [];
    const rawFileQuestionIds = req.body.answer_file_questions;
    const fileQuestionIds: string[] = Array.isArray(rawFileQuestionIds)
      ? rawFileQuestionIds.map(String)
      : typeof rawFileQuestionIds === 'string' && rawFileQuestionIds
        ? [rawFileQuestionIds]
        : [];

    const answerMap: Record<string, any> = { ...parsedAnswers };
    for (let i = 0; i < answerFiles.length; i++) {
      const file = answerFiles[i];
      const qid = fileQuestionIds[i];
      if (!qid) continue;
      const question = questions.rows.find((row: any) => String(row.id) === String(qid));
      // File-type questions: validate against file_accept setting
      if (question && question.type === 'file') {
        const accept = question.file_accept || 'both';
        if (accept === 'images' && !file.mimetype.startsWith('image/')) {
          return res.status(400).json({
            error: `"${question.question}" requires an image file`,
            message: `Please upload an image (JPG, PNG) for: ${question.question}`,
          });
        }
        if (accept === 'documents' && file.mimetype.startsWith('image/')) {
          return res.status(400).json({
            error: `"${question.question}" requires a document file`,
            message: `Please upload a document (PDF, DOC) for: ${question.question}`,
          });
        }
      }
      answerMap[String(qid)] = '/uploads/rsvp-documents/' + file.filename;
      answerMap[String(qid) + '_name'] = file.originalname;
    }

    for (const q of questions.rows) {
      // Required-question validation only applies when REGISTERING (attending).
      // When the user is cancelling (not_attending), we must never block the
      // cancellation just because answers are missing — this is what broke the
      // "Not Attending" button on events that had a required "Name" question.
      if (q.required && rsvpStatus === 'attending') {
        const value = answerMap[String(q.id)] ?? '';
        if (typeof value !== 'string' || !value.trim()) {
          return res.status(400).json({
            error: `"${q.question}" is required`,
            message: `Please answer the required question: ${q.question}`,
          });
        }
      }
    }

    // ─── Event-level verification document (required by organizer) ───
    // Must run BEFORE claiming a seat — a rejected RSVP must not take a seat.
    let documentUrl: string | null = null;
    let documentName: string | null = null;
    if (rsvpStatus === 'attending' && event.requires_documents) {
      if (!files['document']?.[0]) {
        return res.status(400).json({
          error: 'A verification document is required for this event',
          message: 'Please upload the required verification document to confirm your seat.',
        });
      }
      documentUrl = '/uploads/rsvp-documents/' + files['document'][0].filename;
      documentName = files['document'][0].originalname;
    }

    // ─── When require_approval is on, RSVP goes to 'pending' (no seat claimed yet) ───
    const effectiveStatus = (event.require_approval && rsvpStatus === 'attending') ? 'pending' : rsvpStatus;

    // ─── Seat limit / capacity check (atomic — prevents oversubscription) ───
    if (effectiveStatus === 'attending' && prevStatus !== 'attending') {
      const claim = await query(
        `UPDATE events SET attendee_count = attendee_count + 1
         WHERE id = $1 AND (max_attendees IS NULL OR attendee_count < max_attendees)`,
        [event_id]
      );
      if (claim.rowCount === 0) {
        return res.status(400).json({
          error: 'This event is full',
          message: `Sorry, all ${event.max_attendees} seats are taken. Stay connected for future events — new events from this community will appear soon!`,
        });
      }
    }
    // Only keep answers for questions that actually exist on this event.
    // File answers store the uploaded file URL (+ original name for display).
    // Stored only when attending — switching to not_attending never wipes prior answers.
    const answersJson = rsvpStatus === 'attending' && questions.rows.length > 0
      ? JSON.stringify(Object.fromEntries(
          questions.rows.flatMap((q: any) => {
            if ((q.type === 'file' || q.type === 'image') && answerMap[String(q.id)]) {
              return [
                [String(q.id), answerMap[String(q.id)]],
                [String(q.id) + '_name', answerMap[String(q.id) + '_name'] ?? ''],
              ];
            }
            return [[String(q.id), answerMap[String(q.id)] ?? '']];
          })
        ))
      : null;

    const result = await query(
      `INSERT INTO rsvps (user_id, event_id, status, full_name, phone, email, answers, document_url, document_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, event_id)
       DO UPDATE SET status = $3, full_name = COALESCE($4, rsvps.full_name), phone = COALESCE($5, rsvps.phone), email = COALESCE($6, rsvps.email),
         answers = CASE WHEN $7::jsonb IS NULL THEN rsvps.answers ELSE $7::jsonb END,
         document_url = COALESCE($8, rsvps.document_url), document_name = COALESCE($9, rsvps.document_name)
       RETURNING id, user_id, event_id, status`,
      [req.userId, event_id, effectiveStatus, full_name || null, phone || null, email || null, answersJson,
       documentUrl, documentName]
    );

    // Update attendee_count based on status change.
    // (The +1 for attending was already claimed atomically above.)
    const newStatus = result.rows[0]?.status;
    if (prevStatus !== newStatus) {
      if (newStatus === 'attending') {
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

    // ─── Send RSVP email notifications ───
    if (newStatus !== prevStatus) {
      const userName = user.rows[0]?.name || 'User';
      const userEmail = req.body.email || '';
      const eventTitle = eventCheck.rows[0].title;
      const communityId = eventCheck.rows[0].community_id;

      // Get event details and community name
      const [eventDetails, communityDetails] = await Promise.all([
        query('SELECT event_date, location FROM events WHERE id = $1', [event_id]),
        query('SELECT name, logo FROM communities WHERE id = $1', [communityId]),
      ]);
      const eventDate = eventDetails.rows[0]?.event_date
        ? new Date(eventDetails.rows[0].event_date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })
        : 'TBA';
      const eventLocation = eventDetails.rows[0]?.location || 'TBA';
      const communityName = communityDetails.rows[0]?.name || 'Community';

      // Get user email if not in body
      let recipientEmail = userEmail;
      if (!recipientEmail) {
        const emailResult = await query('SELECT email FROM users WHERE id = $1', [req.userId]);
        recipientEmail = emailResult.rows[0]?.email || '';
      }

      if (recipientEmail) {
        if (newStatus === 'pending') {
          // Approval required — send "application under review" email
          const emailContent = rsvpPendingApprovalEmail(userName, eventTitle, communityName);
          sendEmail(recipientEmail, emailContent.subject, emailContent.html).catch((err) =>
            console.error('Failed to send RSVP pending approval email:', err)
          );
          // In-app notification
          if (req.userId) createNotification(
            req.userId, 'rsvp_pending',
            `Application Submitted: ${eventTitle}`,
            `Your registration for ${eventTitle} is under review by the organizer.`,
            `/events/${event_id}`,
            communityDetails.rows[0]?.logo || null
          ).catch(() => {});
        } else if (newStatus === 'attending' && prevStatus !== 'attending') {
          if (event.requires_documents) {
            // Event requires documents — send "document pending" email
            const emailContent = rsvpDocumentPendingEmail(userName, eventTitle, communityName);
            sendEmail(recipientEmail, emailContent.subject, emailContent.html).catch((err) =>
              console.error('Failed to send document pending email:', err)
            );
          } else {
            // No documents required — send direct confirmation email
            const emailContent = rsvpConfirmationEmail(userName, eventTitle, eventDate, eventLocation, communityName);
            sendEmail(recipientEmail, emailContent.subject, emailContent.html).catch((err) =>
              console.error('Failed to send RSVP confirmation email:', err)
            );
            // In-app notification
            if (req.userId) createNotification(
              req.userId, 'rsvp_confirmed',
              `You're Attending: ${eventTitle}`,
              `Your registration for ${eventTitle} is confirmed. See you there!`,
              `/events/${event_id}`,
              communityDetails.rows[0]?.logo || null
            ).catch(() => {});
          }
        }
      }

      // ─── New registration: notify the ORGANIZER (both direct & pending) ───
      // Fires only when a NEW registration lands (prevStatus was empty or a
      // re-registration after cancellation) — never on duplicate attempts,
      // which are blocked by the one-time registration guard above.
      if (
        (newStatus === 'attending' || newStatus === 'pending') &&
        (prevStatus === undefined || prevStatus === null || prevStatus === 'not_attending' || prevStatus === 'rejected')
      ) {
        const [regEventDetails, regCommunityDetails] = await Promise.all([
          query('SELECT event_date FROM events WHERE id = $1', [event_id]),
          query('SELECT name, logo, owner_id FROM communities WHERE id = $1', [communityId]),
        ]);
        const regEventDate = regEventDetails.rows[0]?.event_date
          ? new Date(regEventDetails.rows[0].event_date).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })
          : 'TBA';
        const regCommunityName = regCommunityDetails.rows[0]?.name || 'Community';
        const regCommunityLogo = regCommunityDetails.rows[0]?.logo || null;
        const regOwnerId = regCommunityDetails.rows[0]?.owner_id;

        if (regOwnerId) {
          const isPending = newStatus === 'pending';
          const seatsRemaining = event.max_attendees != null ? Math.max(event.max_attendees - event.attendee_count, 0) : null;
          const organizerRes = await query('SELECT name, email FROM users WHERE id = $1', [regOwnerId]);
          const organizer = organizerRes.rows[0];
          const organizerName = organizer?.name || 'Organizer';
          const orgEmail = isPending
            ? newRegistrationRequestEmail(organizerName, userName, eventTitle, regEventDate, regCommunityName, seatsRemaining)
            : newRegistrationEmail(organizerName, userName, eventTitle, regEventDate, regCommunityName, seatsRemaining);
          // Skip self-notification when the organizer registers for their own event
          if (organizer && organizer.email && regOwnerId !== req.userId) {
            sendEmail(organizer.email, orgEmail.subject, orgEmail.html).catch((err) =>
              console.error('Failed to send organizer registration email:', err)
            );
            // In-app notification to the organizer
            createNotification(
              regOwnerId, 'new_attendee',
              isPending ? `New Registration Request: ${eventTitle}` : `New Registration: ${eventTitle}`,
              isPending
                ? `${userName} requested to join ${eventTitle} (${regEventDate}). Approve or reject from the event page.`
                : `${userName} registered for ${eventTitle} (${regEventDate}).`,
              `/events/${event_id}`,
              regCommunityLogo
            ).catch(() => {});
          }
        }
      }

      // ─── Cancellation: user switched to not_attending (was attending or pending) ───
      if (newStatus === 'not_attending' && (prevStatus === 'attending' || prevStatus === 'pending')) {
        const [eventDetails, communityDetails] = await Promise.all([
          query('SELECT event_date, location FROM events WHERE id = $1', [event_id]),
          query('SELECT name, logo, owner_id FROM communities WHERE id = $1', [communityId]),
        ]);
        const eventDate = eventDetails.rows[0]?.event_date
          ? new Date(eventDetails.rows[0].event_date).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })
          : 'TBA';
        const communityName = communityDetails.rows[0]?.name || 'Community';
        const communityLogo = communityDetails.rows[0]?.logo || null;
        const ownerId = communityDetails.rows[0]?.owner_id;

        // 1) Email to the attendee (cancellation confirmation)
        if (recipientEmail) {
          const emailContent = rsvpCancelledEmail(userName, eventTitle, eventDate, communityName);
          sendEmail(recipientEmail, emailContent.subject, emailContent.html).catch((err) =>
            console.error('Failed to send RSVP cancelled email:', err)
          );
        }
        // In-app notification to the attendee
        if (req.userId) createNotification(
          req.userId, 'rsvp_cancelled',
          `Registration Cancelled: ${eventTitle}`,
          `Your registration for ${eventTitle} on ${eventDate} has been cancelled.`,
          `/events/${event_id}`,
          communityLogo
        ).catch(() => {});

        // 2) Email to the organizer (owner)
        if (ownerId) {
          const organizerRes = await query('SELECT name, email FROM users WHERE id = $1', [ownerId]);
          const organizer = organizerRes.rows[0];
          if (organizer && organizer.email) {
            const orgEmail = rsvpCancelledOrganizerEmail(organizer.name || 'Organizer', userName, eventTitle, eventDate, communityName);
            sendEmail(organizer.email, orgEmail.subject, orgEmail.html).catch((err) =>
              console.error('Failed to send organizer cancellation email:', err)
            );
            // In-app notification to the organizer
            createNotification(
              ownerId, 'rsvp_cancelled',
              `Cancellation: ${eventTitle}`,
              `${userName} has cancelled their registration for ${eventTitle} (${eventDate}).`,
              `/events/${event_id}`,
              communityLogo
            ).catch(() => {});
          }
        }
      }
    }

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
      'SELECT status, document_url FROM rsvps WHERE user_id = $1 AND event_id = $2',
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

    // Remove the uploaded verification document from disk
    if (prevRsvp.rows[0].document_url) {
      const docPath = path.join(__dirname, '../..', prevRsvp.rows[0].document_url);
      if (fs.existsSync(docPath)) {
        try { fs.unlinkSync(docPath); } catch { /* best-effort cleanup */ }
      }
    }

    res.json({ message: 'RSVP cancelled' });
  } catch (error) {
    next(error);
  }
});

// GET /api/engagement/rsvp/requests/summary - Per-event pending registration request counts
// (organizer/admin only). Returns ONLY event-level counts — never applicant personal
// details, which stay hidden until the organizer opens the event details page.
// "unread" is derived from the organizer's existing unread 'new_attendee'
// notification(s) linking to that event — no schema changes, nothing stored.
router.get('/rsvp/requests/summary', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    // Events owned by the current organizer (or, for admins, all events)
    const eventsRes = await query(
      `SELECT e.id, e.title, e.event_date, e.attendee_count, e.max_attendees,
              c.name AS community_name
       FROM events e
       JOIN communities c ON e.community_id = c.id
       WHERE e.deleted_at IS NULL AND c.deleted_at IS NULL
         AND (c.owner_id = $1 OR $2::text = 'admin')
       ORDER BY e.event_date ASC`,
      [req.userId, req.userRole || '']
    );
    const events = eventsRes.rows;
    if (events.length === 0) { res.json([]); return; }

    const eventIds = events.map((e: any) => e.id);

    // Pending request counts per event
    const pendingRes = await query(
      `SELECT event_id, COUNT(*)::int AS pending_count
       FROM rsvps
       WHERE event_id = ANY($1::int[]) AND status = 'pending'
       GROUP BY event_id`,
      [eventIds]
    );
    const pendingByEvent = new Map<number, number>(
      pendingRes.rows.map((r: any) => [r.event_id, r.pending_count])
    );

    // Unread = pending requests whose 'new_attendee' notification for this
    // organizer is still unread. Purely derived — nothing is written here.
    const unreadRes = await query(
      `SELECT
         (regexp_match(n.link, '^/events/([0-9]+)'))[1]::int AS event_id,
         COUNT(*)::int AS unread_count
       FROM notifications n
       WHERE n.user_id = $1 AND n.type = 'new_attendee' AND n.is_read = FALSE
         AND n.link LIKE '/events/%'
       GROUP BY 1`,
      [req.userId]
    );
    const unreadByEvent = new Map<number, number>(
      unreadRes.rows
        .filter((r: any) => r.event_id != null)
        .map((r: any) => [r.event_id, r.unread_count])
    );

    res.json(
      events
        .map((e: any) => {
          const pending = pendingByEvent.get(e.id) || 0;
          const unread = Math.min(unreadByEvent.get(e.id) || 0, pending);
          return {
            event_id: e.id,
            event_title: e.title,
            event_date: e.event_date,
            community_name: e.community_name,
            attendee_count: e.attendee_count,
            max_attendees: e.max_attendees,
            pending_count: pending,
            unread_count: unread,
            viewed: pending > 0 && unread === 0,
          };
        })
        .filter((e: any) => e.pending_count > 0)
    );
  } catch (error) {
    next(error);
  }
});

// POST /api/engagement/rsvp/requests/view - Mark an event's registration requests
// as viewed by the organizer (called when they open the event details page).
// Marks the organizer's unread 'new_attendee' notifications for that event as read.
router.post('/rsvp/requests/view', authMiddleware, async (req: AuthRequest, res, next) => {
  const eventId = Number(req.body?.event_id);
  if (!eventId) {
    return res.status(400).json({ error: 'event_id is required' });
  }
  try {
    // Only the community owner (organizer) or an admin may mark these viewed
    const eventCheck = await query(
      `SELECT c.owner_id FROM events e JOIN communities c ON e.community_id = c.id
       WHERE e.id = $1 AND e.deleted_at IS NULL AND c.deleted_at IS NULL`,
      [eventId]
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (eventCheck.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await query(
      `UPDATE notifications SET is_read = TRUE
       WHERE user_id = $1 AND type = 'new_attendee' AND is_read = FALSE
         AND link = $2`,
      [req.userId, `/events/${eventId}`]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/engagement/rsvp/approve-reject - Approve or reject a pending RSVP (organizer/admin only)
router.patch('/rsvp/approve-reject', authMiddleware, async (req: AuthRequest, res, next) => {
  const { event_id, user_id, action } = req.body; // action: 'approve' | 'reject'
  if (!event_id || !user_id || !action) {
    return res.status(400).json({ error: 'event_id, user_id, and action (approve/reject) are required' });
  }
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action must be "approve" or "reject"' });
  }

  try {
    // Only the community owner (organizer) or an admin can approve/reject RSVPs
    const eventCheck = await query(
      `SELECT e.id, e.title, e.event_date, e.location, e.max_attendees, e.attendee_count, e.require_approval, c.owner_id, c.name AS community_name, c.logo AS community_logo
       FROM events e JOIN communities c ON e.community_id = c.id
       WHERE e.id = $1 AND e.deleted_at IS NULL AND c.deleted_at IS NULL`,
      [event_id]
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (eventCheck.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to approve/reject RSVPs' });
    }

    const event = eventCheck.rows[0];

    // Check the current RSVP
    const rsvpCheck = await query(
      'SELECT id, status, full_name FROM rsvps WHERE event_id = $1 AND user_id = $2',
      [event_id, user_id]
    );
    if (rsvpCheck.rows.length === 0) {
      return res.status(404).json({ error: 'RSVP not found' });
    }
    if (rsvpCheck.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Only pending RSVPs can be approved or rejected' });
    }

    const newStatus = action === 'approve' ? 'attending' : 'rejected';

    if (action === 'approve') {
      // Check seat capacity before approving
      if (event.max_attendees != null && event.attendee_count >= event.max_attendees) {
        return res.status(400).json({ error: 'Cannot approve — event is full' });
      }
      // Claim a seat
      await query(
        'UPDATE events SET attendee_count = attendee_count + 1 WHERE id = $1',
        [event_id]
      );
    }

    // Update RSVP status
    await query(
      'UPDATE rsvps SET status = $1 WHERE event_id = $2 AND user_id = $3',
      [newStatus, event_id, user_id]
    );

    // Log activity
    const [adminUser] = await Promise.all([
      query('SELECT name FROM users WHERE id = $1', [req.userId]),
    ]);
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, adminUser.rows[0]?.name || '', `rsvp_${action}d`, `${action === 'approve' ? 'Approved' : 'Rejected'} RSVP for ${event.title}`]
    );

    // ─── Send email + in-app notification to the attendee ───
    const [userRes] = await Promise.all([
      query('SELECT name, email FROM users WHERE id = $1', [user_id]),
    ]);
    const userName = userRes.rows[0]?.name || 'User';
    const userEmail = userRes.rows[0]?.email || '';
    const eventTitle = event.title;
    const communityName = event.community_name;
    const eventDate = event.event_date
      ? new Date(event.event_date).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
      : 'TBA';
    const eventLocation = event.location || 'TBA';

    if (userEmail) {
      if (action === 'approve') {
        const emailContent = rsvpApprovedEmail(userName, eventTitle, eventDate, eventLocation, communityName);
        sendEmail(userEmail, emailContent.subject, emailContent.html).catch((err) =>
          console.error('Failed to send RSVP approved email:', err)
        );
        createNotification(
          user_id, 'rsvp_approved',
          `Registration Confirmed: ${eventTitle}`,
          `Your registration for ${eventTitle} has been approved. Welcome!`,
          `/events/${event_id}`,
          event.community_logo || null
        ).catch(() => {});
      } else {
        const emailContent = rsvpRejectedEmail(userName, eventTitle, communityName);
        sendEmail(userEmail, emailContent.subject, emailContent.html).catch((err) =>
          console.error('Failed to send RSVP rejected email:', err)
        );
        createNotification(
          user_id, 'rsvp_rejected',
          `Registration Update: ${eventTitle}`,
          `Your registration for ${eventTitle} was not approved at this time.`,
          `/events/${event_id}`,
          event.community_logo || null
        ).catch(() => {});
      }
    }

    res.json({ status: newStatus, message: `RSVP ${action === 'approve' ? 'approved' : 'rejected'} successfully` });
  } catch (error) {
    next(error);
  }
});

// GET /api/engagement/rsvp/event/:eventId - Get RSVPs for an event (organizer/admin only)
router.get('/rsvp/event/:eventId', authMiddleware, async (req: AuthRequest, res, next) => {
  const eventId = Number(req.params.eventId);
  try {
    // Only the community owner (organizer) or an admin can view contact details
    const eventCheck = await query(
      `SELECT e.id, c.owner_id FROM events e JOIN communities c ON e.community_id = c.id
       WHERE e.id = $1 AND e.deleted_at IS NULL AND c.deleted_at IS NULL`,
      [eventId]
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (eventCheck.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view RSVPs' });
    }

    const result = await query(
      `SELECT r.user_id, r.status, r.full_name, r.phone, r.email, r.answers, r.created_at,
              r.document_url, r.document_name, r.document_status, r.document_reviewed_at,
              u.name, u.avatar_url
       FROM rsvps r JOIN users u ON r.user_id = u.id
       WHERE r.event_id = $1 AND r.status != 'not_attending'
       ORDER BY r.created_at DESC`,
      [eventId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/engagement/rsvp/document-status - Mark an attendee's verification
// document as verified/rejected (or reset to pending). Organizer/admin only.
router.patch('/rsvp/document-status', authMiddleware, async (req: AuthRequest, res, next) => {
  const { event_id, user_id, status } = req.body;
  if (!event_id || !user_id) {
    return res.status(400).json({ error: 'event_id and user_id are required' });
  }
  const docStatus = status || null;
  if (docStatus !== null && !['verified', 'rejected'].includes(docStatus)) {
    return res.status(400).json({ error: 'Status must be "verified", "rejected", or empty to reset' });
  }

  try {
    // Only the community owner (organizer) or an admin can review documents
    const eventCheck = await query(
      `SELECT e.id, c.owner_id FROM events e JOIN communities c ON e.community_id = c.id
       WHERE e.id = $1 AND e.deleted_at IS NULL AND c.deleted_at IS NULL`,
      [event_id]
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (eventCheck.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to review documents' });
    }

    const result = await query(
      `UPDATE rsvps
       SET document_status = $1, document_reviewed_at = NOW()
       WHERE event_id = $2 AND user_id = $3
       RETURNING user_id, document_status, document_reviewed_at`,
      [docStatus, event_id, user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'RSVP not found' });
    }

    // ─── Send document status email notification ───
    if (docStatus && (docStatus === 'verified' || docStatus === 'rejected')) {
      // Get user info, event info, and community name
      const [userRes, eventRes, communityRes] = await Promise.all([
        query('SELECT name, email FROM users WHERE id = $1', [user_id]),
        query('SELECT title, event_date, location FROM events WHERE id = $1', [event_id]),
        query(`SELECT c.name, c.logo FROM communities c JOIN events e ON e.community_id = c.id WHERE e.id = $1`, [event_id]),
      ]);

      const userName = userRes.rows[0]?.name || 'User';
      const userEmail = userRes.rows[0]?.email || '';
      const eventTitle = eventRes.rows[0]?.title || 'Event';
      const eventDate = eventRes.rows[0]?.event_date
        ? new Date(eventRes.rows[0].event_date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })
        : 'TBA';
      const eventLocation = eventRes.rows[0]?.location || 'TBA';
      const communityName = communityRes.rows[0]?.name || 'Community';

      if (userEmail) {
        if (docStatus === 'verified') {
          const emailContent = rsvpDocumentApprovedEmail(userName, eventTitle, eventDate, eventLocation, communityName);
          sendEmail(userEmail, emailContent.subject, emailContent.html).catch((err) =>
            console.error('Failed to send document approved email:', err)
          );
          // Create in-app notification (respects preferences)
          const docApprovedCommunityLogo = communityRes.rows[0]?.logo || null;
          createNotification(
            user_id, 'document_approved',
            `Document Approved: ${eventTitle}`,
            `Your document has been approved. You are now confirmed for ${eventTitle}!`,
            `/events/${event_id}`,
            docApprovedCommunityLogo
          ).catch((err) => console.error('Failed to create document approved notification:', err));
        } else if (docStatus === 'rejected') {
          const emailContent = rsvpDocumentRejectedEmail(userName, eventTitle, communityName);
          sendEmail(userEmail, emailContent.subject, emailContent.html).catch((err) =>
            console.error('Failed to send document rejected email:', err)
          );
          // Create in-app notification (respects preferences)
          const docRejectedCommunityLogo = communityRes.rows[0]?.logo || null;
          createNotification(
            user_id, 'document_rejected',
            `Document Update Needed: ${eventTitle}`,
            `Your document needs updating. Please re-submit for ${eventTitle}.`,
            `/events/${event_id}`,
            docRejectedCommunityLogo
          ).catch((err) => console.error('Failed to create document rejected notification:', err));
        }
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/engagement/rsvp/answer-status - Mark a file/image answer to a
// registration question as verified/rejected (or reset to pending). Organizer/admin only.
// The status is stored in the rsvp's answers JSONB as `<questionId>_status`.
router.patch('/rsvp/answer-status', authMiddleware, async (req: AuthRequest, res, next) => {
  const { event_id, user_id, question_id, status } = req.body;
  if (!event_id || !user_id || !question_id) {
    return res.status(400).json({ error: 'event_id, user_id, and question_id are required' });
  }
  const answerStatus = status || null;
  if (answerStatus !== null && !['verified', 'rejected'].includes(answerStatus)) {
    return res.status(400).json({ error: 'Status must be "verified", "rejected", or empty to reset' });
  }

  try {
    // Only the community owner (organizer) or an admin can review answers
    const eventCheck = await query(
      `SELECT e.id, c.owner_id FROM events e JOIN communities c ON e.community_id = c.id
       WHERE e.id = $1 AND e.deleted_at IS NULL AND c.deleted_at IS NULL`,
      [event_id]
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (eventCheck.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to review answers' });
    }

    const existing = await query(
      'SELECT answers FROM rsvps WHERE event_id = $1 AND user_id = $2',
      [event_id, user_id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'RSVP not found' });
    }

    const answers = existing.rows[0].answers || {};
    const statusKey = `${question_id}_status`;
    if (answerStatus) {
      answers[statusKey] = answerStatus;
    } else {
      delete answers[statusKey];
    }

    await query(
      'UPDATE rsvps SET answers = $1 WHERE event_id = $2 AND user_id = $3',
      [JSON.stringify(answers), event_id, user_id]
    );

    // ─── Send answer status email notification ───
    if (answerStatus && (answerStatus === 'verified' || answerStatus === 'rejected')) {
      const [userRes, eventRes, communityRes, questionRes] = await Promise.all([
        query('SELECT name, email FROM users WHERE id = $1', [user_id]),
        query('SELECT title FROM events WHERE id = $1', [event_id]),
        query(`SELECT c.name, c.logo FROM communities c JOIN events e ON e.community_id = c.id WHERE e.id = $1`, [event_id]),
        query('SELECT question FROM event_questions WHERE id = $1', [question_id]),
      ]);

      const userName = userRes.rows[0]?.name || 'User';
      const userEmail = userRes.rows[0]?.email || '';
      const eventTitle = eventRes.rows[0]?.title || 'Event';
      const communityName = communityRes.rows[0]?.name || 'Community';
      const questionText = questionRes.rows[0]?.question || 'Registration question';

      if (userEmail) {
        if (answerStatus === 'verified') {
          const emailContent = answerVerifiedEmail(userName, eventTitle, questionText, communityName);
          sendEmail(userEmail, emailContent.subject, emailContent.html).catch((err) =>
            console.error('Failed to send answer verified email:', err)
          );
          // Create in-app notification (respects preferences)
          const answerApprovedCommunityLogo = communityRes.rows[0]?.logo || null;
          createNotification(
            user_id, 'answer_approved',
            `Answer Approved: ${eventTitle}`,
            `Your answer to "${questionText}" has been approved.`,
            `/events/${event_id}`,
            answerApprovedCommunityLogo
          ).catch((err) => console.error('Failed to create answer approved notification:', err));
        } else if (answerStatus === 'rejected') {
          const emailContent = answerRejectedEmail(userName, eventTitle, questionText, communityName);
          sendEmail(userEmail, emailContent.subject, emailContent.html).catch((err) =>
            console.error('Failed to send answer rejected email:', err)
          );
          // Create in-app notification (respects preferences)
          const answerRejectedCommunityLogo = communityRes.rows[0]?.logo || null;
          createNotification(
            user_id, 'answer_rejected',
            `Answer Update Needed: ${eventTitle}`,
            `Your answer to "${questionText}" needs updating. Please review and re-submit.`,
            `/events/${event_id}`,
            answerRejectedCommunityLogo
          ).catch((err) => console.error('Failed to create answer rejected notification:', err));
        }
      }
    }

    res.json({ user_id, question_id, status: answerStatus, answers });
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

    // Reviewer info is attached to the response so the UI can show name + avatar immediately
    const user = await query('SELECT name, avatar_url FROM users WHERE id = $1', [req.userId]);
    const reviewer = {
      user_name: user.rows[0]?.name || '',
      avatar_url: user.rows[0]?.avatar_url || null,
    };

    if (existing.rows.length > 0) {
      // Update existing review
      const result = await query(
        'UPDATE reviews SET rating = $1, comment = $2 WHERE id = $3 RETURNING id, rating, comment, created_at',
        [rating, comment || null, existing.rows[0].id]
      );
      return res.json({ ...result.rows[0], ...reviewer });
    }

    const result = await query(
      'INSERT INTO reviews (user_id, community_id, event_id, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING id, rating, comment, created_at',
      [req.userId, community_id || null, event_id || null, rating, comment || null]
    );

    // Log activity
    const target = community_id ? `community #${community_id}` : `event #${event_id}`;
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, reviewer.user_name, 'review_created', `Left a ${rating}-star review on ${target}`]
    );

    res.status(201).json({ ...result.rows[0], ...reviewer });
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
    const community = await query('SELECT id, name FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
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

    // Send welcome email (non-blocking)
    const memberEmail = await query('SELECT email FROM users WHERE id = $1', [req.userId]);
    if (memberEmail.rows.length > 0) {
      const emailContent = communityJoinedEmail(user.rows[0]?.name || 'Member', community.rows[0].name);
      sendEmail(memberEmail.rows[0].email, emailContent.subject, emailContent.html).catch((err) =>
        console.error('Failed to send community joined email:', err)
      );
    }

    // Create in-app notification (non-blocking, respects user preferences)
    if (req.userId) createNotification(
      req.userId, 'community_joined',
      `Welcome to ${community.rows[0].name}!`,
      `You've successfully joined ${community.rows[0].name}.`,
      `/communities/${communityId}`
    ).catch(() => {});

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
    const community = await query('SELECT id, name, owner_id FROM communities WHERE id = $1 AND deleted_at IS NULL', [communityId]);
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

    // Get user info before deleting
    const leaveUser = await query('SELECT name, email FROM users WHERE id = $1', [req.userId]);

    await query('DELETE FROM community_members WHERE user_id = $1 AND community_id = $2', [
      req.userId,
      communityId,
    ]);
    // Decrement member_count
    await query('UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1', [communityId]);

    // Log activity
    await query(
      'INSERT INTO activity_log (user_id, user_name, action, description) VALUES ($1, $2, $3, $4)',
      [req.userId, leaveUser.rows[0]?.name || '', 'community_leave', `Left community: ${community.rows[0].name}`]
    );

    // Send leave email (non-blocking)
    if (leaveUser.rows.length > 0) {
      const emailContent = communityLeftEmail(leaveUser.rows[0].name || 'Member', community.rows[0].name);
      sendEmail(leaveUser.rows[0].email, emailContent.subject, emailContent.html).catch((err) =>
        console.error('Failed to send community left email:', err)
      );
    }

    res.json({ message: 'Left community', left: true });
  } catch (error) {
    next(error);
  }
});

// GET /api/engagement/community/members/:communityId - Get community members list (organizer/manager only)
router.get('/community/members/:communityId', authMiddleware, async (req: AuthRequest, res, next) => {
  const communityId = Number(req.params.communityId);
  try {
    const community = await query(
      'SELECT owner_id FROM communities WHERE id = $1 AND deleted_at IS NULL',
      [communityId]
    );
    if (community.rows.length === 0) {
      return res.status(404).json({ error: 'Community not found' });
    }
    if (community.rows[0].owner_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Only the community organizer/manager can view the member list' });
    }

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
      'SELECT member_count FROM communities WHERE id = $1 AND deleted_at IS NULL',
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
      'SELECT attendee_count FROM events WHERE id = $1 AND deleted_at IS NULL',
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
