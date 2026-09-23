-- Last Man Standing Game Tables
-- Migration: 038_last_man_standing.sql
-- Created: 2026-01-26

-- LMS Games (competition container)
-- Each tenant can have multiple games (e.g., Premier League Survivor, Championship Survivor)
CREATE TABLE IF NOT EXISTS lms_games (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sport TEXT NOT NULL DEFAULT 'football',
    competition TEXT,                         -- e.g., 'Premier League', 'Championship'
    competition_id TEXT,                      -- External API competition ID
    status TEXT NOT NULL DEFAULT 'active',    -- active, completed
    round_number INTEGER DEFAULT 0,
    winner_user_id TEXT,
    winner_name TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- LMS Rounds (weekly/gameweek fixtures)
CREATE TABLE IF NOT EXISTS lms_rounds (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    name TEXT,                                -- e.g., 'Gameweek 23'
    deadline INTEGER NOT NULL,                -- Auto-set to first kickoff
    status TEXT NOT NULL DEFAULT 'open',      -- open, locked, processed
    fixtures_json TEXT,                       -- JSON array of fixtures from API
    created_at INTEGER NOT NULL,
    processed_at INTEGER,
    FOREIGN KEY (game_id) REFERENCES lms_games(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- LMS Entries (user participation in a game)
CREATE TABLE IF NOT EXISTS lms_entries (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    status TEXT NOT NULL DEFAULT 'alive',     -- alive, eliminated, winner
    eliminated_round INTEGER,                 -- Round number when eliminated
    teams_used TEXT DEFAULT '[]',             -- JSON array of team names already picked
    streak INTEGER DEFAULT 0,                 -- Current correct prediction streak
    created_at INTEGER NOT NULL,
    FOREIGN KEY (game_id) REFERENCES lms_games(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(game_id, user_id)
);

-- LMS Predictions (per-round picks)
CREATE TABLE IF NOT EXISTS lms_predictions (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    round_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    team_picked TEXT NOT NULL,               -- Team name user predicted to win
    fixture_id TEXT,                         -- Which fixture this prediction is for
    result TEXT,                             -- win, lose, draw (null until processed)
    processed_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES lms_entries(id),
    FOREIGN KEY (round_id) REFERENCES lms_rounds(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(entry_id, round_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lms_games_tenant ON lms_games(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lms_games_status ON lms_games(status);
CREATE INDEX IF NOT EXISTS idx_lms_rounds_game ON lms_rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_lms_rounds_status ON lms_rounds(status);
CREATE INDEX IF NOT EXISTS idx_lms_entries_game ON lms_entries(game_id);
CREATE INDEX IF NOT EXISTS idx_lms_entries_user ON lms_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_lms_entries_status ON lms_entries(status);
CREATE INDEX IF NOT EXISTS idx_lms_predictions_round ON lms_predictions(round_id);
CREATE INDEX IF NOT EXISTS idx_lms_predictions_entry ON lms_predictions(entry_id);
