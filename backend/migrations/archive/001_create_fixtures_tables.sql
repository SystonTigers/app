-- Migration: Create Fixtures and Results Tables
-- Description: Add tables for storing fixture schedules and match results
-- Created: 2025-10-10

-- Fixtures table - stores upcoming and past fixture schedules
CREATE TABLE IF NOT EXISTS fixtures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fixture_date TEXT NOT NULL,
  opponent TEXT NOT NULL,
  venue TEXT,
  competition TEXT,
  kick_off_time TEXT,
  status TEXT DEFAULT 'scheduled',
  source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fixture_date, opponent)
);

-- Results table - stores completed match results
CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_date TEXT NOT NULL,
  opponent TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  venue TEXT,
  competition TEXT,
  scorers TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(match_date, opponent)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fixtures_date ON fixtures(fixture_date);
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON fixtures(status);
CREATE INDEX IF NOT EXISTS idx_results_date ON results(match_date DESC);
