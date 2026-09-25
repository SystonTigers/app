-- 0006_live_match.sql
-- Live match updates from the touchline. The match state (score, half, clock)
-- is worked out from these events, so undoing an event fixes everything.

CREATE TABLE IF NOT EXISTS live_match_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    fixture_id TEXT NOT NULL,
    -- kick_off, half_time, second_half, full_time, goal, opp_goal, yellow, red, sub, note
    type TEXT NOT NULL,
    minute INTEGER,
    player_id TEXT,          -- scorer / booked player / player coming on
    player_name TEXT,
    player2_id TEXT,         -- assist / player going off
    player2_name TEXT,
    text TEXT,               -- note, or opposition scorer
    client_event_id TEXT NOT NULL, -- sent by the app so a retried tap isn't recorded twice
    created_by TEXT,
    created_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_events_client ON live_match_events(tenant_id, client_event_id);
CREATE INDEX IF NOT EXISTS idx_live_events_fixture ON live_match_events(tenant_id, fixture_id, created_at);
-- Each phase (kick off, half time...) can only happen once per match
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_events_phase ON live_match_events(tenant_id, fixture_id, type)
    WHERE deleted_at IS NULL AND type IN ('kick_off', 'half_time', 'second_half', 'full_time');

-- Results recorded at full time point back to their fixture, so undoing
-- full time removes the result again.
ALTER TABLE team_results ADD COLUMN fixture_id TEXT;
CREATE INDEX IF NOT EXISTS idx_team_results_fixture ON team_results(tenant_id, fixture_id);
