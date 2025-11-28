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

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Calendar Events & RSVPs
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  location TEXT,
  description TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS event_rsvps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL, -- yes, no, maybe
  created_at INTEGER NOT NULL,
  FOREIGN KEY(event_id) REFERENCES calendar_events(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(event_id, user_id)
);
