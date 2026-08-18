-- ============================================================
-- Migration v9: Event age limit + document verification
--   - events:  age_limit (optional), requires_documents, document_instructions
--   - rsvps:   document_url / document_name (attendee uploads)
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS age_limit VARCHAR(100),
  ADD COLUMN IF NOT EXISTS requires_documents BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS document_instructions TEXT;

ALTER TABLE rsvps
  ADD COLUMN IF NOT EXISTS document_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS document_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS document_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS document_reviewed_at TIMESTAMP WITH TIME ZONE;
