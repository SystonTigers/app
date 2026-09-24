-- 0004_motm_nominees.sql
-- Man of the Match voting end to end:
--  * managers pick nominees for a match (motm_nominees)
--  * votes carry the club (tenant_id) so results can't leak across clubs
--  * closing a vote stores the winner(s) so the club page can show them

CREATE TABLE IF NOT EXISTS motm_nominees (
    tenant_id TEXT NOT NULL,
    match_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    PRIMARY KEY (tenant_id, match_id, player_id)
);

ALTER TABLE motm_votes ADD COLUMN tenant_id TEXT;
ALTER TABLE motm_sessions ADD COLUMN winner_player_ids TEXT; -- JSON array; more than one on a tie
ALTER TABLE motm_sessions ADD COLUMN closed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_motm_sessions_tenant_status ON motm_sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_motm_votes_tenant_match ON motm_votes(tenant_id, match_id);
