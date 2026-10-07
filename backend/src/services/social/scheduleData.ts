/**
 * What the scheduled club posts read: UK time, fixtures and results in a date
 * range, and players (with photos only where consent allows). Shared by the
 * weekly schedule (scheduler.ts) and the monthly round-ups (roundups.ts).
 */
import { opponentBadgeUrl } from "../opponentBadges";
import { graphicPhotoSql } from "../consent";
import { tracksAssists } from "../clubOptions";
import type { SocialEnv } from "./club";
import type { FixtureFacts, ResultFacts } from "./clubPosts";

export interface UkTime { date: string; hour: number; minute: number; weekday: number }

/** The date, hour and weekday (0 = Sunday) in the UK. */
export function ukTime(now: Date): UkTime {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  }).formatToParts(now).map((p) => [p.type, p.value]));
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute), weekday };
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "September 2026" from "2026-09". */
export function monthLabel(yearMonth: string): string {
  return `${MONTHS[Number(yearMonth.slice(5, 7)) - 1]} ${yearMonth.slice(0, 4)}`;
}

/** The last day of the month a date is in. */
export function monthEnd(iso: string): string {
  const d = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0));
  return d.toISOString().slice(0, 10);
}

export interface FixtureRow { id: string; opponent: string; fixture_date: string; kick_off_time: string | null; venue: string | null; competition: string | null; home_team: string | null; away_team: string | null }

export async function fixtureFacts(env: SocialEnv, tenantId: string, r: FixtureRow): Promise<FixtureFacts> {
  return {
    id: r.id, opponent: r.opponent, opponentBadgeUrl: await opponentBadgeUrl(env, tenantId, r.opponent),
    homeAway: r.home_team && r.home_team === r.opponent && r.away_team !== r.opponent ? "away" : "home",
    date: r.fixture_date.slice(0, 10), time: r.kick_off_time, venue: r.venue, competition: r.competition,
  };
}

/**
 * Fixtures in a date range. "postponed" only returns ones changed in the last
 * week, so turning this on doesn't announce old postponements.
 */
export async function fixturesBetween(env: SocialEnv, tenantId: string, from: string, to: string, status: "live" | "postponed"): Promise<FixtureRow[]> {
  const filter = status === "postponed"
    ? `status = 'postponed' AND substr(COALESCE(updated_at, ''), 1, 10) >= ?`
    : `COALESCE(status, 'scheduled') NOT IN ('postponed', 'cancelled', 'completed') AND ? = ?`;
  const { results } = await env.DB.prepare(
    `SELECT id, opponent, fixture_date, kick_off_time, venue, competition, home_team, away_team FROM fixtures
     WHERE tenant_id = ? AND substr(fixture_date, 1, 10) BETWEEN ? AND ? AND ${filter} ORDER BY fixture_date, kick_off_time LIMIT 12`,
  ).bind(tenantId, from, to, ...(status === "postponed" ? [addDays(from, -7)] : [1, 1])).all<FixtureRow>();
  return results || [];
}

export async function person(env: SocialEnv, tenantId: string, playerId: string): Promise<{ name: string; photoUrl: string | null } | null> {
  const row = await env.DB.prepare(`SELECT name, ${graphicPhotoSql()} AS photo FROM squad WHERE tenant_id = ? AND id = ?`)
    .bind(tenantId, playerId).first<{ name: string; photo: string | null }>();
  return row ? { name: row.name, photoUrl: row.photo } : null;
}

/** Top player by goals ×5, assists ×3 (when the club records them), MOTM ×10 between two times (ms). */
export async function topPlayer(env: SocialEnv, tenantId: string, from: number, to: number) {
  const assistWeight = (await tracksAssists(env, tenantId)) ? 3 : 0;
  const { results } = await env.DB.prepare(
    `SELECT player_id, SUM(event_type = 'goal') AS goals, SUM(event_type = 'assist') AS assists, SUM(event_type = 'motm') AS motm
     FROM match_events WHERE tenant_id = ? AND player_id IS NOT NULL AND created_at >= ? AND created_at < ?
     GROUP BY player_id ORDER BY SUM(event_type = 'goal') * 5 + SUM(event_type = 'assist') * ? + SUM(event_type = 'motm') * 10 DESC LIMIT 1`,
  ).bind(tenantId, from, to, assistWeight).all<{ player_id: string; goals: number; assists: number; motm: number }>();
  const top = results?.[0];
  const assists = assistWeight ? Number(top?.assists ?? 0) : 0;
  if (!top || top.goals * 5 + assists * 3 + top.motm * 10 === 0) return null;
  const p = await person(env, tenantId, top.player_id);
  return p ? { ...p, goals: Number(top.goals), assists, motm: Number(top.motm), playerId: top.player_id } : null;
}

/** Our results between two dates (inclusive), oldest first. */
export async function resultsBetween(env: SocialEnv, tenantId: string, from: string, to: string, limit = 8): Promise<ResultFacts[]> {
  const { results } = await env.DB.prepare(
    `SELECT r.match_date, r.opponent, r.our_score, r.their_score, r.competition, f.home_team, f.away_team
     FROM team_results r LEFT JOIN fixtures f ON f.id = r.fixture_id AND f.tenant_id = r.tenant_id
     WHERE r.tenant_id = ? AND substr(r.match_date, 1, 10) BETWEEN ? AND ? ORDER BY r.match_date LIMIT ?`,
  ).bind(tenantId, from, to, limit).all<{ match_date: string; opponent: string; our_score: number; their_score: number; competition: string | null; home_team: string | null; away_team: string | null }>();
  return Promise.all((results ?? []).map(async (r) => ({
    date: r.match_date.slice(0, 10), opponent: r.opponent, opponentBadgeUrl: await opponentBadgeUrl(env, tenantId, r.opponent),
    homeAway: (r.home_team && r.home_team === r.opponent && r.away_team !== r.opponent ? "away" : "home") as "home" | "away",
    ourScore: Number(r.our_score), theirScore: Number(r.their_score), competition: r.competition,
  })));
}
