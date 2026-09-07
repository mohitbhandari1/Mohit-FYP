-- Migration v17: Add new_attendee notification preference
-- Used when someone registers for an organizer's event

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS new_attendee BOOLEAN DEFAULT TRUE;
