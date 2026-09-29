/**
 * Putting fixtures from FA Full-Time emails into the club's fixture list.
 * Safe to run on the same email twice: a fixture that's already there is
 * updated (new date, time, ground or status) rather than added again.
 */
import { guessOurTeam, matchLeagueTeam, teamKey } from "../league/table";
import { loadLeagueSettings, type LeagueDb } from "../league/store";
import type { FaEmailFixture } from "./parse";

type DB = { DB: D1Database };

export type FaImportAction = "added" | "updated" | "unchanged" | "not_ours" | "skipped";

export interface FaImportLine {
  date: string;
  time: string | null;
  opponent: string;
  homeAway: "home" | "away";
  status: FaEmailFixture["status"];
  action: FaImportAction;
  /** What changed, e.g. ["date", "venue"] */
  changes: string[];
}

export interface FaImportSummary {
  found: number;
  added: number;
  updated: number;
  unchanged: number;
  notOurs: number;
  lines: FaImportLine[];
}

interface FixtureRow {
  id: string;
  fixture_date: string;
  kick_off_time: string | null;
  opponent: string;
  home_team: string | null;
  away_team: string | null;
  venue: string | null;
  competition: string | null;
  status: string | null;
  fa_fixture_id: string | null;
}

const sameTeam = (a: string, b: string) => teamKey(a) === teamKey(b) || matchLeagueTeam(a, [b]) !== null;
const homeAwayOf = (f: FixtureRow): "home" | "away" => (f.home_team && f.home_team === f.opponent && f.away_team !== f.opponent ? "away" : "home");

/** Which side is ours: the league team set in League Table settings, else the name closest to the club's. */
export function ourSide(fixture: Pick<FaEmailFixture, "homeTeam" | "awayTeam">, clubName: string, ourLeagueTeam: string | null): "home" | "away" | null {
  if (ourLeagueTeam) {
    if (teamKey(fixture.homeTeam) === teamKey(ourLeagueTeam)) return "home";
    if (teamKey(fixture.awayTeam) === teamKey(ourLeagueTeam)) return "away";
  }
  const guess = guessOurTeam([fixture.homeTeam, fixture.awayTeam], clubName);
  if (!guess) return null;
  return guess === fixture.homeTeam ? "home" : "away";
}

/** The fixture this email is about, if we have it already. */
function findExisting(rows: FixtureRow[], f: FaEmailFixture, opponent: string, homeAway: "home" | "away", today: string): FixtureRow | null {
  if (f.faFixtureId) {
    const byId = rows.find((r) => r.fa_fixture_id === f.faFixtureId);
    if (byId) return byId;
  }
  const sameDay = rows.find((r) => r.fixture_date.slice(0, 10) === f.date && sameTeam(r.opponent, opponent));
  if (sameDay) return sameDay;
  // Moved to a new date: the one unplayed match against them at the same end (home/away)
  const moved = rows.filter((r) => r.status !== "completed" && r.status !== "cancelled" && sameTeam(r.opponent, opponent) && homeAwayOf(r) === homeAway
    && (r.status === "postponed" || r.fixture_date.slice(0, 10) >= today) && !r.fa_fixture_id);
  return moved.length === 1 ? moved[0] : null;
}

