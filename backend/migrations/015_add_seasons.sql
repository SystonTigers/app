-- Seasons Archive Tables
-- Migration for historical season data with player rosters

BEGIN TRANSACTION;

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,              -- e.g., "2023-24", "2024-25"
    start_date TEXT NOT NULL,        -- YYYY-MM-DD format
    end_date TEXT,                   -- YYYY-MM-DD format, null if ongoing
    is_current INTEGER DEFAULT 0,    -- Only one per tenant
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, name)
);

-- Player seasons (historical roster tracking)
CREATE TABLE IF NOT EXISTS player_seasons (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    squad_number INTEGER,            -- Number worn that season
    position TEXT,                   -- Position played that season
    joined_date TEXT,                -- When joined club (for time at club calc)
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'loaned', 'departed')),
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    UNIQUE(season_id, player_id)
);

-- Add season_id to fixtures (nullable for backwards compat)
ALTER TABLE fixtures ADD COLUMN season_id TEXT REFERENCES seasons(id);

-- Add season_id to league_standings
ALTER TABLE league_standings ADD COLUMN season_id TEXT REFERENCES seasons(id);

-- Add season_id to team_results
ALTER TABLE team_results ADD COLUMN season_id TEXT REFERENCES seasons(id);

-- Fun stats cache table
CREATE TABLE IF NOT EXISTS fun_stats_cache (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT,                  -- null = all-time
    stat_type TEXT NOT NULL,         -- 'team' or 'player'
    stat_key TEXT NOT NULL,          -- e.g., 'unbeaten_streak', 'win_pct_when_starting'
    subject_id TEXT,                 -- player_id for player stats, null for team
    value TEXT NOT NULL,             -- JSON encoded value
    computed_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, season_id, stat_type, stat_key, subject_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_seasons_tenant ON seasons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_seasons_current ON seasons(tenant_id, is_current);
CREATE INDEX IF NOT EXISTS idx_player_seasons_season ON player_seasons(season_id);
CREATE INDEX IF NOT EXISTS idx_player_seasons_player ON player_seasons(player_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_season ON fixtures(season_id);
CREATE INDEX IF NOT EXISTS idx_standings_season ON league_standings(season_id);
CREATE INDEX IF NOT EXISTS idx_results_season ON team_results(season_id);
CREATE INDEX IF NOT EXISTS idx_fun_stats_tenant ON fun_stats_cache(tenant_id, season_id);

COMMIT;
