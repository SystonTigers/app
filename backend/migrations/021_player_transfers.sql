-- Migration: Player Transfers for Cross-Club Stat Sharing
-- Created: 2024-12-08

-- 1. Global player identity for cross-club linking
CREATE TABLE IF NOT EXISTS player_global_profiles (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
);

-- 2. Add global profile link to squad table
ALTER TABLE squad ADD COLUMN global_profile_id TEXT REFERENCES player_global_profiles(id);

-- 3. Transfer records with codes
CREATE TABLE IF NOT EXISTS player_transfers (
    id TEXT PRIMARY KEY,
    global_profile_id TEXT NOT NULL,
    from_tenant_id TEXT NOT NULL,
    from_player_id TEXT NOT NULL,
    to_tenant_id TEXT,
    to_player_id TEXT,
    transfer_code TEXT UNIQUE NOT NULL,
    stats_snapshot TEXT NOT NULL,
    player_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    redeemed_at INTEGER,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (global_profile_id) REFERENCES player_global_profiles(id),
    FOREIGN KEY (from_tenant_id) REFERENCES tenants(id)
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_transfers_code ON player_transfers(transfer_code);
CREATE INDEX IF NOT EXISTS idx_transfers_global_profile ON player_transfers(global_profile_id);
CREATE INDEX IF NOT EXISTS idx_squad_global_profile ON squad(global_profile_id);
