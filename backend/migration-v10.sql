-- ============================================================
-- Migration v10: Enhanced registration questions
--   - event_questions: file_accept, file_max_size columns
--   - Supports new types: checkboxes, radio, dropdown, date, number
--   - Backward compatible — existing types unchanged
-- Idempotent — safe to re-run.
-- ============================================================

-- Add file upload config columns (only relevant for type='file')
ALTER TABLE event_questions
  ADD COLUMN IF NOT EXISTS file_accept VARCHAR(20) DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS file_max_size INTEGER DEFAULT 5;
