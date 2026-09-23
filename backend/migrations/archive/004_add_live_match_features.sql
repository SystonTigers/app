-- Migration: Add Live Match Features
-- Description: Add columns for YouTube livestreams and live match updates
-- Created: 2025-10-25

-- Add YouTube livestream columns to fixtures table
ALTER TABLE fixtures ADD COLUMN youtube_live_id TEXT;
ALTER TABLE fixtures ADD COLUMN youtube_status TEXT CHECK(youtube_status IN ('live', 'upcoming', 'offline'));
ALTER TABLE fixtures ADD COLUMN youtube_scheduled_start TEXT;

-- Add live match state columns to fixtures
ALTER TABLE fixtures ADD COLUMN home_team TEXT;
ALTER TABLE fixtures ADD COLUMN away_team TEXT;
ALTER TABLE fixtures ADD COLUMN current_minute INTEGER DEFAULT 0;
ALTER TABLE fixtures ADD COLUMN home_score INTEGER DEFAULT 0;
ALTER TABLE fixtures ADD COLUMN away_score INTEGER DEFAULT 0;
ALTER TABLE fixtures ADD COLUMN match_status TEXT DEFAULT 'scheduled' CHECK(match_status IN ('scheduled', 'live', 'halftime', 'ft'));

-- Create live_updates table for match commentary
CREATE TABLE IF NOT EXISTS live_updates (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  minute INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('goal', 'card', 'subs', 'info')),
  text TEXT NOT NULL,
  scorer TEXT,
  assist TEXT,
  card TEXT CHECK(card IN ('yellow', 'red', 'sinbin')),
  player TEXT,
  score_so_far TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES fixtures(id) ON DELETE CASCADE
);

-- Create indexes for live_updates
CREATE INDEX IF NOT EXISTS idx_live_updates_match ON live_updates(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_updates_type ON live_updates(type);
CREATE INDEX IF NOT EXISTS idx_fixtures_youtube ON fixtures(youtube_status, youtube_scheduled_start);
CREATE INDEX IF NOT EXISTS idx_fixtures_match_status ON fixtures(match_status);
