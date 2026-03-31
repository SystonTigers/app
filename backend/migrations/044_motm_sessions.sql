-- Migration 044: Add MOTM Sessions Table
-- Stores the state of Man of the Match voting sessions associated with a match.

CREATE TABLE IF NOT EXISTS motm_sessions (
    match_id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT DEFAULT 'draft', -- draft, active, closed
    voting_start_at DATETIME,
    voting_end_at DATETIME,
    auto_post BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    -- Note: We rely on application-level integrity for match_id 
    -- as it could map to fixtures or team_results depending on maturity
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_motm_sessions_tenant ON motm_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_motm_sessions_status ON motm_sessions(status);
