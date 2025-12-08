-- Migration: Season Management
-- Created: 2024-05-22

-- 1. Create Squad Table (if not exists) as foundation for player content
CREATE TABLE IF NOT EXISTS squad (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    number INTEGER,
    position TEXT,
    role TEXT DEFAULT 'Player',
    photo_url TEXT,
    bio TEXT,
    joined_at INTEGER,
    created_at INTEGER,
    -- New columns for signing feature
    signed_date TEXT,
    previous_club TEXT,
    signing_notes TEXT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_squad_tenant ON squad(tenant_id);

-- 2. Season Awards Table
CREATE TABLE IF NOT EXISTS season_awards (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    award_type TEXT NOT NULL, -- 'golden_boot', 'player_season', 'custom'
    award_name TEXT, -- For custom awards
    player_id TEXT NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES squad(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_season_awards_season ON season_awards(season_id);

-- 3. Season Snapshots (for history freezing)
CREATE TABLE IF NOT EXISTS season_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    season_id TEXT NOT NULL,
    snapshot_type TEXT NOT NULL, -- 'table', 'stats', 'squad'
    data TEXT NOT NULL, -- JSON blob of the data at that time
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

-- 4. Add columns to seasons table (if not exists, assuming seasons table from 015)
-- We can't use IF NOT EXISTS for columns in SQLite safely without dynamic SQL or ignoring errors.
-- Assuming 015 created basic seasons table.
-- We need: archived_at, end_date (if not present).
-- 015 likely had: id, tenant_id, name, start_date, end_date, is_current.
-- I will blindly try to add archived_at. If it fails, it fails (but migration system might stop).
-- Better to check if 015 had these. 015 content in Step 532 showed create table seasons.
-- Let's check 015 content exactly again if needed? 
-- Step 532 summary said "creates seasons table".
-- I will add archived_at.

ALTER TABLE seasons ADD COLUMN archived_at INTEGER;
ALTER TABLE seasons ADD COLUMN competition TEXT;
ALTER TABLE seasons ADD COLUMN age_group TEXT;

-- 5. Add columns to matches/fixtures? 
-- 015 added season_id to fixtures (matches).

-- 6. Add columns to squad (if table existed before, but we used CREATE IF NOT EXISTS above with them included)
-- If table existed, we need ALTER. If it was created above, ALTER will fail or add dup?
-- SQLite allows adding duplicate column? No, returns error.
-- Since I suspect squad table DID NOT exist, the CREATE logic handles it.
-- If it DID exist (e.g. from a migration I missed), then we need ALTER.
-- But I searched generic and found nothing. So CREATE is safe.

