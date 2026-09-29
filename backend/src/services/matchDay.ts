/**
 * Match day: today's fixtures with what the app needs on the day - kick-off
 * time, where the ground is (for the "at the match?" check each phone does
 * for itself), the live video and whether this member is at the match.
 * Match times are UK time, like the rest of the scheduler.
 */
import { ukTime } from "./social/scheduler";

type DB = { DB: D1Database; KV_IDEMP?: KVNamespace };

/** Phones within this distance of the ground count as "at the match". */
export const VENUE_RADIUS_M = 500;

export interface StreamView {
  videoId: string;
  watchUrl: string;
  embedUrl: string;
  status: "live" | "ended";
  source: "youtube" | "link";
  embeddable: boolean;
}

export interface MatchDayFixture {
  id: string;
  opponent: string;
  date: string;
  time: string | null;
  venue: string | null;
  competition: string | null;
  homeAway: "home" | "away";
  /** Kick-off as a timestamp, or null when the time isn't known */
  kickOffAt: number | null;
  matchStatus: string;
  venueLocation: { lat: number; lng: number } | null;
  stream: StreamView | null;
  attendance: { atVenue: boolean; source: "location" | "manual" } | null;
}

export interface FixtureRow {
  id: string; opponent: string; fixture_date: string; kick_off_time: string | null; venue: string | null; competition: string | null;
  home_team: string | null; away_team: string | null; venue_lat: number | null; venue_lng: number | null;
  youtube_live_id: string | null; youtube_status: string | null; stream_source: string | null; stream_embeddable: number | null;
  match_status: string | null; status: string | null;
}

export const FIXTURE_COLUMNS = `id, opponent, fixture_date, kick_off_time, venue, competition, home_team, away_team, venue_lat, venue_lng,
  youtube_live_id, youtube_status, stream_source, stream_embeddable, match_status, status`;

/** Milliseconds between UTC and UK time at this instant (0 or 1 hour). */
function ukOffsetMs(at: number): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(at)).map((x) => [x.type, x.value]));
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second)) - Math.floor(at / 1000) * 1000;
}

/** "2026-10-04" + "10:30" (UK time) as a timestamp; null if either is missing or odd. */
export function kickOffAt(date: string | null, time: string | null): number | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? "");
  const t = /^(\d{1,2}):(\d{2})/.exec(time ?? "") ?? /T(\d{2}):(\d{2})/.exec(date ?? "");
  if (!d || !t) return null;
  const naive = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  if (!Number.isFinite(naive)) return null;
  const guess = naive - ukOffsetMs(naive);
  return naive - ukOffsetMs(guess);
}

export function homeAwayOf(row: Pick<FixtureRow, "home_team" | "away_team" | "opponent">): "home" | "away" {
  return row.home_team && row.home_team === row.opponent && row.away_team !== row.opponent ? "away" : "home";
}

export function streamView(row: Pick<FixtureRow, "youtube_live_id" | "youtube_status" | "stream_source" | "stream_embeddable">): StreamView | null {
  const id = row.youtube_live_id;
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id) || !row.stream_source) return null;
  return {
    videoId: id,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`,
    status: row.youtube_status === "ended" ? "ended" : "live",
    source: row.stream_source === "youtube" ? "youtube" : "link",
    embeddable: row.stream_embeddable !== 0,
  };
}

/** Today's fixtures (UK date) for a club, not counting postponed ones. */
export async function todaysFixtureRows(env: DB, tenantId: string, now = new Date()): Promise<FixtureRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT ${FIXTURE_COLUMNS} FROM fixtures
     WHERE tenant_id = ? AND substr(fixture_date, 1, 10) = ? AND COALESCE(status, '') NOT IN ('postponed', 'cancelled')
     ORDER BY kick_off_time LIMIT 10`,
  ).bind(tenantId, ukTime(now).date).all<FixtureRow>();
  return results || [];
}

const POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i;

/** A full UK postcode in the venue text ("Memorial Park, LE7 1LA"), normalised. */
export function ukPostcode(venue: string | null): string | null {
  const m = POSTCODE.exec(venue ?? "");
  return m ? `${m[1]} ${m[2]}`.toUpperCase() : null;
}

/**
 * Work out where the ground is from a UK postcode in the venue (postcodes.io,
 * free, no key) and remember it. Failed lookups aren't retried for 6 hours.
 */
export async function locateVenue(env: DB, tenantId: string, row: FixtureRow): Promise<{ lat: number; lng: number } | null> {
  if (row.venue_lat !== null && row.venue_lng !== null) return { lat: row.venue_lat, lng: row.venue_lng };
  const postcode = ukPostcode(row.venue);
  if (!postcode) return null;
  const missKey = `geo_miss:${postcode}`;
  if (env.KV_IDEMP && (await env.KV_IDEMP.get(missKey))) return null;
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`, { headers: { accept: "application/json" } });
    const body = res.ok ? ((await res.json()) as { result?: { latitude?: number; longitude?: number } }) : null;
    const lat = body?.result?.latitude;
    const lng = body?.result?.longitude;
    if (typeof lat === "number" && typeof lng === "number") {
      await env.DB.prepare(`UPDATE fixtures SET venue_lat = ?, venue_lng = ? WHERE tenant_id = ? AND id = ? AND venue_lat IS NULL`).bind(lat, lng, tenantId, row.id).run();
      return { lat, lng };
    }
  } catch (err) {
    console.log(JSON.stringify({ event: "venue_geocode", outcome: "failed", tenant: tenantId, error: err instanceof Error ? err.message : String(err) }));
  }
  if (env.KV_IDEMP) await env.KV_IDEMP.put(missKey, "1", { expirationTtl: 6 * 3600 });
  return null;
}

export function validCoords(lat: unknown, lng: unknown): boolean {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

/** Today's fixtures as the app shows them on match day, with this member's attendance. */
export async function matchDayFor(env: DB, tenantId: string, userId: string | null, now = new Date()): Promise<MatchDayFixture[]> {
  const rows = await todaysFixtureRows(env, tenantId, now);
  if (!rows.length) return [];
  const attendance = userId
    ? await env.DB.prepare(`SELECT fixture_id, at_venue, source FROM match_attendance WHERE tenant_id = ? AND user_id = ? AND fixture_id IN (${rows.map(() => "?").join(",")})`)
      .bind(tenantId, userId, ...rows.map((r) => r.id)).all<{ fixture_id: string; at_venue: number; source: string }>()
    : { results: [] };
  const byFixture = new Map((attendance.results || []).map((a) => [a.fixture_id, a]));
  return Promise.all(rows.map(async (row) => {
    const a = byFixture.get(row.id);
    return {
      id: row.id,
      opponent: row.opponent,
      date: row.fixture_date.slice(0, 10),
      time: row.kick_off_time,
      venue: row.venue,
      competition: row.competition,
      homeAway: homeAwayOf(row),
      kickOffAt: kickOffAt(row.fixture_date, row.kick_off_time),
      matchStatus: row.match_status || "scheduled",
      venueLocation: await locateVenue(env, tenantId, row),
      stream: streamView(row),
      attendance: a ? { atVenue: a.at_venue === 1, source: a.source === "manual" ? "manual" : "location" } : null,
    };
  }));
}
