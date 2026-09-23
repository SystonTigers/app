-- Migration 011: Multi-tenant fixtures (Production)
-- Run with: wrangler d1 migrations apply syston-db --env production --remote
--
-- This migration rebuilds the fixtures table with tenant_id as a required field
-- Safe rollback: DROP TABLE fixtures; ALTER TABLE fixtures_old RENAME TO fixtures;

BEGIN TRANSACTION;

-- Preserve old table for rollback
ALTER TABLE fixtures RENAME TO fixtures_old;

-- Rebuild with strict multi-tenant schema
CREATE TABLE fixtures (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id     TEXT NOT NULL,
  fixture_date  TEXT NOT NULL,            -- ISO8601 date (YYYY-MM-DD)
  opponent      TEXT NOT NULL,
  home_team     TEXT NOT NULL,
  away_team     TEXT NOT NULL,
  venue         TEXT,
  competition   TEXT,
  kick_off_time TEXT,
  status        TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','live','completed','postponed','cancelled')),
  source        TEXT,
  home_score    INTEGER,
  away_score    INTEGER,
  youtube_live_id TEXT,
  youtube_status TEXT CHECK(youtube_status IN ('live','upcoming','offline')),
  youtube_scheduled_start TEXT,
  current_minute INTEGER DEFAULT 0,
  match_status  TEXT DEFAULT 'scheduled' CHECK(match_status IN ('scheduled','live','halftime','ft')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(tenant_id, fixture_date, home_team, away_team)
);

-- Optional: Migrate legacy data (if any exists)
-- Uncomment if you need to preserve old fixtures:
-- INSERT INTO fixtures (tenant_id, fixture_date, opponent, home_team, away_team, venue, status, created_at, updated_at)
-- SELECT 'tnt_legacy', fixture_date, opponent,
--        COALESCE(home_team, 'Home Team'),
--        COALESCE(away_team, opponent),
--        venue,
--        COALESCE(status, 'scheduled'),
--        COALESCE(created_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
--        COALESCE(updated_at, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
-- FROM fixtures_old;

-- Performance indexes for tenant isolation
CREATE INDEX IF NOT EXISTS idx_fixtures_tenant_date   ON fixtures(tenant_id, fixture_date, kick_off_time);
CREATE INDEX IF NOT EXISTS idx_fixtures_tenant_status ON fixtures(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fixtures_match_status  ON fixtures(match_status);
CREATE INDEX IF NOT EXISTS idx_fixtures_youtube       ON fixtures(youtube_status, youtube_scheduled_start);

COMMIT;

-- Notes:
-- 1. fixtures_old is kept for rollback - drop it manually after validation
-- 2. All new fixtures inserts MUST include tenant_id
-- 3. All queries MUST filter by tenant_id for isolation
