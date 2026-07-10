-- ============================================================
-- Migration v4: Gender field for demographics & admin stats
-- Date: July 2026
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT NULL;
