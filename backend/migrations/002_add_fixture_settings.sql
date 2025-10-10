-- Migration: Add Fixture Settings Table
-- Description: Store team-specific fixture configuration (team name, FA URLs, etc.)
-- Created: 2025-10-10

-- Fixture settings table - stores per-tenant configuration for fixture syncing
CREATE TABLE IF NOT EXISTS fixture_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  fa_website_url TEXT,

  -- FA provides different snippet codes for each
  fa_snippet_fixtures_url TEXT,
  fa_snippet_results_url TEXT,
  fa_snippet_table_url TEXT,
  fa_snippet_team_fixtures_url TEXT,

  sync_enabled INTEGER DEFAULT 1,
  sync_interval_minutes INTEGER DEFAULT 5,

  -- Calendar integration
  calendar_id TEXT,
  calendar_enabled INTEGER DEFAULT 0,

  -- Email integration
  gmail_search_query TEXT,
  gmail_label TEXT,
  email_sync_enabled INTEGER DEFAULT 1,

  -- Match day intelligent scheduling
  match_day_boost_enabled INTEGER DEFAULT 1,
  match_day_boost_interval_minutes INTEGER DEFAULT 1, -- Check every minute during matches
  typical_kick_off_time TEXT DEFAULT '14:00', -- Typical match start time

  -- Game format configuration (for calculating accurate boost mode timing)
  age_group TEXT DEFAULT 'U16', -- e.g., U16, U14, U12, U10
  game_size TEXT DEFAULT '11v11', -- e.g., 11v11, 9v9, 7v7, 5v5
  half_length INTEGER DEFAULT 40, -- Minutes per half (e.g., 40, 30, 25, 20)
  quarter_length INTEGER, -- Minutes per quarter (for younger age groups that play quarters)

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast tenant lookup
CREATE INDEX IF NOT EXISTS idx_fixture_settings_tenant ON fixture_settings(tenant_id);

-- Insert default settings for main tenant
INSERT OR IGNORE INTO fixture_settings (
  tenant_id,
  team_name,
  fa_website_url,
  sync_enabled
) VALUES (
  'default',
  'Shepshed Dynamo Youth U16',
  'https://fulltime-league.thefa.com/index.html?selectedSeason=497929314&selectedFixtureGroupKey=1_697306213',
  1
);
