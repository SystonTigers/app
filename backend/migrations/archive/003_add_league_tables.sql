-- Migration: Add League Table Support
-- Description: Store and calculate league standings from match results
-- Created: 2025-10-10

-- League standings table
CREATE TABLE IF NOT EXISTS league_standings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  competition TEXT NOT NULL,
  team_name TEXT NOT NULL,

  -- Standard FA stats (from website)
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,

  -- Calculated stats (from our results)
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,

  -- Metadata
  position INTEGER,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, competition, team_name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_league_standings_competition ON league_standings(tenant_id, competition);
CREATE INDEX IF NOT EXISTS idx_league_standings_position ON league_standings(competition, position);

-- League table snapshots (for historical tracking)
CREATE TABLE IF NOT EXISTS league_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  competition TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  standings_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, competition, snapshot_date)
);

-- Match results table (enhanced version for league calculations)
-- Note: We already have 'results' table, but this adds team-specific data
CREATE TABLE IF NOT EXISTS team_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  match_date TEXT NOT NULL,
  competition TEXT NOT NULL,

  -- Match details
  opponent TEXT NOT NULL,
  venue TEXT NOT NULL,
  our_score INTEGER NOT NULL,
  their_score INTEGER NOT NULL,

  -- Calculated
  result TEXT NOT NULL, -- 'win', 'draw', 'loss'
  points INTEGER NOT NULL, -- 3, 1, 0

  -- Data source tracking
  source TEXT, -- 'website', 'snippet', 'email', 'manual'
  verified INTEGER DEFAULT 0, -- 1 if confirmed accurate

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(tenant_id, match_date, opponent)
);

CREATE INDEX IF NOT EXISTS idx_team_results_date ON team_results(tenant_id, match_date DESC);
CREATE INDEX IF NOT EXISTS idx_team_results_competition ON team_results(tenant_id, competition);
