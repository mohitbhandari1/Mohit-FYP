-- Migration v12: Add notification_preferences table
-- Stores per-user notification toggle settings

CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  new_event BOOLEAN DEFAULT TRUE,
  announcement BOOLEAN DEFAULT TRUE,
  document_approved BOOLEAN DEFAULT TRUE,
  document_rejected BOOLEAN DEFAULT TRUE,
  answer_approved BOOLEAN DEFAULT TRUE,
  answer_rejected BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user
  ON notification_preferences (user_id);
