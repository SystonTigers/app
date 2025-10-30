-- Migration 009: Expand fixture and results schema for multi-tenant support
-- Run with: npx wrangler d1 migrations apply syston-db --remote

BEGIN TRANSACTION;

-- Rebuild fixtures table with tenant + structured teams/scores
ALTER TABLE fixtures RENAME TO fixtures_old;

CREATE TABLE fixtures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  fixture_date TEXT NOT NULL,
  opponent TEXT NOT NULL,
  venue TEXT,
  competition TEXT,
  kick_off_time TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','live','completed','postponed','cancelled')),
  source TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  youtube_live_id TEXT,
  youtube_status TEXT CHECK(youtube_status IN ('live','upcoming','offline')),
  youtube_scheduled_start TEXT,
  current_minute INTEGER DEFAULT 0,
  match_status TEXT DEFAULT 'scheduled' CHECK(match_status IN ('scheduled','live','halftime','ft')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, fixture_date, home_team, away_team)
);

INSERT INTO fixtures (
  id,
  tenant_id,
  fixture_date,
  opponent,
  venue,
  competition,
  kick_off_time,
  status,
  source,
  home_team,
  away_team,
  home_score,
  away_score,
  youtube_live_id,
  youtube_status,
  youtube_scheduled_start,
  current_minute,
  match_status,
  created_at,
  updated_at
)
SELECT
  id,
  'default' AS tenant_id,
  fixture_date,
  opponent,
  venue,
  competition,
  kick_off_time,
  CASE
    WHEN LOWER(COALESCE(status, '')) IN ('scheduled','live','completed','postponed','cancelled') THEN LOWER(status)
    WHEN LOWER(COALESCE(match_status, '')) IN ('scheduled','live','halftime','ft') THEN
      CASE LOWER(match_status)
        WHEN 'ft' THEN 'completed'
        WHEN 'halftime' THEN 'live'
        ELSE LOWER(match_status)
      END
    ELSE 'scheduled'
  END AS status,
  source,
  COALESCE(NULLIF(home_team, ''), 'Home Team') AS home_team,
  COALESCE(NULLIF(away_team, ''), opponent) AS away_team,
  CASE WHEN home_score IS NULL THEN NULL ELSE home_score END,
  CASE WHEN away_score IS NULL THEN NULL ELSE away_score END,
  youtube_live_id,
  youtube_status,
  youtube_scheduled_start,
  COALESCE(current_minute, 0) AS current_minute,
  CASE
    WHEN LOWER(COALESCE(match_status, '')) IN ('scheduled','live','halftime','ft') THEN LOWER(match_status)
    WHEN LOWER(COALESCE(status, '')) = 'completed' THEN 'ft'
    WHEN LOWER(COALESCE(status, '')) IN ('scheduled','live') THEN LOWER(status)
    ELSE 'scheduled'
  END AS match_status,
  created_at,
  updated_at
FROM fixtures_old;

DROP TABLE fixtures_old;

CREATE INDEX IF NOT EXISTS idx_fixtures_tenant_date ON fixtures(tenant_id, fixture_date, kick_off_time);
CREATE INDEX IF NOT EXISTS idx_fixtures_tenant_status ON fixtures(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fixtures_match_status ON fixtures(match_status);
CREATE INDEX IF NOT EXISTS idx_fixtures_youtube ON fixtures(youtube_status, youtube_scheduled_start);

-- Rebuild results table with tenant + structured scorers
ALTER TABLE results RENAME TO results_old;

CREATE TABLE results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  match_date TEXT NOT NULL,
  opponent TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  venue TEXT,
  competition TEXT,
  scorers TEXT,
  home_scorers TEXT NOT NULL DEFAULT '[]',
  away_scorers TEXT NOT NULL DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, match_date, home_team, away_team)
);

INSERT INTO results (
  id,
  tenant_id,
  match_date,
  opponent,
  home_team,
  away_team,
  home_score,
  away_score,
  venue,
  competition,
  scorers,
  home_scorers,
  away_scorers,
  created_at,
  updated_at
)
SELECT
  id,
  'default' AS tenant_id,
  match_date,
  opponent,
  CASE
    WHEN LOWER(TRIM(venue)) = 'away' THEN COALESCE(opponent, 'Opponent')
    ELSE 'Home Team'
  END AS home_team,
  CASE
    WHEN LOWER(TRIM(venue)) = 'away' THEN 'Home Team'
    ELSE COALESCE(opponent, 'Opponent')
  END AS away_team,
  COALESCE(home_score, 0) AS home_score,
  COALESCE(away_score, 0) AS away_score,
  venue,
  competition,
  scorers,
  '[]' AS home_scorers,
  '[]' AS away_scorers,
  created_at,
  CURRENT_TIMESTAMP
FROM results_old;

DROP TABLE results_old;

CREATE INDEX IF NOT EXISTS idx_results_tenant_date ON results(tenant_id, match_date DESC);
CREATE INDEX IF NOT EXISTS idx_results_tenant_match ON results(tenant_id, match_date, home_team, away_team);

COMMIT;
