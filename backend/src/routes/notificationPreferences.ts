import express from 'express';
import { query } from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Default preferences
const DEFAULT_PREFS = {
  new_event: true,
  announcement: true,
  document_approved: true,
  document_rejected: true,
  answer_approved: true,
  answer_rejected: true,
};

// GET /api/notification-preferences - Get current user's notification preferences
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    let result = await query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [req.userId]
    );

    // Create default preferences if none exist
    if (result.rows.length === 0) {
      await query(
        `INSERT INTO notification_preferences (user_id, new_event, announcement, document_approved, document_rejected, answer_approved, answer_rejected)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.userId, true, true, true, true, true, true]
      );
      result = await query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [req.userId]
      );
    }

    const prefs = result.rows[0];
    res.json({
      new_event: prefs.new_event,
      announcement: prefs.announcement,
      document_approved: prefs.document_approved,
      document_rejected: prefs.document_rejected,
      answer_approved: prefs.answer_approved,
      answer_rejected: prefs.answer_rejected,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notification-preferences - Update notification preferences
router.put('/', authMiddleware, async (req: AuthRequest, res, next) => {
  const { new_event, announcement, document_approved, document_rejected, answer_approved, answer_rejected } = req.body;

  try {
    // Upsert preferences
    await query(
      `INSERT INTO notification_preferences (user_id, new_event, announcement, document_approved, document_rejected, answer_approved, answer_rejected, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         new_event = COALESCE($2, notification_preferences.new_event),
         announcement = COALESCE($3, notification_preferences.announcement),
         document_approved = COALESCE($4, notification_preferences.document_approved),
         document_rejected = COALESCE($5, notification_preferences.document_rejected),
         answer_approved = COALESCE($6, notification_preferences.answer_approved),
         answer_rejected = COALESCE($7, notification_preferences.answer_rejected),
         updated_at = NOW()`,
      [
        req.userId,
        new_event ?? true,
        announcement ?? true,
        document_approved ?? true,
        document_rejected ?? true,
        answer_approved ?? true,
        answer_rejected ?? true,
      ]
    );

    // Return updated preferences
    const result = await query(
      'SELECT new_event, announcement, document_approved, document_rejected, answer_approved, answer_rejected FROM notification_preferences WHERE user_id = $1',
      [req.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
