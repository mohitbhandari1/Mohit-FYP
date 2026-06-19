-- ============================================================
-- Migration: Add new columns to organizer_applications table
-- Date: June 2026
-- 
-- This migration adds the new fields from the updated
-- Community Creation Application Form to an existing
-- organizer_applications table.
-- 
-- Usage:
--   psql -h localhost -U postgres -d smart_connects -f migration.sql
-- ============================================================

-- Section 1: Organization / Community Information
ALTER TABLE organizer_applications
  ADD COLUMN IF NOT EXISTS org_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS year_established DATE;

-- Section 2: Social Media & Website
ALTER TABLE organizer_applications
  ADD COLUMN IF NOT EXISTS facebook VARCHAR(255),
  ADD COLUMN IF NOT EXISTS instagram VARCHAR(255),
  ADD COLUMN IF NOT EXISTS linkedin VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255);

-- Section 3: Contact Information
ALTER TABLE organizer_applications
  ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS position_role VARCHAR(255);

-- Section 4: Community Details
ALTER TABLE organizer_applications
  ADD COLUMN IF NOT EXISTS activities TEXT,
  ADD COLUMN IF NOT EXISTS benefits TEXT;

-- Section 5: Verification Information
ALTER TABLE organizer_applications
  ADD COLUMN IF NOT EXISTS info_accurate BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS certificate_file VARCHAR(255),
  ADD COLUMN IF NOT EXISTS logo_file VARCHAR(255),
  ADD COLUMN IF NOT EXISTS additional_doc_file VARCHAR(255);

-- Section 6: Account Setup
ALTER TABLE organizer_applications
  ADD COLUMN IF NOT EXISTS preferred_username VARCHAR(160);

-- Section 7: Declaration
ALTER TABLE organizer_applications
  ADD COLUMN IF NOT EXISTS authorized_representative BOOLEAN DEFAULT FALSE;

-- ============================================================
-- Migration: Add avatar_url to users table
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
