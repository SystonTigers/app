-- Invites that link a parent's account to their child: staff create one per
-- player and share it (WhatsApp, text). Only a hash of the code is kept.
-- A code works for 30 days and a few parents (mum, dad, carers).
CREATE TABLE IF NOT EXISTS parent_invites (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    code_hash TEXT NOT NULL UNIQUE,
    created_by TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    uses INTEGER NOT NULL DEFAULT 0,
    revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_parent_invites_player ON parent_invites(tenant_id, player_id);

-- Photo/video consent reminders sent to each parent (round 1, then round 2 a week later)
CREATE TABLE IF NOT EXISTS consent_reminders (
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    round INTEGER NOT NULL,
    sent_at INTEGER NOT NULL,
    PRIMARY KEY (tenant_id, user_id, round)
);

-- Each club's private address for forwarding FA Full-Time emails
-- (fixtures-<token>@<EMAIL_DOMAIN>), and what happened to each email.
ALTER TABLE tenants ADD COLUMN fixture_email_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_fixture_email ON tenants(fixture_email_token);
CREATE TABLE IF NOT EXISTS fixture_email_log (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    received_at INTEGER NOT NULL,
    subject TEXT,
    -- imported | nothing_found | not_fa | gmail_confirmation | failed
    outcome TEXT NOT NULL,
    found INTEGER,
    added INTEGER,
    updated INTEGER,
    -- Gmail's forwarding confirmation code (so the club can finish setting up forwarding)
    detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_fixture_email_log ON fixture_email_log(tenant_id, received_at);
