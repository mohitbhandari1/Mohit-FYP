-- Migration v16: Add rsvp_cancelled notification preference
-- Used when a user cancels their event registration (not_attending)

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS rsvp_cancelled BOOLEAN DEFAULT TRUE;
