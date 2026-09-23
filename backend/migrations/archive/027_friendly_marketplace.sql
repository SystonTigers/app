-- Migration 027: Friendly Matchmaking Marketplace
-- Cross-tenant feature for teams to find friendly match opponents

-- Friendly requests posted by teams
CREATE TABLE IF NOT EXISTS friendly_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  preferred_dates TEXT,           -- JSON array of date options
  location_pref TEXT DEFAULT 'any', -- 'home', 'away', 'neutral', 'any'
  age_group TEXT,                 -- 'U11', 'U14', 'Adult', etc.
  skill_level TEXT,               -- 'recreational', 'competitive', 'semi-pro'
  kit_colors TEXT,                -- Primary kit colors e.g. "red/white"
  max_travel_miles INTEGER,       -- Max distance willing to travel
  pitch_type TEXT,                -- 'grass', '3g', '4g', 'any'
  notes TEXT,
  contact_info TEXT,              -- Optional contact details
  status TEXT DEFAULT 'open',     -- 'open', 'matched', 'expired', 'cancelled'
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_friendly_requests_status ON friendly_requests(status);
CREATE INDEX IF NOT EXISTS idx_friendly_requests_tenant ON friendly_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_friendly_requests_age ON friendly_requests(age_group, status);

-- Match requests between teams (when someone wants to play)
CREATE TABLE IF NOT EXISTS friendly_matches (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  requester_tenant_id TEXT NOT NULL,  -- Team requesting to play
  requester_team_name TEXT NOT NULL,
  host_tenant_id TEXT NOT NULL,       -- Team who posted the request
  proposed_date TEXT,
  proposed_venue TEXT,
  proposed_kickoff TEXT,              -- e.g. "14:00"
  message TEXT,
  status TEXT DEFAULT 'pending',      -- 'pending', 'accepted', 'declined', 'cancelled'
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (request_id) REFERENCES friendly_requests(id)
);

CREATE INDEX IF NOT EXISTS idx_friendly_matches_request ON friendly_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_friendly_matches_host ON friendly_matches(host_tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_friendly_matches_requester ON friendly_matches(requester_tenant_id);
