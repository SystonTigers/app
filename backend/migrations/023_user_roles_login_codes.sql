-- Migration: User Roles & Login Codes System
-- Adds login codes, contact fields, and user sessions for role-based access

-- Login codes table (player codes, coach codes, fan code per team)
CREATE TABLE IF NOT EXISTS login_codes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    code TEXT NOT NULL,
    code_type TEXT NOT NULL CHECK (code_type IN ('player', 'coach', 'fan')),
    player_id TEXT, -- Links to player for player codes, NULL for coach/fan
    label TEXT, -- Display name (e.g., "Coach Sarah" for coach codes)
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(code)
);

-- User sessions table (tracks logged-in users)
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    code_id TEXT, -- Which code was used to login
    email TEXT, -- For fans who login with email
    role TEXT NOT NULL CHECK (role IN ('manager', 'coach', 'parent', 'player', 'fan')),
    player_id TEXT, -- Which player this session is for (if applicable)
    display_name TEXT,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (code_id) REFERENCES login_codes(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Add contact fields to players table (3 flexible contacts with relationship dropdown)
-- Relationship options: mum, dad, step-mum, step-dad, grandparent, guardian, other
ALTER TABLE players ADD COLUMN login_code TEXT;
ALTER TABLE players ADD COLUMN contact1_relationship TEXT;
ALTER TABLE players ADD COLUMN contact1_name TEXT;
ALTER TABLE players ADD COLUMN contact1_phone TEXT;
ALTER TABLE players ADD COLUMN contact1_email TEXT;
ALTER TABLE players ADD COLUMN contact2_relationship TEXT;
ALTER TABLE players ADD COLUMN contact2_name TEXT;
ALTER TABLE players ADD COLUMN contact2_phone TEXT;
ALTER TABLE players ADD COLUMN contact2_email TEXT;
ALTER TABLE players ADD COLUMN contact3_relationship TEXT;
ALTER TABLE players ADD COLUMN contact3_name TEXT;
ALTER TABLE players ADD COLUMN contact3_phone TEXT;
ALTER TABLE players ADD COLUMN contact3_email TEXT;

-- Add team fan code to tenants (one per team)
ALTER TABLE tenants ADD COLUMN fan_code TEXT;

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_login_codes_tenant ON login_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_login_codes_code ON login_codes(code);
CREATE INDEX IF NOT EXISTS idx_login_codes_player ON login_codes(player_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant ON user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_players_login_code ON players(login_code);

-- Discussion group memberships for auto-assignment
CREATE TABLE IF NOT EXISTS discussion_group_types (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    group_type TEXT NOT NULL CHECK (group_type IN ('main', 'coaches', 'players')),
    discussion_category_id TEXT, -- Links to discussion_categories
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, group_type)
);
