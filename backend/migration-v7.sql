-- ============================================================
-- Migration v7: Seat limits & custom registration questions
-- Date: August 2026
-- ============================================================
-- Adds:
--   1. event_questions  — custom questions an event organizer can
--      define that members must answer before RSVPing.
--   2. rsvps.answers    — JSONB answers per RSVP.
-- Seat limits already exist via events.max_attendees (editable after
-- creation through PUT /api/events/:id).
-- Idempotent — safe to re-run.
-- ============================================================

-- Custom registration questions per event
CREATE TABLE IF NOT EXISTS event_questions (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'text',      -- text | textarea | select
  required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB,                                  -- for type='select': ["Option A","Option B"]
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store the attendee's answers as { questionId or questionText: answer }
ALTER TABLE rsvps
  ADD COLUMN IF NOT EXISTS answers JSONB;

-- Index for quickly counting attending RSVPs per event (seat capacity)
CREATE INDEX IF NOT EXISTS idx_rsvps_event_status ON rsvps (event_id, status);
