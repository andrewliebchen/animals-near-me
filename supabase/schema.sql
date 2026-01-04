-- Animals Near Me - Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up the database tables

-- 1. User Preferences Table (for filter storage)
CREATE TABLE IF NOT EXISTS user_preferences (
  device_id TEXT PRIMARY KEY,
  filters JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (for re-running)
DROP POLICY IF EXISTS "Allow anonymous upsert" ON user_preferences;

-- Create policy to allow anonymous inserts/updates (no authentication required)
CREATE POLICY "Allow anonymous upsert"
  ON user_preferences
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 2. Seen Observations Table
CREATE TABLE IF NOT EXISTS seen_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  observation_id TEXT NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, observation_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_seen_observations_device_observation 
  ON seen_observations(device_id, observation_id);

-- Enable Row Level Security
ALTER TABLE seen_observations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (for re-running)
DROP POLICY IF EXISTS "Allow anonymous access" ON seen_observations;

-- Create policy to allow anonymous access (no authentication required)
CREATE POLICY "Allow anonymous access"
  ON seen_observations
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Optional: Create a view to see statistics
CREATE OR REPLACE VIEW seen_observations_stats AS
SELECT 
  device_id,
  COUNT(*) as total_seen,
  MIN(seen_at) as first_seen_at,
  MAX(seen_at) as last_seen_at
FROM seen_observations
GROUP BY device_id;

