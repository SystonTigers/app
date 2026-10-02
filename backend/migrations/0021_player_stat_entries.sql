-- Stats staff enter by hand for a player and season (past seasons, or games
-- not run through Match Centre). Added on top of what Match Centre records.
CREATE TABLE IF NOT EXISTS player_stat_entries (
    tenant_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    -- Season id as GET /results/seasons gives it ("2025-26" or a club season id)
    season_id TEXT NOT NULL,
    -- First day of that season (yyyy-mm-dd), so season filters can use dates
    season_from TEXT NOT NULL,
    appearances INTEGER NOT NULL DEFAULT 0,
    goals INTEGER NOT NULL DEFAULT 0,
    assists INTEGER NOT NULL DEFAULT 0,
    yellow_cards INTEGER NOT NULL DEFAULT 0,
    red_cards INTEGER NOT NULL DEFAULT 0,
    motm INTEGER NOT NULL DEFAULT 0,
    updated_by TEXT,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (tenant_id, player_id, season_id)
);
CREATE INDEX IF NOT EXISTS idx_player_stat_entries_season ON player_stat_entries(tenant_id, season_from);
