-- 0007_social_posting.sql
-- Automatic posts to the club app feed, Facebook and Instagram when things
-- happen in a match (and when Man of the Match is decided).

-- How players appear publicly: 'full' (Sam Smith), 'first_initial' (Sam S.),
-- 'initial_last' (S. Smith). Photos are a separate choice, off by default.
ALTER TABLE tenants ADD COLUMN public_name_style TEXT NOT NULL DEFAULT 'first_initial';
ALTER TABLE tenants ADD COLUMN public_photos INTEGER NOT NULL DEFAULT 0;
UPDATE tenants SET public_name_style = 'full', public_photos = 1 WHERE public_full_names = 1;

-- Posting choices: wait a minute so mistakes can be undone, and which events post where (JSON; NULL = defaults)
ALTER TABLE tenants ADD COLUMN social_undo_window INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tenants ADD COLUMN social_events TEXT;

-- Connected Facebook Page / Instagram account. Tokens are encrypted (SOCIAL_TOKEN_KEY).
CREATE TABLE IF NOT EXISTS social_connections (
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL,            -- 'facebook' | 'instagram'
    account_id TEXT NOT NULL,          -- Page id / Instagram business account id
    account_name TEXT,
    access_token_enc TEXT NOT NULL,
    connected_by TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (tenant_id, platform)
);

-- One post per match event (or MOTM result), sent when post_after has passed.
CREATE TABLE IF NOT EXISTS social_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    fixture_id TEXT,
    source_type TEXT NOT NULL,         -- 'live_event' | 'motm'
    source_id TEXT NOT NULL,
    kind TEXT NOT NULL,                -- goal, half_time, full_time, motm, kick_off, ...
    caption TEXT NOT NULL,
    graphic TEXT NOT NULL,             -- JSON: what the app draws on the graphic
    targets TEXT NOT NULL,             -- JSON array: feed, facebook, instagram
    image_key TEXT,                    -- R2 key once the app has uploaded the graphic
    post_after INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, posting, done, cancelled, failed
    results TEXT,                      -- JSON per target: { ok, id?, error? }
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (tenant_id, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS idx_social_jobs_due ON social_jobs(status, post_after);
CREATE INDEX IF NOT EXISTS idx_social_jobs_fixture ON social_jobs(tenant_id, fixture_id);
