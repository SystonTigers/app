/**
 * Live match data: loading events and fixtures, describing a match for the
 * app, and recording (or undoing) the result at full time.
 * Every query is scoped to one club (tenant_id).
 */
import { outcomeFromScores } from "./results";
import { computeState, matchMinute, type LiveEvent, type LiveEventType, type LiveState } from "./liveMatchState";

type DB = { DB: D1Database };

export interface LiveFixture {
  id: string;
  opponent: string;
  date: string;
  time: string | null;
  venue: string | null;
  competition: string | null;
  homeAway: "home" | "away";
}

interface EventRow {
  id: string;
  type: LiveEventType;
  minute: number | null;
  player_id: string | null;
  player_name: string | null;
  player2_id: string | null;
  player2_name: string | null;
  text: string | null;
  created_at: number;
}

export async function loadFixture(env: DB, tenantId: string, fixtureId: string): Promise<LiveFixture | null> {
  const f = await env.DB.prepare(
    `SELECT id, opponent, fixture_date, kick_off_time, venue, competition, home_team, away_team
     FROM fixtures WHERE tenant_id = ? AND id = ?`,
  ).bind(tenantId, fixtureId).first<Record<string, string | null>>();
  if (!f) return null;
  return {
    id: String(f.id),
    opponent: String(f.opponent),
    date: String(f.fixture_date),
    time: f.kick_off_time,
    venue: f.venue,
    competition: f.competition,
    // Same rule as the fixtures list: we're away when the home team is the opponent
    homeAway: f.home_team && f.home_team === f.opponent && f.away_team !== f.opponent ? "away" : "home",
  };
}

/** Non-deleted events, oldest first. */
export async function loadEvents(env: DB, tenantId: string, fixtureId: string): Promise<LiveEvent[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, type, minute, player_id, player_name, player2_id, player2_name, text,
            COALESCE(occurred_at, created_at) AS created_at
     FROM live_match_events WHERE tenant_id = ? AND fixture_id = ? AND deleted_at IS NULL
     ORDER BY COALESCE(occurred_at, created_at), rowid`,
  ).bind(tenantId, fixtureId).all<EventRow>();
  return (results || []).map((r) => ({
    id: r.id,
    type: r.type,
    minute: r.minute,
    playerId: r.player_id,
    playerName: r.player_name,
    player2Id: r.player2_id,
    player2Name: r.player2_name,
    text: r.text,
    createdAt: r.created_at,
  }));
}

export interface LiveMatchView extends LiveState {
  fixture: LiveFixture;
  minute: number | null;
  /** Newest first */
  events: LiveEvent[];
}

export function describeMatch(fixture: LiveFixture, events: LiveEvent[], now = Date.now()): LiveMatchView {
  const state = computeState(events);
  return { fixture, ...state, minute: matchMinute(state, now), events: [...events].reverse() };
}

/** Fixtures with live activity in the last 12 hours. */
export async function recentLiveFixtureIds(env: DB, tenantId: string, now = Date.now()): Promise<string[]> {
  const { results } = await env.DB.prepare(
    `SELECT fixture_id, MAX(created_at) AS last FROM live_match_events
     WHERE tenant_id = ? AND deleted_at IS NULL AND created_at > ?
     GROUP BY fixture_id ORDER BY last DESC LIMIT 10`,
  ).bind(tenantId, now - 12 * 3600_000).all<{ fixture_id: string }>();
  return (results || []).map((r) => r.fixture_id);
}

/** "Alfie Smith 2, Ben Jones" from our goal events. */
export function scorersText(events: LiveEvent[]): string | null {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.type === "goal") {
      const name = e.playerName || "Unknown";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return counts.size ? [...counts].map(([name, n]) => (n > 1 ? `${name} ${n}` : name)).join(", ") : null;
}

const STAT_EVENTS: Partial<Record<LiveEventType, string>> = { goal: "goal", yellow: "yellow_card", red: "red_card" };

/**
 * Full time: save the result (results page, league table) and players' goals,
 * assists and cards (stats), and mark the fixture completed. Safe to repeat.
 */
export async function recordFullTime(env: DB, tenantId: string, fixture: LiveFixture, events: LiveEvent[]): Promise<void> {
  const state = computeState(events);
  const { result, points } = outcomeFromScores(state.ourScore, state.theirScore);
  const [homeScore, awayScore] = fixture.homeAway === "home" ? [state.ourScore, state.theirScore] : [state.theirScore, state.ourScore];
  const now = Date.now();

  const statements = [
    env.DB.prepare(
      `INSERT INTO team_results (tenant_id, match_date, opponent, venue, competition, our_score, their_score, result, points, scorers, source, fixture_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', ?)
       ON CONFLICT(tenant_id, match_date, opponent) DO UPDATE SET
         our_score = excluded.our_score, their_score = excluded.their_score, result = excluded.result,
         points = excluded.points, scorers = excluded.scorers, source = 'live', fixture_id = excluded.fixture_id`,
    ).bind(
      tenantId, fixture.date.slice(0, 10), fixture.opponent, fixture.venue || "TBC", fixture.competition || "League",
      state.ourScore, state.theirScore, result, points, scorersText(events), fixture.id,
    ),
    env.DB.prepare(`DELETE FROM match_events WHERE tenant_id = ? AND fixture_id = ? AND id LIKE 'live-%'`).bind(tenantId, fixture.id),
    env.DB.prepare(
      `UPDATE fixtures SET status = 'completed', match_status = 'full_time', home_score = ?, away_score = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE tenant_id = ? AND id = ?`,
    ).bind(homeScore, awayScore, tenantId, fixture.id),
  ];

  const insertStat = (id: string, playerId: string, type: string, minute: number | null) =>
    env.DB.prepare(
      `INSERT OR IGNORE INTO match_events (id, tenant_id, fixture_id, player_id, event_type, minute, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, tenantId, fixture.id, playerId, type, minute, now);

  for (const e of events) {
    const statType = STAT_EVENTS[e.type];
    if (statType && e.playerId) statements.push(insertStat(`live-${e.id}`, e.playerId, statType, e.minute));
    if (e.type === "goal" && e.player2Id) statements.push(insertStat(`live-${e.id}-assist`, e.player2Id, "assist", e.minute));
  }
  await env.DB.batch(statements);
}

/** Undoing full time takes the result and stats back out and reopens the fixture. */
export async function revertFullTime(env: DB, tenantId: string, fixtureId: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM team_results WHERE tenant_id = ? AND fixture_id = ?`).bind(tenantId, fixtureId),
    env.DB.prepare(`DELETE FROM match_events WHERE tenant_id = ? AND fixture_id = ? AND id LIKE 'live-%'`).bind(tenantId, fixtureId),
    env.DB.prepare(
      `UPDATE fixtures SET status = 'scheduled', match_status = 'live', home_score = NULL, away_score = NULL,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE tenant_id = ? AND id = ?`,
    ).bind(tenantId, fixtureId),
  ]);
}

/** Keep fixtures.match_status in step for anything that reads it. */
export async function setMatchStatus(env: DB, tenantId: string, fixtureId: string, status: string): Promise<void> {
  await env.DB.prepare(`UPDATE fixtures SET match_status = ? WHERE tenant_id = ? AND id = ?`).bind(status, tenantId, fixtureId).run();
}
