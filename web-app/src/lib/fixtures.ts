/**
 * Which of the club's fixtures are live, coming up or done, for the public
 * pages. Fixtures come from /public/:club/fixtures (`status` is scheduled,
 * live, completed, postponed or cancelled; `date` is an ISO time).
 *
 * A fixture's own status can say "live" long after the game (staff opened
 * Match Centre and never pressed full time), so the club pages only call a
 * match live when Match Centre's /public/:club/live feed says so. That feed
 * already leaves out matches running for over 4 hours.
 */
import { ukDay } from './format';

export interface PublicFixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time?: string;
  venue?: string | null;
  competition?: string | null;
  status?: string;
  homeScore?: number;
  awayScore?: number;
}

/** A match from /public/:club/live (Match Centre). */
export interface LiveFeedMatch {
  opponent: string;
  homeAway: string;
  status: string;
  minute: number | null;
  ourScore: number;
  theirScore: number;
}

/** Where a fixture stands for people looking at the club page. */
export type FixtureState = 'live' | 'finished' | 'awaiting' | 'upcoming' | 'postponed' | 'cancelled';

const LIVE = new Set(['live', 'half_time', 'halftime', 'in_progress']);
const DONE = new Set(['completed', 'full_time', 'finished', 'cancelled']);

/** The fixture's own status says live. Not proof it is: see liveMatchFor. */
export function isLive(f: Pick<PublicFixture, 'status'>): boolean {
  return LIVE.has(String(f.status ?? '').toLowerCase());
}

export function isFinished(f: Pick<PublicFixture, 'status'>): boolean {
  return DONE.has(String(f.status ?? '').toLowerCase());
}

const norm = (s: string | null | undefined) => String(s ?? '').trim().toLowerCase();

/** Match Centre's live entry for this fixture (same opponent, still playing), or null. */
export function liveMatchFor<M extends LiveFeedMatch>(f: Pick<PublicFixture, 'homeTeam' | 'awayTeam'>, live: M[]): M | null {
  const teams = [norm(f.homeTeam), norm(f.awayTeam)];
  return live.find((m) => LIVE.has(norm(m.status)) && teams.includes(norm(m.opponent))) ?? null;
}

/** Kick-off has passed: the typed time if there is one, otherwise the day has gone. */
export function hasKickedOff(f: Pick<PublicFixture, 'date' | 'time'>, now: Date = new Date()): boolean {
  if (kickOffText(f)) {
    const at = new Date(f.date).getTime();
    return !Number.isNaN(at) && at <= now.getTime();
  }
  return ukDay(f.date) < ukDay(now);
}

/**
 * Live only when Match Centre says so; a game whose kick-off has passed with
 * no result (whatever its own status says) is "awaiting" its result.
 */
export function fixtureState(f: PublicFixture, live: LiveFeedMatch[] = [], now: Date = new Date()): FixtureState {
  const status = norm(f.status);
  if (status === 'cancelled') return 'cancelled';
  if (isFinished(f) || f.homeScore !== undefined || f.awayScore !== undefined) return 'finished';
  if (liveMatchFor(f, live)) return 'live';
  if (status === 'postponed') return 'postponed';
  return hasKickedOff(f, now) ? 'awaiting' : 'upcoming';
}

/** Not played yet: kick-off still to come and no result (postponed ones stay so people see it). */
export function upcomingFixtures<T extends PublicFixture>(fixtures: T[], now: Date = new Date()): T[] {
  return fixtures
    .filter((f) => {
      const state = fixtureState(f, [], now);
      return state === 'upcoming' || (state === 'postponed' && ukDay(f.date) >= ukDay(now));
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/** The next game that will actually be played (not postponed), or null. */
export function nextFixture<T extends PublicFixture>(fixtures: T[], now: Date = new Date()): T | null {
  return upcomingFixtures(fixtures, now).find((f) => norm(f.status) !== 'postponed') ?? null;
}

export function liveFixtures<T extends PublicFixture>(fixtures: T[], live: LiveFeedMatch[] = []): T[] {
  return fixtures.filter((f) => fixtureState(f, live) === 'live');
}

/** The kick-off time to show: the time the club typed ("10:30"), else none. */
export function kickOffText(f: Pick<PublicFixture, 'time'>): string {
  const t = (f.time ?? '').trim();
  return /^\d{1,2}:\d{2}/.test(t) ? t.slice(0, 5) : '';
}
