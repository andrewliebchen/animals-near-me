-- Animals Near Me - Supabase Database Schema
-- Safe to re-run on a shared database: creates only this app's objects.
-- Does not DROP tables, and will not replace existing views or policies.

-- 1. User Preferences Table (for filter storage)
CREATE TABLE IF NOT EXISTS user_preferences (
  device_id TEXT PRIMARY KEY,
  filters JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_preferences'
      AND policyname = 'Allow anonymous upsert'
  ) THEN
    CREATE POLICY "Allow anonymous upsert"
      ON user_preferences
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences TO anon, authenticated;

-- 2. Seen Observations Table
CREATE TABLE IF NOT EXISTS seen_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  observation_id TEXT NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, observation_id)
);

CREATE INDEX IF NOT EXISTS idx_seen_observations_device_observation
  ON seen_observations(device_id, observation_id);

ALTER TABLE seen_observations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'seen_observations'
      AND policyname = 'Allow anonymous access'
  ) THEN
    CREATE POLICY "Allow anonymous access"
      ON seen_observations
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON seen_observations TO anon, authenticated;

-- Optional stats view (created only if missing; never replaced)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'seen_observations_stats'
  ) THEN
    EXECUTE $view$
      CREATE VIEW seen_observations_stats
      WITH (security_invoker = true) AS
      SELECT
        device_id,
        COUNT(*) as total_seen,
        MIN(seen_at) as first_seen_at,
        MAX(seen_at) as last_seen_at
      FROM seen_observations
      GROUP BY device_id;
    $view$;
  END IF;
END $$;
