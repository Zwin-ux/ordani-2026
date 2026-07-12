-- TinyMe Backend — Initial Schema
-- Run: psql $DATABASE_URL -f migrations/001_initial.sql

-- Links: the core short URL entity
CREATE TABLE IF NOT EXISTS links (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug        TEXT NOT NULL,
    domain      TEXT NOT NULL DEFAULT 'tinyme.cc',
    password_hash TEXT,
    expires_at  TIMESTAMPTZ,
    click_limit INTEGER,
    click_count INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (slug, domain)
);

CREATE INDEX idx_links_slug_domain ON links (slug, domain);
CREATE INDEX idx_links_domain ON links (domain);
CREATE INDEX idx_links_is_active ON links (is_active) WHERE is_active = true;

-- Destinations: where a link points to
CREATE TABLE IF NOT EXISTS destinations (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    link_id     TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    is_primary  BOOLEAN NOT NULL DEFAULT true,
    weight      INTEGER NOT NULL DEFAULT 1,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_destinations_link_id ON destinations (link_id);
CREATE INDEX idx_destinations_link_active ON destinations (link_id, is_active) WHERE is_active = true;

-- Destination history: tracks every URL change
CREATE TABLE IF NOT EXISTS destination_history (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    destination_id  TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    old_url         TEXT NOT NULL,
    new_url         TEXT NOT NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dest_history_dest_id ON destination_history (destination_id);

-- Routing rules: conditional destination selection
CREATE TABLE IF NOT EXISTS routing_rules (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    link_id         TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    type            TEXT NOT NULL, -- country, device, schedule, referrer
    condition       JSONB NOT NULL,
    destination_id  TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    priority        INTEGER NOT NULL DEFAULT 100,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rules_link_id ON routing_rules (link_id);
CREATE INDEX idx_rules_link_active ON routing_rules (link_id, is_active) WHERE is_active = true;
CREATE INDEX idx_rules_type ON routing_rules (type);

-- Events: every redirect click
CREATE TABLE IF NOT EXISTS events (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    link_id         TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    destination_id  TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_hash         TEXT NOT NULL DEFAULT '',
    user_agent      TEXT NOT NULL DEFAULT '',
    referrer        TEXT NOT NULL DEFAULT '',
    country         TEXT NOT NULL DEFAULT '',
    device_type     TEXT NOT NULL DEFAULT 'unknown',
    is_bot          BOOLEAN NOT NULL DEFAULT false,
    latency_ms      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_events_link_id ON events (link_id);
CREATE INDEX idx_events_link_time ON events (link_id, timestamp DESC);
CREATE INDEX idx_events_destination ON events (destination_id);
CREATE INDEX idx_events_country ON events (country);
CREATE INDEX idx_events_device ON events (device_type);
CREATE INDEX idx_events_is_bot ON events (is_bot);
CREATE INDEX idx_events_timestamp ON events (timestamp DESC);

-- Increment link click count on insert
CREATE OR REPLACE FUNCTION increment_click_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE links SET click_count = click_count + 1, updated_at = now()
    WHERE id = NEW.link_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_click
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION increment_click_count();
