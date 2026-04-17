ALTER TABLE browser_sessions ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]'::jsonb;
