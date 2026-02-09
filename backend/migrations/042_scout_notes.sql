-- Migration 042: Scout Notes
-- Pre-match tactical intel about opponents

CREATE TABLE IF NOT EXISTS scout_notes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  fixture_id TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  
  -- Key observations
  key_players TEXT,        -- JSON: [{number, position, notes}]
  formation TEXT,          -- e.g., "4-3-3"
  strengths TEXT,          -- JSON array
  weaknesses TEXT,         -- JSON array
  set_pieces TEXT,         -- Corner/FK tactics
  
  -- General notes
  notes TEXT,
  
  -- Visibility
  visible_to_players INTEGER DEFAULT 0, -- 0 = coaches only, 1 = all
  
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_scout_notes_fixture ON scout_notes(fixture_id);
CREATE INDEX IF NOT EXISTS idx_scout_notes_tenant ON scout_notes(tenant_id);
