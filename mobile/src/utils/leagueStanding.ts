/**
 * Our league standing for the Home box (position, P W D L F A GD Pts), from
 * our own table or from the FA's table snippet, and a team's matches picked
 * out of the FA's results snippet. The FA's snippets are read as they're shown
 * on the phone, so columns are found by their headings, with the usual FA
 * layouts as a fallback. No react-native imports (tested in Node).
 */
import type { LeagueRow } from './leagueTable';

export interface Standing {
  position: number | null;
  team: string;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDifference: number | null;
  points: number | null;
}

type Key = 'position' | 'played' | 'won' | 'drawn' | 'lost' | 'goalsFor' | 'goalsAgainst' | 'goalDifference' | 'points';

/** Column headings the FA (and leagues' own sites) use, matched whole. */
const HEADINGS: Array<[Key, RegExp]> = [
  ['position', /^(pos|position|#|no\.?)$/],
  ['played', /^(p|pl|pld|played|gp|mp)$/],
  ['won', /^(w|won|wins)$/],
  ['drawn', /^(d|drawn|draws|drn)$/],
  ['lost', /^(l|lost|losses)$/],
  ['goalsFor', /^(f|gf|for|goals for)$/],
  ['goalsAgainst', /^(a|ga|against|goals against)$/],
  ['goalDifference', /^(gd|\+\/-|diff|goal difference|g\.d\.)$/],
  ['points', /^(pts|points|pt)$/],
];

/** Numbers in the order the FA shows them, by how many there are after the team name. */
const LAYOUTS: Record<number, Key[]> = {
  5: ['played', 'won', 'drawn', 'lost', 'points'],
  6: ['played', 'won', 'drawn', 'lost', 'goalDifference', 'points'],
  8: ['played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'goalDifference', 'points'],
};

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const isNumber = (s: string) => /^[+-−]?\d+$/.test(clean(s));
const toNumber = (s: string) => Number(clean(s).replace('−', '-'));
const hasLetters = (s: string) => /[a-z]{2}/i.test(s);

function empty(team: string): Standing {
  return { position: null, team, played: null, won: null, drawn: null, lost: null, goalsFor: null, goalsAgainst: null, goalDifference: null, points: null };
}

/** Our row from our own table (league snapshot). */
export function standingFromRow(row: LeagueRow): Standing {
  return {
    position: row.position, team: row.team, played: row.played, won: row.won, drawn: row.drawn, lost: row.lost,
    goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst, goalDifference: row.goalDifference, points: row.points,
  };
}

/** Our row as the FA's table snippet shows it: its headings and cells. Null if it can't be read. */
export function standingFromFa(headers: string[], cells: string[]): Standing | null {
  const teamAt = cells.findIndex(hasLetters);
  if (teamAt < 0) return null;
  const out = empty(clean(cells[teamAt]));
  const keys = headers.map((h) => HEADINGS.find(([, re]) => re.test(clean(h).toLowerCase()))?.[0] ?? null);
  const byHeading = headers.length === cells.length && keys.some((k) => k && k !== 'position');
  if (byHeading) {
    keys.forEach((key, i) => { if (key && isNumber(cells[i])) out[key] = toNumber(cells[i]); });
  } else {
    // No usable headings: position before the name, then the numbers in the FA's usual order
    const before = cells.slice(0, teamAt).filter(isNumber);
    if (before.length) out.position = toNumber(before[before.length - 1]);
    const after = cells.slice(teamAt + 1).filter(isNumber).map(toNumber);
    const layout = LAYOUTS[after.length];
    if (!layout) return null;
    layout.forEach((key, i) => { out[key] = after[i]; });
  }
  if (out.position === null) {
    const first = cells.slice(0, teamAt).find(isNumber);
    if (first !== undefined) out.position = toNumber(first);
  }
  if (out.goalDifference === null && out.goalsFor !== null && out.goalsAgainst !== null) out.goalDifference = out.goalsFor - out.goalsAgainst;
  return out.played === null && out.points === null ? null : out;
}

const SCORE = /^(\d{1,2})\s*[-–—:]\s*(\d{1,2})$/;
const sameTeam = (a: string, b: string) => clean(a).toLowerCase() === clean(b).toLowerCase();

/**
 * Goals for and against from a team's matches in the FA's results snippet
 * (each match as its cells). A match counts when it has a score and the team
 * on one side of it; postponed ("P - P") and walkovers have no score and are left out.
 */
export function goalsFromMatches(matches: string[][], team: string): { played: number; goalsFor: number; goalsAgainst: number } {
  let played = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const raw of matches) {
    const cells = raw.map(clean);
    const at = cells.findIndex((c) => sameTeam(c, team));
    if (at < 0) continue;
    let home: number | null = null;
    let away: number | null = null;
    let scoreAt = cells.findIndex((c) => SCORE.test(c));
    if (scoreAt >= 0) {
      const m = SCORE.exec(cells[scoreAt]);
      if (m) { home = Number(m[1]); away = Number(m[2]); }
    } else {
      // The score split across two cells between the teams: "Team A | 2 | 1 | Team B"
      for (let i = 0; i + 1 < cells.length; i++) {
        if (/^\d{1,2}$/.test(cells[i]) && /^\d{1,2}$/.test(cells[i + 1]) && hasLetters(cells[i - 1] ?? '') && hasLetters(cells[i + 2] ?? '')) {
          home = Number(cells[i]); away = Number(cells[i + 1]); scoreAt = i;
          break;
        }
      }
    }
    if (home === null || away === null || scoreAt < 0) continue;
    const weAreHome = at < scoreAt;
    played += 1;
    goalsFor += weAreHome ? home : away;
    goalsAgainst += weAreHome ? away : home;
  }
  return { played, goalsFor, goalsAgainst };
}

/**
 * Fills in goals the FA's table doesn't show, from the results, but only when
 * the results cover every game the table counts (otherwise they'd be wrong).
 */
export function withGoals(standing: Standing, goals: { played: number; goalsFor: number; goalsAgainst: number } | null): Standing {
  if (standing.goalsFor !== null && standing.goalsAgainst !== null) return standing;
  if (!goals || standing.played === null || goals.played !== standing.played) return standing;
  return { ...standing, goalsFor: goals.goalsFor, goalsAgainst: goals.goalsAgainst, goalDifference: goals.goalsFor - goals.goalsAgainst };
}

/** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}
