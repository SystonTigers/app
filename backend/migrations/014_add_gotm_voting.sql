-- Goal of the Month Voting Tables

-- Voting sessions
CREATE TABLE IF NOT EXISTS gotm_voting (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Goal candidates for voting
CREATE TABLE IF NOT EXISTS gotm_candidates (
    id TEXT PRIMARY KEY,
    voting_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    match_id TEXT,
    description TEXT,
    video_url TEXT,
    votes INTEGER DEFAULT 0,
    FOREIGN KEY (voting_id) REFERENCES gotm_voting(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Individual votes (to prevent double-voting)
CREATE TABLE IF NOT EXISTS gotm_votes (
    id TEXT PRIMARY KEY,
    voting_id TEXT NOT NULL,
    candidate_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (voting_id) REFERENCES gotm_voting(id),
    FOREIGN KEY (candidate_id) REFERENCES gotm_candidates(id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_gotm_voting_tenant ON gotm_voting(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gotm_candidates_voting ON gotm_candidates(voting_id);
CREATE INDEX IF NOT EXISTS idx_gotm_votes_voting_user ON gotm_votes(voting_id, user_id);
