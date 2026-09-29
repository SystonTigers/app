/**
 * Match day types and decisions shared by the live video pop-up, the "at the
 * match?" check and Match Centre. No react-native imports, so it can be tested
 * in Node (test/matchDay.test.js).
 */

export interface MatchDayStream {
  videoId: string;
  watchUrl: string;
  embedUrl: string;
  status: 'live' | 'ended';
  source: 'youtube' | 'link';
  /** False when the channel blocks playing it inside other apps: open YouTube instead */
  embeddable: boolean;
}

export interface MatchDayFixture {
  id: string;
  opponent: string;
  date: string;
  time: string | null;
  venue: string | null;
  competition: string | null;
  homeAway: 'home' | 'away';
  kickOffAt: number | null;
  matchStatus: string;
  venueLocation: { lat: number; lng: number } | null;
  stream: MatchDayStream | null;
  attendance: { atVenue: boolean; source: 'location' | 'manual' } | null;
}

export interface MatchDay {
  fixtures: MatchDayFixture[];
  radiusMeters: number;
  webPushKey: string | null;
}

export interface Position {
  lat: number;
  lng: number;
  /** Metres (how sure the phone is) */
  accuracy: number | null;
}

const MIN = 60_000;
/** When phones check whether their owner is at the ground */
export const CHECK_FROM_MS = 60 * MIN;
export const CHECK_UNTIL_MS = 150 * MIN;
/** Readings vaguer than this can't tell "at the ground" from "nearby" */
const MAX_USEFUL_ACCURACY_M = 1000;

/** Distance in metres between two points (haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * true = at the ground, false = somewhere else, null = can't tell (reading too
 * vague, or the ground's location isn't known). Only a clear answer is sent.
 */
export function atVenueFrom(position: Position, venue: { lat: number; lng: number } | null, radiusMeters: number): boolean | null {
  if (!venue) return null;
  const accuracy = position.accuracy ?? 0;
  if (accuracy > MAX_USEFUL_ACCURACY_M) return null;
  const d = distanceMeters(position, venue);
  if (d <= radiusMeters && accuracy <= radiusMeters) return true;
  if (d - accuracy > radiusMeters) return false;
  return null;
}

/** Is it time to check where this person is for this match? */
export function shouldCheckLocation(f: MatchDayFixture, now: number): boolean {
  if (!f.venueLocation || f.attendance?.source === 'manual' || f.matchStatus === 'full_time') return false;
  if (f.kickOffAt === null) return true;
  return now >= f.kickOffAt - CHECK_FROM_MS && now <= f.kickOffAt + CHECK_UNTIL_MS;
}

/** The first fixture that needs a location check now, if any. */
export function fixtureToCheck(day: MatchDay | null, now: number): MatchDayFixture | null {
  return day?.fixtures.find((f) => shouldCheckLocation(f, now)) ?? null;
}

/**
 * The match to pop the live video up for: streaming now, not over, not already
 * closed by this person, and they're not at the ground watching it for real.
 */
export function popupFixture(day: MatchDay | null, dismissed: readonly string[]): MatchDayFixture | null {
  return day?.fixtures.find((f) =>
    f.stream?.status === 'live'
    && f.matchStatus !== 'full_time'
    && !f.attendance?.atVenue
    && !dismissed.includes(f.stream.videoId),
  ) ?? null;
}

/** How often to ask the server for match day news: every minute on the day, rarely otherwise. */
export function pollInterval(day: MatchDay | null): number {
  return day?.fixtures.length ? MIN : 10 * MIN;
}

/** "Syston Tigers v Rovers" with the home team first. */
export function fixtureTitle(f: Pick<MatchDayFixture, 'opponent' | 'homeAway'>, clubName: string): string {
  return f.homeAway === 'home' ? `${clubName} v ${f.opponent}` : `${f.opponent} v ${clubName}`;
}

/**
 * HTML for playing a YouTube stream inside the phone app's web view. YouTube
 * refuses to play embeds with no referrer, so the page gets a base URL.
 */
export function playerDocument(embedUrl: string): string {
  const src = embedUrl.replace(/"/g, '&quot;');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin">`
    + `<style>html,body{margin:0;height:100%;background:#000}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head>`
    + `<body><iframe src="${src}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`;
}
