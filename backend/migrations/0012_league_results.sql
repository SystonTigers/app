-- Our own league table, worked out from results (or a pasted table re-sorted)
-- so it's ordered by points, goal difference, then goals scored.

CREATE TABLE IF NOT EXISTS league_settings (
  tenant_id TEXT PRIMARY KEY,
  competition TEXT NOT NULL DEFAULT 'League',
  our_team TEXT,                         -- our team's name as the league writes it
  season_start TEXT,                     -- yyyy-mm-dd; earlier results are ignored
  mode TEXT NOT NULL DEFAULT 'results',  -- 'results': worked out from results; 'table': pasted table re-sorted
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS league_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  competition TEXT NOT NULL,
  match_date TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_key TEXT NOT NULL,
  away_key TEXT NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'paste',
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(tenant_id, competition, match_date, home_key, away_key)
);

CREATE INDEX IF NOT EXISTS idx_league_results_tenant ON league_results(tenant_id, competition, match_date);
