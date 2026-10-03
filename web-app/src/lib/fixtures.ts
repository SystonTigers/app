/**
 * Which of the club's fixtures are live, coming up or done, for the public
 * pages. Fixtures come from /public/:club/fixtures (`status` is scheduled,
 * live, completed, postponed or cancelled; `date` is an ISO time).
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

const LIVE = new Set(['live', 'half_time', 'halftime', 'in_progress']);
const DONE = new Set(['completed', 'full_time', 'finished', 'cancelled']);

export function isLive(f: Pick<PublicFixture, 'status'>): boolean {
  return LIVE.has(String(f.status ?? '').toLowerCase());
}

export function isFinished(f: Pick<PublicFixture, 'status'>): boolean {
  return DONE.has(String(f.status ?? '').toLowerCase());
}

/** Not played yet: today's or later, not live, not finished (postponed ones stay so people see it). */
export function upcomingFixtures<T extends PublicFixture>(fixtures: T[], now: Date = new Date()): T[] {
  const today = ukDay(now);
  return fixtures
    .filter((f) => !isLive(f) && !isFinished(f) && ukDay(f.date) >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function liveFixtures<T extends PublicFixture>(fixtures: T[]): T[] {
  return fixtures.filter(isLive);
}

/** The kick-off time to show: the time the club typed ("10:30"), else none. */
export function kickOffText(f: Pick<PublicFixture, 'time'>): string {
  const t = (f.time ?? '').trim();
  return /^\d{1,2}:\d{2}/.test(t) ? t.slice(0, 5) : '';
}
