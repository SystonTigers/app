/**
 * Results screen helpers: the season summary, the add/edit form and dates.
 * Kept free of React so `node test/results.test.js` can check them.
 */

export interface ResultLike {
  homeScore: number;
  awayScore: number;
  points?: number;
}

export interface SeasonSummary {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

/** Played, won, drawn, lost, goals and points for a list of our results (homeScore is always ours). */
export function seasonSummary(results: ResultLike[]): SeasonSummary {
  const s: SeasonSummary = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
  for (const r of results) {
    const us = Number(r.homeScore) || 0;
    const them = Number(r.awayScore) || 0;
    s.played += 1;
    s.goalsFor += us;
    s.goalsAgainst += them;
    if (us > them) s.won += 1;
    else if (us === them) s.drawn += 1;
    else s.lost += 1;
    s.points += typeof r.points === 'number' ? r.points : us > them ? 3 : us === them ? 1 : 0;
  }
  return s;
}

/**
 * FA Full-Time code snippets only ever show the league's current season, so they
 * belong under the current season (or All time). Under a past season they would
 * show this season's games as if they were that season's.
 */
export function showsFaSnippets(seasonId: string | null, isCurrent: boolean): boolean {
  return seasonId === null || seasonId === 'all' || isCurrent;
}

export type Outcome = 'W' | 'D' | 'L';

export function outcome(us: number, them: number): Outcome {
  return us > them ? 'W' : us === them ? 'D' : 'L';
}

/** "Sun 14 Sep 2025" from "2025-09-14" (any time part is ignored). */
export function resultDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export interface ResultForm {
  date: string;
  opponent: string;
  ourScore: string;
  theirScore: string;
  venue: string;
  competition: string;
  /**
   * Scorers picked from the squad (one id per goal) and own goals. null until
   * staff change them, so editing a result doesn't touch its scorers.
   */
  picks: GoalPicks | null;
}

export interface GoalPicks {
  scorerIds: string[];
  ownGoals: number;
}

export const COMPETITIONS = ['League', 'Cup', 'Friendly'] as const;

/** YYYY-MM-DD in the phone's own time zone */
export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function emptyResultForm(today: Date = new Date()): ResultForm {
  return { date: localDay(today), opponent: '', ourScore: '', theirScore: '', venue: '', competition: 'League', picks: null };
}

/** Accepts 2025-09-14, 14/09/2025 or 14/9/25 and gives YYYY-MM-DD, or null. */
export function normaliseResultDate(value: string): string | null {
  const v = value.trim();
  let y: number; let m: number; let d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  const uk = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(v);
  if (iso) {
    [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (uk) {
    [d, m, y] = [Number(uk[1]), Number(uk[2]), Number(uk[3])];
    if (y < 100) y += 2000;
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

export interface CheckedResult {
  date: string;
  opponent: string;
  ourScore: number;
  theirScore: number;
  venue: string | null;
  competition: string;
  /** Only sent when staff picked or changed the scorers */
  scorerIds?: string[];
  ownGoals?: number;
}

/** Checks the form the same way the server does; returns the result to send or a message to show. */
export function checkResultForm(form: ResultForm, today: Date = new Date()): CheckedResult | string {
  const date = normaliseResultDate(form.date);
  if (!date) return 'Enter the match date, for example 14/09/2025.';
  if (date > localDay(today)) return "A result can't be in the future.";
  const opponent = form.opponent.trim().replace(/\s+/g, ' ');
  if (!opponent) return 'Enter who you played.';
  if (opponent.length > 80) return 'Keep the opponent under 80 characters.';
  const ours = form.ourScore.trim();
  const theirs = form.theirScore.trim();
  if (!/^\d{1,2}$/.test(ours) || !/^\d{1,2}$/.test(theirs)) return 'Enter both scores as whole numbers.';
  const picked = form.picks ? form.picks.scorerIds.length + form.picks.ownGoals : 0;
  if (picked > Number(ours)) return `You've picked ${picked} scorers but we only scored ${Number(ours)}.`;
  return {
    date,
    opponent,
    ourScore: Number(ours),
    theirScore: Number(theirs),
    venue: form.venue.trim() ? form.venue.trim().slice(0, 120) : null,
    competition: form.competition.trim() || 'League',
    ...(form.picks ? { scorerIds: form.picks.scorerIds, ownGoals: form.picks.ownGoals } : {}),
  };
}

/** Picked scorers as chips: each player once with their goals, in the order they were picked. */
export function scorerChips(ids: string[], names: Map<string, string>): Array<{ id: string; name: string; goals: number }> {
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return Array.from(counts, ([id, goals]) => ({ id, name: names.get(id) ?? 'Removed player', goals }));
}

/** The picks with one goal taken off this player. */
export function removeOneGoal(picks: GoalPicks, id: string): GoalPicks {
  const i = picks.scorerIds.lastIndexOf(id);
  return i < 0 ? picks : { ...picks, scorerIds: [...picks.scorerIds.slice(0, i), ...picks.scorerIds.slice(i + 1)] };
}
