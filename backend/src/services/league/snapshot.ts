/**
 * The league at a glance for members: our row with the teams around us and,
 * while one of our league games is being played, the table as it stands.
 */
import { computeState } from "../liveMatchState";
import { loadEvents, loadFixture, recentLiveFixtureIds } from "../liveMatch";
import { aroundUs, asItStands, isLeagueGame, type LiveStandingRow } from "./live";
import { guessOurTeam, matchLeagueTeam, teamKey, type StandingRow } from "./table";
import { loadLeagueSettings, type LeagueDb } from "./store";

type Env = { DB: D1Database };

export interface LiveTable {
  fixtureId: string;
  opponent: string;
  /** The league's name for the opposition, or null when they aren't in the table */
  opponentTeam: string | null;
  status: "live" | "half_time";
  ourScore: number;
  theirScore: number;
  rows: LiveStandingRow[];
}

export interface LeagueSnapshot {
  competition: string;
  /** Our name in the table, or null when we can't find ourselves in it */
  ourTeam: string | null;
  /** "results": worked out from results; "table": a pasted table, re-sorted */
  source: "results" | "table";
  rows: StandingRow[];
  /** Our row and the teams either side */
  around: StandingRow[];
  live: LiveTable | null;
}

async function loadTable(env: Env, tenantId: string): Promise<StandingRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT position, team_name, played, won, drawn, lost, goals_for, goals_against, goal_difference, points
     FROM league_standings WHERE tenant_id = ? ORDER BY COALESCE(position, 999), points DESC`,
  ).bind(tenantId).all<Record<string, unknown>>();
  return (results ?? []).map((r, i) => ({
    position: Number(r.position ?? i + 1) || i + 1,
    team: String(r.team_name ?? ""),
    played: Number(r.played ?? 0),
    won: Number(r.won ?? 0),
    drawn: Number(r.drawn ?? 0),
    lost: Number(r.lost ?? 0),
    goalsFor: r.goals_for === null || r.goals_for === undefined ? null : Number(r.goals_for),
    goalsAgainst: r.goals_against === null || r.goals_against === undefined ? null : Number(r.goals_against),
    goalDifference: Number(r.goal_difference ?? (Number(r.goals_for ?? 0) - Number(r.goals_against ?? 0))),
    points: Number(r.points ?? 0),
  })).filter((r) => r.team);
}

/** The first of our league games being played right now, at its current score. */
async function liveLeagueGame(env: Env, tenantId: string, competition: string, now: number) {
  for (const id of await recentLiveFixtureIds(env, tenantId, now)) {
    const fixture = await loadFixture(env, tenantId, id);
    if (!fixture || !isLeagueGame(fixture.competition, competition)) continue;
    const state = computeState(await loadEvents(env, tenantId, id));
    if (state.status === "live" || state.status === "half_time") return { fixture, state, status: state.status };
  }
  return null;
}

export async function leagueSnapshot(env: Env, tenantId: string, now = Date.now()): Promise<LeagueSnapshot> {
  const db = env.DB as unknown as LeagueDb;
  const [settings, rows, club] = await Promise.all([
    loadLeagueSettings(db, tenantId, new Date(now)),
    loadTable(env, tenantId),
    env.DB.prepare(`SELECT name FROM tenants WHERE id = ?`).bind(tenantId).first<{ name: string | null }>(),
  ]);
  const teams = rows.map((r) => r.team);
  const saved = settings.ourTeam ? teams.find((t) => teamKey(t) === teamKey(settings.ourTeam as string)) : undefined;
  const ourTeam = saved ?? guessOurTeam(teams, club?.name ?? "") ?? null;
  const snapshot: LeagueSnapshot = {
    competition: settings.competition,
    ourTeam,
    source: settings.mode,
    rows,
    around: ourTeam ? aroundUs(rows, ourTeam) : [],
    live: null,
  };
  // An "as it stands" table needs a real table and us in it
  if (!ourTeam || rows.length < 2) return snapshot;

  const game = await liveLeagueGame(env, tenantId, settings.competition, now);
  if (!game) return snapshot;
  const opponentTeam = matchLeagueTeam(game.fixture.opponent, teams.filter((t) => teamKey(t) !== teamKey(ourTeam)));
  snapshot.live = {
    fixtureId: game.fixture.id,
    opponent: game.fixture.opponent,
    opponentTeam,
    status: game.status,
    ourScore: game.state.ourScore,
    theirScore: game.state.theirScore,
    rows: asItStands(rows, ourTeam, opponentTeam, game.state),
  };
  return snapshot;
}
