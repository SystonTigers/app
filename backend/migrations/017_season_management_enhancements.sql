-- Season Management Enhancements
-- Adds: season awards, snapshots, player signing tracking, welcome posts

-- Season Awards table for end-of-season recognition
CREATE TABLE IF NOT EXISTS season_awards (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    award_type TEXT NOT NULL CHECK(award_type IN (
        'player_of_season',
        'top_scorer',
        'most_assists',
        'players_player',
        'most_improved',
        'managers_player',
        'golden_glove',
        'custom'
    )),
    award_name TEXT,           -- Custom award name (null for standard types)
    player_id TEXT NOT NULL,
    notes TEXT,                -- Optional notes about the award
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    FOREIGN KEY (player_id) REFERENCES squad(id)
);

-- Season snapshots (frozen stats at archive time)
CREATE TABLE IF NOT EXISTS season_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    snapshot_type TEXT NOT NULL CHECK(snapshot_type IN (
        'team_record',      -- W/D/L, goals, points
        'player_stats',     -- All player stats JSON array
        'league_position',  -- Final league position
        'top_performers'    -- Top scorer, assists, MOTM leaders
    )),
    data TEXT NOT NULL,            -- JSON blob of frozen stats
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (season_id) REFERENCES seasons(id),
    UNIQUE(tenant_id, season_id, snapshot_type)
);

-- Add archived_at timestamp to seasons for 24-hour reopen window
ALTER TABLE seasons ADD COLUMN archived_at INTEGER;

-- Add notes field to seasons for archive notes
ALTER TABLE seasons ADD COLUMN notes TEXT;

-- Add competition and age_group to seasons
ALTER TABLE seasons ADD COLUMN competition TEXT;
ALTER TABLE seasons ADD COLUMN age_group TEXT;

-- Update player_seasons for departure tracking
ALTER TABLE player_seasons ADD COLUMN departed_date TEXT;
ALTER TABLE player_seasons ADD COLUMN departure_reason TEXT CHECK(departure_reason IN (
    'left_club',
    'moved_up',
    'retired',
    'released',
    'transferred',
    'other'
));

-- Add previous_club to squad for tracking player origin
ALTER TABLE squad ADD COLUMN previous_club TEXT;

-- Add signed_date for "time at club" calculations
ALTER TABLE squad ADD COLUMN signed_date TEXT;

-- Add post_type to feed_posts for categorization
ALTER TABLE feed_posts ADD COLUMN post_type TEXT DEFAULT 'general' CHECK(post_type IN (
    'general',
    'signing',
    'match_report',
    'announcement',
    'milestone',
    'award'
));

-- Add related_player_id for linking posts to players (e.g., signing announcements)
ALTER TABLE feed_posts ADD COLUMN related_player_id TEXT REFERENCES squad(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_season_awards_season ON season_awards(season_id);
CREATE INDEX IF NOT EXISTS idx_season_awards_player ON season_awards(player_id);
CREATE INDEX IF NOT EXISTS idx_season_awards_tenant ON season_awards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_season_snapshots_season ON season_snapshots(season_id);
CREATE INDEX IF NOT EXISTS idx_season_snapshots_tenant ON season_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON feed_posts(tenant_id, post_type);
CREATE INDEX IF NOT EXISTS idx_feed_posts_player ON feed_posts(related_player_id);
CREATE INDEX IF NOT EXISTS idx_squad_signed_date ON squad(tenant_id, signed_date);
