-- Migration: Auth User Player Links
-- Allows a single user (email) to be linked to multiple players in the same or different tenants

CREATE TABLE IF NOT EXISTS auth_user_players (
  user_id TEXT NOT NULL,       -- FK to auth_users.id
  player_id TEXT NOT NULL,     -- FK to players.id
  tenant_id TEXT NOT NULL,     -- Denormalized for speed
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, player_id),
  FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aup_player ON auth_user_players(player_id);
CREATE INDEX IF NOT EXISTS idx_aup_user ON auth_user_players(user_id);
