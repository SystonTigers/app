-- Goal of the Month: each nomination points at the goal it's for (a Match
-- Centre or match report goal), so the app can show the minute and clip, and
-- each person gets one vote per vote (enforced by the database, so two taps at
-- once can't count twice).
ALTER TABLE gotm_candidates ADD COLUMN event_id TEXT;

DELETE FROM gotm_votes
WHERE rowid NOT IN (SELECT MIN(rowid) FROM gotm_votes GROUP BY voting_id, user_id);

DROP INDEX IF EXISTS idx_gotm_votes_voting_user;
CREATE UNIQUE INDEX IF NOT EXISTS idx_gotm_votes_voting_user ON gotm_votes(voting_id, user_id);
CREATE INDEX IF NOT EXISTS idx_gotm_candidates_tenant_voting ON gotm_candidates(tenant_id, voting_id);
