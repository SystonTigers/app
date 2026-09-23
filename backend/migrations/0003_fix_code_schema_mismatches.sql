-- 0003_fix_code_schema_mismatches.sql
-- Fixes places where the API's SQL didn't match any table/column definition
-- (found by checking every query in backend/src against the schema).
-- All rebuilt tables were empty in production except `fixtures` (1 row), which
-- is copied across.

PRAGMA defer_foreign_keys = true;

-- ---------------------------------------------------------------------------
-- fixtures: home_team/away_team become optional (CSV import, friendlies and
-- manual adds only know the opponent). Unique key unchanged.
-- ---------------------------------------------------------------------------
CREATE TABLE fixtures_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  season_id TEXT,
  fixture_date TEXT NOT NULL,
  opponent TEXT NOT NULL,
  home_team TEXT,
  away_team TEXT,
  venue TEXT,
  competition TEXT,
  kick_off_time TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  source TEXT,
  home_score INTEGER,
  away_score INTEGER,
  youtube_live_id TEXT,
  youtube_status TEXT,
  youtube_scheduled_start TEXT,
  current_minute INTEGER DEFAULT 0,
  match_status TEXT DEFAULT 'scheduled',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(tenant_id, fixture_date, home_team, away_team)
);
INSERT INTO fixtures_new (
  id, tenant_id, season_id, fixture_date, opponent, home_team, away_team, venue, competition,
  kick_off_time, status, source, home_score, away_score, youtube_live_id, youtube_status,
  youtube_scheduled_start, current_minute, match_status, created_at, updated_at
)
SELECT
  id, tenant_id, season_id, fixture_date, opponent, home_team, away_team, venue, competition,
  kick_off_time, status, source, home_score, away_score, youtube_live_id, youtube_status,
  youtube_scheduled_start, current_minute, match_status, created_at, updated_at
FROM fixtures;
DROP TABLE fixtures;
ALTER TABLE fixtures_new RENAME TO fixtures;
CREATE INDEX IF NOT EXISTS idx_fixtures_tenant_date ON fixtures(tenant_id, fixture_date);
CREATE INDEX IF NOT EXISTS idx_fixtures_season ON fixtures(season_id);

-- ---------------------------------------------------------------------------
-- matches / live_updates: drop FKs to legacy tables (teams, fixtures_old) that
-- made every insert fail with foreign-key enforcement on. team_id = tenant id.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS matches;
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  season_id TEXT,
  date_utc INTEGER NOT NULL,
  venue TEXT,
  lat REAL,
  lon REAL,
  status TEXT DEFAULT 'scheduled'
);
CREATE INDEX IF NOT EXISTS idx_matches_team ON matches(team_id, date_utc);
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  type TEXT NOT NULL,
  minute INTEGER,
  player_id TEXT,
  assist_id TEXT,
  payload_json TEXT,
  ts INTEGER NOT NULL,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_events_match ON events(match_id, minute);

DROP TABLE IF EXISTS live_updates;
CREATE TABLE live_updates (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  minute INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('goal', 'card', 'subs', 'info')),
  text TEXT NOT NULL,
  scorer TEXT,
  assist TEXT,
  card TEXT CHECK(card IN ('yellow', 'red', 'sinbin')),
  player TEXT,
  score_so_far TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES fixtures(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_live_updates_match ON live_updates(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_updates_type ON live_updates(type);

-- ---------------------------------------------------------------------------
-- Last Man Standing: production had an older shape; use the one the code
-- (routes/lms.ts, migration 038) is written for.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS lms_predictions;
DROP TABLE IF EXISTS lms_entries;
DROP TABLE IF EXISTS lms_rounds;
DROP TABLE IF EXISTS lms_games;
CREATE TABLE lms_games (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'football',
  competition TEXT,
  competition_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  round_number INTEGER DEFAULT 0,
  winner_user_id TEXT,
  winner_name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
CREATE TABLE lms_rounds (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  name TEXT,
  deadline INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  fixtures_json TEXT,
  created_at INTEGER NOT NULL,
  processed_at INTEGER,
  FOREIGN KEY (game_id) REFERENCES lms_games(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
CREATE TABLE lms_entries (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT,
  status TEXT NOT NULL DEFAULT 'alive',
  eliminated_round INTEGER,
  teams_used TEXT DEFAULT '[]',
  streak INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (game_id) REFERENCES lms_games(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(game_id, user_id)
);
CREATE TABLE lms_predictions (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  round_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  team_picked TEXT NOT NULL,
  fixture_id TEXT,
  result TEXT,
  processed_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES lms_entries(id),
  FOREIGN KEY (round_id) REFERENCES lms_rounds(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(entry_id, round_id)
);
CREATE INDEX IF NOT EXISTS idx_lms_games_tenant ON lms_games(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_games_status ON lms_games(status);
CREATE INDEX IF NOT EXISTS idx_lms_rounds_game ON lms_rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_lms_rounds_status ON lms_rounds(status);
CREATE INDEX IF NOT EXISTS idx_lms_entries_game ON lms_entries(game_id);
CREATE INDEX IF NOT EXISTS idx_lms_entries_user ON lms_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_lms_entries_status ON lms_entries(status);
CREATE INDEX IF NOT EXISTS idx_lms_predictions_round ON lms_predictions(round_id);
CREATE INDEX IF NOT EXISTS idx_lms_predictions_entry ON lms_predictions(entry_id);

-- ---------------------------------------------------------------------------
-- Calendar events + RSVPs (routes/events.ts). RSVPs key on auth user ids,
-- so no FK to the legacy `users` table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'event',
  start_time TEXT NOT NULL,
  end_time TEXT,
  location TEXT,
  description TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_start ON calendar_events(tenant_id, start_time);
CREATE TABLE IF NOT EXISTS event_rsvps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  UNIQUE(event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON event_rsvps(event_id);

-- ---------------------------------------------------------------------------
-- Tactics board (routes/tactics.ts): one saved setup per club.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_tactics (
  tenant_id TEXT PRIMARY KEY,
  formation TEXT NOT NULL,
  config TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- Columns the code writes/reads that no migration ever added.
-- ---------------------------------------------------------------------------
ALTER TABLE notifications ADD COLUMN message TEXT;
ALTER TABLE notifications ADD COLUMN link TEXT;
ALTER TABLE notifications ADD COLUMN related_id TEXT;
ALTER TABLE team_results ADD COLUMN scorers TEXT;
ALTER TABLE tenants ADD COLUMN usage_cap INTEGER;
ALTER TABLE discussion_group_types ADD COLUMN name TEXT;
ALTER TABLE discussion_group_types ADD COLUMN is_default INTEGER DEFAULT 0;

-- ON CONFLICT(...) targets used by the code need a matching unique index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_seasons_unique ON player_seasons(season_id, player_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fun_stats_cache_unique
  ON fun_stats_cache(tenant_id, season_id, stat_type, stat_key, subject_id);

-- ---------------------------------------------------------------------------
-- Tenant-less web sign-up (routes/auth.ts) stores accounts in `users`. The
-- production table was an old stub (role NOT NULL, FK to teams) and was empty.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  password_hash TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  role TEXT,
  team_id TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- Discussion group membership (auto-assigned on login-code sign in)
CREATE TABLE IF NOT EXISTS group_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  joined_at TEXT,
  UNIQUE(user_id, group_id)
);

-- Audit trail (account deletions etc.)
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id, created_at);
