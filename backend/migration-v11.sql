-- Migration v11: Add verification_codes table for code-based email verification
-- Used for both signup verification and password reset

CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(50) NOT NULL,        -- 'registration' or 'password_reset'
  name VARCHAR(160),                    -- stored for registration flow
  password VARCHAR(255),                -- hashed password stored for registration flow
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by email + purpose
CREATE INDEX IF NOT EXISTS idx_verification_codes_email_purpose
  ON verification_codes (email, purpose, used);

-- Auto-cleanup: index on expires_at for easy expiry checks
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires
  ON verification_codes (expires_at);
