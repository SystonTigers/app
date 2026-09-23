-- Migration: Add new feature tables
-- Created: 2025-11-30

-- Photo Gallery Tables
CREATE TABLE IF NOT EXISTS photo_albums (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'match', 'training', 'social', 'throwback', 'general'
    album_date TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    album_id TEXT NOT NULL,
    photo_key TEXT NOT NULL, -- R2 key
    caption TEXT,
    uploaded_by TEXT NOT NULL,
    uploaded_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (album_id) REFERENCES photo_albums(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_tenant ON photos(tenant_id);

-- Training Tables
CREATE TABLE IF NOT EXISTS training_sessions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    session_date TEXT NOT NULL,
    session_time TEXT NOT NULL,
    team TEXT NOT NULL,
    focus TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'completed', 'cancelled'
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS drills (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    duration TEXT NOT NULL,
    players TEXT NOT NULL,
    equipment TEXT NOT NULL, -- JSON array
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL, -- 'beginner', 'intermediate', 'advanced'
    focus TEXT NOT NULL, -- JSON array
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_drills (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    drill_id TEXT NOT NULL,
    duration INTEGER NOT NULL,
    notes TEXT,
    drill_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (drill_id) REFERENCES drills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_tenant ON training_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drills_tenant ON drills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_session_drills_session ON session_drills(session_id);

-- Shop Tables (Removed: Handled by 0001/019)


-- MOTM Voting Tables
CREATE TABLE IF NOT EXISTS motm_votes (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    voted_at INTEGER NOT NULL,
    UNIQUE(match_id, user_id) -- One vote per user per match
);

CREATE INDEX IF NOT EXISTS idx_motm_votes_match ON motm_votes(match_id);

-- Social Media Tables
CREATE TABLE IF NOT EXISTS social_posts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    content TEXT NOT NULL,
    platforms TEXT NOT NULL, -- JSON array: ['twitter', 'facebook', 'instagram']
    media_urls TEXT, -- JSON array
    scheduled_for INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'posted', 'failed'
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    posted_at INTEGER,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_social_posts_tenant ON social_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
