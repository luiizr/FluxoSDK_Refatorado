CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  session_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(site_key, session_id)
);

CREATE TABLE IF NOT EXISTS page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ NULL,
  duration_ms INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, page_id)
);

CREATE TABLE IF NOT EXISTS sdk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  site_key TEXT NOT NULL,
  session_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_keys_site_id ON site_keys(site_id);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_site_key ON browser_sessions(site_key);
CREATE INDEX IF NOT EXISTS idx_browser_sessions_session_id ON browser_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_id ON page_visits(page_id);
CREATE INDEX IF NOT EXISTS idx_sdk_events_site_key ON sdk_events(site_key);
CREATE INDEX IF NOT EXISTS idx_sdk_events_session_id ON sdk_events(session_id);
CREATE INDEX IF NOT EXISTS idx_sdk_events_page_id ON sdk_events(page_id);
CREATE INDEX IF NOT EXISTS idx_sdk_events_event_type ON sdk_events(event_type);
CREATE INDEX IF NOT EXISTS idx_sdk_events_occurred_at ON sdk_events(occurred_at);
