CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_root BOOLEAN DEFAULT FALSE,
  profile_picture_url TEXT,
  is_first_login BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  public_key TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS browser_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  visitor_id TEXT NULL,
  session_id TEXT NOT NULL,
  user_identifier TEXT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_key, session_id)
);

CREATE TABLE IF NOT EXISTS page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_key TEXT NOT NULL,
  visitor_id TEXT NULL,
  session_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ NULL,
  duration_ms INTEGER NULL,
  max_scroll_depth INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_key, session_id, page_id)
);

CREATE TABLE IF NOT EXISTS sdk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  site_key TEXT NOT NULL,
  visitor_id TEXT NULL,
  session_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_name TEXT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_root BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE sites ADD COLUMN IF NOT EXISTS user_id UUID NULL;
ALTER TABLE browser_sessions ADD COLUMN IF NOT EXISTS visitor_id TEXT NULL;
ALTER TABLE browser_sessions ADD COLUMN IF NOT EXISTS user_identifier TEXT NULL;
ALTER TABLE browser_sessions ADD COLUMN IF NOT EXISTS context JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE browser_sessions ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]'::jsonb;
ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS site_key TEXT;
ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS visitor_id TEXT NULL;
ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS max_scroll_depth INTEGER NULL;
ALTER TABLE sdk_events ADD COLUMN IF NOT EXISTS visitor_id TEXT NULL;
ALTER TABLE sdk_events ADD COLUMN IF NOT EXISTS event_name TEXT NULL;
ALTER TABLE sdk_events ADD COLUMN IF NOT EXISTS context JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'page_visits_site_session_page_unique'
  ) THEN
    ALTER TABLE page_visits
    ADD CONSTRAINT page_visits_site_session_page_unique UNIQUE (site_key, session_id, page_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_site_keys_site_id ON site_keys(site_id);
CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_site_key ON browser_sessions(site_key);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_session_id ON browser_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_visitor_id ON browser_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_last_seen ON browser_sessions(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_site_key ON page_visits(site_key);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_id ON page_visits(page_id);
CREATE INDEX IF NOT EXISTS idx_sdk_events_site_key ON sdk_events(site_key);
CREATE INDEX IF NOT EXISTS idx_sdk_events_session_id ON sdk_events(session_id);
CREATE INDEX IF NOT EXISTS idx_sdk_events_visitor_id ON sdk_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sdk_events_page_id ON sdk_events(page_id);
CREATE INDEX IF NOT EXISTS idx_sdk_events_event_type ON sdk_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sdk_events_occurred_at ON sdk_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_sdk_events_site_type_time ON sdk_events(site_key, event_type, occurred_at DESC);
