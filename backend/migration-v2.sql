-- ============================================================
-- Migration v2: Enhanced events, communities, and org features
-- Date: June 2026
-- ============================================================

-- Users enhancements
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS banner_image VARCHAR(500);

-- Events enhancements
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS banner_image VARCHAR(500),
  ADD COLUMN IF NOT EXISTS start_time VARCHAR(50),
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS end_time VARCHAR(50),
  ADD COLUMN IF NOT EXISTS duration VARCHAR(100),
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS max_attendees INTEGER,
  ADD COLUMN IF NOT EXISTS allow_guests BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guest_limit INTEGER,
  ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS topics TEXT,
  ADD COLUMN IF NOT EXISTS hosts TEXT,
  ADD COLUMN IF NOT EXISTS speakers TEXT,
  ADD COLUMN IF NOT EXISTS agenda TEXT,
  ADD COLUMN IF NOT EXISTS requirements TEXT,
  ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Communities enhancements
ALTER TABLE communities
  ADD COLUMN IF NOT EXISTS banner_image VARCHAR(500),
  ADD COLUMN IF NOT EXISTS logo VARCHAR(500),
  ADD COLUMN IF NOT EXISTS facebook VARCHAR(255),
  ADD COLUMN IF NOT EXISTS instagram VARCHAR(255),
  ADD COLUMN IF NOT EXISTS linkedin VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255),
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS member_approval BOOLEAN DEFAULT FALSE;

-- Saved events table
CREATE TABLE IF NOT EXISTS saved_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Event attendees view (separate from RSVPs for attendee management)
ALTER TABLE rsvps
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(100),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Community sponsors
CREATE TABLE IF NOT EXISTS community_sponsors (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  logo VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
