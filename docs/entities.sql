-- EXTENSION
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================
-- COMPANIES
-- ========================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- USERS
-- ========================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,

  profile_image_url TEXT,

  is_root BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'member',

  cfg_token TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- SITES
-- ========================
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),

  name TEXT,
  domain TEXT
);

-- ========================
-- SITE KEYS
-- ========================
CREATE TABLE site_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),

  public_key TEXT UNIQUE
);

-- ========================
-- VISITORS
-- ========================
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  site_key TEXT,
  visitor_id TEXT,

  UNIQUE(site_key, visitor_id)
);

-- ========================
-- SESSIONS
-- ========================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  site_key TEXT,
  session_id TEXT,
  visitor_id TEXT,

  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- ========================
-- EVENTS RAW
-- ========================
CREATE TABLE sdk_events_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  site_key TEXT,
  event_type TEXT,
  metadata JSONB,

  occurred_at TIMESTAMPTZ
);

-- ========================
-- METRIC DEFINITIONS
-- ========================
CREATE TABLE metric_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  site_id UUID,

  name TEXT,
  source TEXT,
  aggregation TEXT,
  field TEXT,

  filters JSONB,
  group_by JSONB
);

-- ========================
-- KPIs
-- ========================
CREATE TABLE kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  site_id UUID,
  metric_id UUID,

  name TEXT,
  chart_type TEXT,

  settings JSONB
);

-- ========================
-- DASHBOARD
-- ========================
CREATE TABLE dashboard_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  kpi_id UUID,

  pos_x INT,
  pos_y INT,
  width INT,
  height INT
);

-- ========================
-- INDEXES
-- ========================
CREATE INDEX idx_events_site ON sdk_events_raw(site_key);
CREATE INDEX idx_sessions_site ON sessions(site_key);