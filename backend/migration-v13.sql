-- Migration v13: Add community_logo to notifications
-- Shows community branding in notification dropdown

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS community_logo VARCHAR(500);
