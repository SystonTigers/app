-- Create match_events table for improved stats tracking
CREATE TABLE IF NOT EXISTS match_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  fixture_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'goal', 'assist', 'yellow_card', 'red_card', 'motm'
  minute INTEGER,
  created_at INTEGER NOT NULL
);

-- Index for fast lookup by fixture (for match reports)
CREATE INDEX IF NOT EXISTS idx_match_events_fixture ON match_events (tenant_id, fixture_id);

-- Index for fast lookup by player (for season stats)
CREATE INDEX IF NOT EXISTS idx_match_events_player ON match_events (tenant_id, player_id);
