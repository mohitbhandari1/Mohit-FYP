-- Migration v14: Event attendee approval system
-- Organizers can require manual approval for RSVPs

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT FALSE;

-- RSVP status can now also be 'pending' or 'rejected' (not just 'attending' / 'not_attending')
-- No schema change needed — status is VARCHAR(50) and already accepts any string.
