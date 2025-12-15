-- Migration 026: Opponent Badges System
-- Shared badge library (cross-tenant) + per-tenant opponent list

-- Shared badge library - when one tenant confirms a badge, all tenants benefit
CREATE TABLE IF NOT EXISTS badge_library (
  id TEXT PRIMARY KEY,
  team_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,  -- "thurmaston-magpies-fc"
  badge_url TEXT NOT NULL,               -- R2 URL or external
  verified INTEGER DEFAULT 0,            -- 1 = human confirmed
  contributed_by TEXT,                   -- tenant_id who first added
  usage_count INTEGER DEFAULT 1,         -- how many tenants use this
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_badge_library_normalized ON badge_library(normalized_name);
CREATE INDEX IF NOT EXISTS idx_badge_library_verified ON badge_library(verified);

-- Tenant's opponent list - links to shared library or custom override
CREATE TABLE IF NOT EXISTS opponent_teams (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  badge_library_id TEXT,                  -- FK to shared library (if using shared)
  custom_badge_url TEXT,                  -- Override with tenant's own upload
  pending_badge_url TEXT,                 -- Google image result awaiting approval
  status TEXT DEFAULT 'pending',          -- 'pending', 'approved', 'custom'
  first_seen_at INTEGER,                  -- When we first played them
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, normalized_name),
  FOREIGN KEY (badge_library_id) REFERENCES badge_library(id)
);

CREATE INDEX IF NOT EXISTS idx_opponent_teams_tenant ON opponent_teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opponent_teams_status ON opponent_teams(tenant_id, status);
