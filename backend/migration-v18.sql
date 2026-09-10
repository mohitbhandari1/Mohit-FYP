-- Add personalized_interests column to events table for event recommendation
ALTER TABLE events ADD COLUMN IF NOT EXISTS personalized_interests TEXT;
