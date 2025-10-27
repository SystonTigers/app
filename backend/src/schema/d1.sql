-- Teams & Users
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  badge_url TEXT,
  colors_json TEXT,
  slogan TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  plan TEXT NOT NULL DEFAULT 'starter',
  team_code TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  role TEXT NOT NULL, -- manager/parent/player
  team_id TEXT,
  FOREIGN KEY(team_id) REFERENCES teams(id)
);

-- Matches & Events
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  date_utc INTEGER NOT NULL,
  venue TEXT,
  lat REAL, lon REAL,
  status TEXT DEFAULT 'scheduled',
  FOREIGN KEY(team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  type TEXT NOT NULL, -- goal/assist/card_yellow/card_red/sin_bin/sub/note
  minute INTEGER,
  player_id TEXT,
  assist_id TEXT,
  payload_json TEXT,
  ts INTEGER NOT NULL,
  FOREIGN KEY(match_id) REFERENCES matches(id)
);
