/**
 * Training Centre helpers: which sessions are coming up, session length and
 * the drill of the week (drills by reference: utils/drills.ts). No react-native imports (node test/training.test.js).
 */
import { DRILLS_LIBRARY, type Drill } from '../data/drillsData';

export interface SessionLike {
  session_date: string;
  session_time: string;
}

/** yyyy-mm-dd in the phone's own time zone */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const sortKey = (s: SessionLike) => `${s.session_date.slice(0, 10)} ${s.session_time || '99:99'}`;

/** Today's and future sessions (soonest first), and past ones (latest first). */
export function splitSessions<T extends SessionLike>(sessions: T[], now: Date = new Date()): { upcoming: T[]; past: T[] } {
  const today = localDay(now);
  const upcoming = sessions.filter((s) => s.session_date.slice(0, 10) >= today).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const past = sessions.filter((s) => s.session_date.slice(0, 10) < today).sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
  return { upcoming, past };
}

/** "Tuesday 7 Oct" (with the year when it isn't this year) */
export function sessionDay(date: string, now: Date = new Date()): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
  if (!m) return date;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC',
    ...(Number(m[1]) !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

/** Total minutes of a list of drills ("15 mins", "10-15 mins" counts the first number). */
export function totalMinutes(drills: Array<Pick<Drill, 'duration'>>): number {
  return drills.reduce((sum, d) => sum + (Number(/\d+/.exec(d.duration)?.[0]) || 0), 0);
}

/** A different drill each week (Monday to Sunday), the same for everyone. */
export function drillOfTheWeek(now: Date = new Date(), library: Drill[] = DRILLS_LIBRARY): Drill {
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  // 1 Jan 1970 was a Thursday; shift so weeks start on Monday
  const week = Math.floor((day + 3) / 7);
  const pool = library.filter((d) => d.category !== 'Warm-up' && d.category !== 'Cool-down');
  const list = pool.length ? pool : library;
  return list[week % list.length];
}
