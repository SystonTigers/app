-- 0008_lineups_and_match_times.sql
-- Starting line-ups (5, 7, 9 or 11-a-side) and exact tap times for match events.

-- When the manager tapped, from their phone. Used for the match clock and to
-- line match footage up with kick-off, half time, goals and so on.
ALTER TABLE live_match_events ADD COLUMN occurred_at INTEGER;

-- Team size: a club default, and per match when an age group plays differently
ALTER TABLE tenants ADD COLUMN default_team_size INTEGER NOT NULL DEFAULT 11;
ALTER TABLE fixtures ADD COLUMN team_size INTEGER;

CREATE TABLE IF NOT EXISTS match_lineups (
    tenant_id TEXT NOT NULL,
    fixture_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    role TEXT NOT NULL,               -- 'starter' | 'sub'
    sort INTEGER NOT NULL DEFAULT 0,  -- order on the team sheet
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (tenant_id, fixture_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_match_lineups_fixture ON match_lineups(tenant_id, fixture_id);
