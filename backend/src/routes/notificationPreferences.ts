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
  community_joined: true,
  rsvp_pending: true,
  rsvp_confirmed: true,
  rsvp_approved: true,
  rsvp_rejected: true,
  membership_approved: true,
  membership_rejected: true,
};

const PREF_KEYS = Object.keys(DEFAULT_PREFS) as (keyof typeof DEFAULT_PREFS)[];

// GET /api/notification-preferences - Get current user's notification preferences
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    let result = await query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [req.userId]
    );

    // Create default preferences if none exist
    if (result.rows.length === 0) {
      const cols = PREF_KEYS.join(', ');
      const placeholders = PREF_KEYS.map((_, i) => `$${i + 2}`).join(', ');
      await query(
        `INSERT INTO notification_preferences (user_id, ${cols}) VALUES ($1, ${placeholders})`,
        [req.userId, ...PREF_KEYS.map(() => true)]
      );
      result = await query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [req.userId]
      );
    }

    const prefs = result.rows[0];
    const response: Record<string, boolean> = {};
    for (const key of PREF_KEYS) {
      response[key] = prefs[key] !== false;
    }
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/notification-preferences - Update notification preferences
router.put('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const updates = PREF_KEYS.map((key, i) => ({
      col: key,
      param: `$${i + 2}`,
      value: req.body[key] ?? true,
    }));

    const insertCols = ['user_id', ...PREF_KEYS].join(', ');
    const insertPlaceholders = PREF_KEYS.map((_, i) => `$${i + 2}`).join(', ');
    const updateSets = updates.map((u) => `${u.col} = COALESCE(${u.param}, notification_preferences.${u.col})`).join(', ');

    await query(
      `INSERT INTO notification_preferences (${insertCols}, updated_at)
       VALUES ($1, ${insertPlaceholders}, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET ${updateSets}, updated_at = NOW()`,
      [req.userId, ...updates.map((u) => u.value)]
    );

    // Return updated preferences
    const result = await query(
      `SELECT ${PREF_KEYS.join(', ')} FROM notification_preferences WHERE user_id = $1`,
      [req.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