export async function importFaFixtures(env: DB, tenantId: string, fixtures: FaEmailFixture[], now = new Date()): Promise<FaImportSummary> {
  const summary: FaImportSummary = { found: fixtures.length, added: 0, updated: 0, unchanged: 0, notOurs: 0, lines: [] };
  if (!fixtures.length) return summary;
  const tenant = await env.DB.prepare(`SELECT name FROM tenants WHERE id = ?`).bind(tenantId).first<{ name: string }>();
  const clubName = tenant?.name ?? "";
  const settings = await loadLeagueSettings(env.DB as unknown as LeagueDb, tenantId, now);
  const today = now.toISOString().slice(0, 10);
  const since = new Date(now.getTime() - 400 * 86_400_000).toISOString().slice(0, 10);
  const { results } = await env.DB.prepare(
    `SELECT id, fixture_date, kick_off_time, opponent, home_team, away_team, venue, competition, status, fa_fixture_id
     FROM fixtures WHERE tenant_id = ? AND substr(fixture_date, 1, 10) >= ?`,
  ).bind(tenantId, since).all<FixtureRow>();
  const rows = results ?? [];
  const stamp = now.toISOString();

  for (const f of fixtures) {
    const side = ourSide(f, clubName, settings.ourTeam);
    const opponent = side === "home" ? f.awayTeam : side === "away" ? f.homeTeam : "";
    const line: FaImportLine = { date: f.date, time: f.time, opponent, homeAway: side ?? "home", status: f.status, action: "not_ours", changes: [] };
    summary.lines.push(line);
    if (!side) {
      summary.notOurs++;
      continue;
    }
    const existing = findExisting(rows, f, opponent, side, today);

    if (!existing) {
      // Never add a match the email says is off
      if (f.status === "cancelled") {
        line.action = "skipped";
        continue;
      }
      const id = crypto.randomUUID();
      const ourName = clubName || (side === "home" ? f.homeTeam : f.awayTeam);
      const [home, away] = side === "home" ? [ourName, opponent] : [opponent, ourName];
      await env.DB.prepare(
        `INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, venue, competition, status, home_team, away_team, source, fa_fixture_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fa_email', ?, ?, ?)
         ON CONFLICT(tenant_id, fixture_date, home_team, away_team) DO NOTHING`,
      ).bind(id, tenantId, f.date, f.time, opponent, f.venue, f.competition, f.status, home, away, f.faFixtureId, stamp, stamp).run();
      rows.push({ id, fixture_date: f.date, kick_off_time: f.time, opponent, home_team: home, away_team: away, venue: f.venue, competition: f.competition, status: f.status, fa_fixture_id: f.faFixtureId });
      line.action = "added";
      summary.added++;
      continue;
    }

    // A match that's been played isn't changed by later emails
    if (existing.status === "completed") {
      line.action = "unchanged";
      summary.unchanged++;
      continue;
    }
    const sets: string[] = [];
    const binds: Array<string | null> = [];
    const change = (column: string, label: string, value: string | null) => {
      sets.push(`${column} = ?`);
      binds.push(value);
      if (label) line.changes.push(label);
    };
    if (existing.fixture_date.slice(0, 10) !== f.date) change("fixture_date", "date", f.date);
    if (f.time && existing.kick_off_time !== f.time) change("kick_off_time", "time", f.time);
    if (f.venue && teamKey(existing.venue ?? "") !== teamKey(f.venue)) {
      change("venue", "ground", f.venue);
      sets.push("venue_lat = NULL", "venue_lng = NULL"); // work the new ground's location out again
    }
    if (f.competition && !existing.competition) change("competition", "competition", f.competition);
    if ((existing.status ?? "scheduled") !== f.status) change("status", f.status === "scheduled" ? "back on" : f.status, f.status);
    if (f.faFixtureId && existing.fa_fixture_id !== f.faFixtureId) change("fa_fixture_id", "", f.faFixtureId);

    if (!sets.length) {
      line.action = "unchanged";
      summary.unchanged++;
      continue;
    }
    // updated_at: a newly postponed match gets its "postponed" post from the scheduler
    await env.DB.prepare(`UPDATE fixtures SET ${sets.join(", ")}, updated_at = ? WHERE tenant_id = ? AND id = ?`)
      .bind(...binds, stamp, tenantId, existing.id).run();
    Object.assign(existing, { fixture_date: f.date, kick_off_time: f.time ?? existing.kick_off_time, venue: f.venue ?? existing.venue, status: f.status, fa_fixture_id: f.faFixtureId ?? existing.fa_fixture_id });
    line.action = line.changes.length ? "updated" : "unchanged";
    if (line.action === "updated") summary.updated++;
    else summary.unchanged++;
  }
  console.log(JSON.stringify({ level: "info", msg: "fa_email_import", tenantId, found: summary.found, added: summary.added, updated: summary.updated, notOurs: summary.notOurs }));
  return summary;
}
