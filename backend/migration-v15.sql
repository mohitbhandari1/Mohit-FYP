-- Migration v15: Extend notification preferences for all main activities
-- Adds toggles for: community joined, RSVP lifecycle, membership application review

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS community_joined BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS rsvp_pending BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS rsvp_confirmed BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS rsvp_approved BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS rsvp_rejected BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS membership_approved BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS membership_rejected BOOLEAN DEFAULT TRUE;
