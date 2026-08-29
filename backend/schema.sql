-- ============================================================
-- PostgreSQL schema for Smart Connects
-- Auto-initialized by Docker via /docker-entrypoint-initdb.d/
-- ============================================================

-- ─── Users ───
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  is_admin BOOLEAN DEFAULT FALSE,
  interests TEXT,
  bio TEXT,
  avatar_url VARCHAR(500),
  banner_image VARCHAR(500),
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Communities ───
CREATE TABLE IF NOT EXISTS communities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(120),
  website VARCHAR(255),
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  member_count INTEGER DEFAULT 0,
  banner_image VARCHAR(500),
  logo VARCHAR(500),
  facebook VARCHAR(255),
  instagram VARCHAR(255),
  linkedin VARCHAR(255),
  tiktok VARCHAR(255),
  location VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  member_approval BOOLEAN DEFAULT FALSE,
  membership_open BOOLEAN DEFAULT FALSE,
  membership_form_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Events ───
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255),
  attendee_count INTEGER DEFAULT 0,
  banner_image VARCHAR(500),
  start_time VARCHAR(50),
  end_date TIMESTAMP WITH TIME ZONE,
  end_time VARCHAR(50),
  duration VARCHAR(100),
  event_type VARCHAR(50) DEFAULT 'physical',
  max_attendees INTEGER,
  allow_guests BOOLEAN DEFAULT FALSE,
  guest_limit INTEGER,
  rsvp_deadline TIMESTAMP WITH TIME ZONE,
  payment_type VARCHAR(50) DEFAULT 'free',
  topics TEXT,
  hosts TEXT,
  speakers TEXT,
  agenda TEXT,
  requirements TEXT,
  instructions TEXT,
  age_limit VARCHAR(100),
  requires_documents BOOLEAN DEFAULT FALSE,
  document_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── RSVPs ───
CREATE TABLE IF NOT EXISTS rsvps (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'attending',
  full_name VARCHAR(255),
  phone VARCHAR(100),
  email VARCHAR(255),
  answers JSONB,
  document_url VARCHAR(500),
  document_name VARCHAR(255),
  document_status VARCHAR(20),
  document_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- ─── Event Registration Questions (custom questions set by organizer) ───
CREATE TABLE IF NOT EXISTS event_questions (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'text',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB,
  file_accept VARCHAR(20) DEFAULT 'both',
  file_max_size INTEGER DEFAULT 5,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Reviews ───
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Community Members ───
CREATE TABLE IF NOT EXISTS community_members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, community_id)
);

-- ─── Organizer Applications ───
CREATE TABLE IF NOT EXISTS organizer_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  address TEXT,
  contact_info VARCHAR(255),
  phone VARCHAR(100),
  social_media TEXT,
  target_audience VARCHAR(255),
  age_group VARCHAR(100),
  category VARCHAR(120),
  website VARCHAR(255),
  documents_url TEXT,
  motivation TEXT,
  expected_members VARCHAR(100),
  meeting_frequency VARCHAR(100),
  experience TEXT,
  venue_details TEXT,
  org_type VARCHAR(100),
  year_established DATE,
  facebook VARCHAR(255),
  instagram VARCHAR(255),
  linkedin VARCHAR(255),
  tiktok VARCHAR(255),
  contact_person_name VARCHAR(255),
  position_role VARCHAR(255),
  activities TEXT,
  benefits TEXT,
  info_accurate BOOLEAN DEFAULT FALSE,
  preferred_username VARCHAR(160),
  authorized_representative BOOLEAN DEFAULT FALSE,
  certificate_file VARCHAR(255),
  logo_file VARCHAR(255),
  additional_doc_file VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  temp_password VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- ─── Announcements ───
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Community Discussions ───
CREATE TABLE IF NOT EXISTS community_discussions (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES community_discussions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Activity Log ───
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(160),
  action VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Notifications ───
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Saved Events ───
CREATE TABLE IF NOT EXISTS saved_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- ─── Community Sponsors ───
CREATE TABLE IF NOT EXISTS community_sponsors (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  logo VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Membership Applications ───
CREATE TABLE IF NOT EXISTS membership_applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(100),
  organization_name VARCHAR(255),
  position VARCHAR(255),
  reason TEXT NOT NULL,
  experience TEXT,
  availability VARCHAR(100),
  additional_info TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, community_id)
);
