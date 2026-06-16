-- Tabelas para o SDK de avaliação de fluxos

CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES usuarios(id),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{
      "recordConsole": true,
      "recordCanvas": false,
      "recordInput": true,
      "maskAllInputs": false,
      "checkoutEveryNms": 30000
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id),
    public_key VARCHAR(255) UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS browser_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_key VARCHAR(255) REFERENCES site_keys(public_key),
    visitor_id VARCHAR(255),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_identifier VARCHAR(255),
    user_agent TEXT,
    ip_address VARCHAR(45),
    browser_name VARCHAR(50),
    browser_version VARCHAR(50),
    os_name VARCHAR(50),
    device_type VARCHAR(50),
    screen_resolution VARCHAR(20),
    language VARCHAR(10),
    country VARCHAR(100),
    city VARCHAR(100),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    context JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS session_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) REFERENCES browser_sessions(session_id),
    event_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
