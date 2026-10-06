/**
 * Our record against one opponent, for the Home screen's next match card.
 *
 * Names are written differently in different places: the FA's fixture says
 * "Thurmaston Magpies U18 Thunder", the manager's old spreadsheet says
 * "Thurmaston Magpies". `sameOpponent` treats those as the same team, but not
 * "Thurmaston Magpies Lightning" (a different side of the same club).
 */

/** Words that don't tell two teams apart: age groups, "FC", "Juniors" and the like. */
const NOISE = new Set(["fc", "afc", "jfc", "cfc", "f", "c", "football", "club", "juniors", "junior", "jnrs", "jnr", "youth", "the", "and"]);

/** The words that identify a team: "Thurmaston Magpies U18 Thunder FC" → thurmaston, magpies, thunder. */
export function opponentWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !NOISE.has(w) && !/^u\d{1,2}s?$/.test(w) && !/^under$/.test(w) && !/^\d{1,2}s?$/.test(w));
}

/**
 * Whether two names are the same opponent: the same words, or one name is the
 * other with extra words (a team suffix like "Thunder"). Needs at least one
 * real word in common, so "FC" never matches everything.
 */
export function sameOpponent(a: string, b: string): boolean {
  const wa = opponentWords(a);
  const wb = opponentWords(b);
  if (!wa.length || !wb.length) return false;
  const [short, long] = wa.length <= wb.length ? [wa, new Set(wb)] : [wb, new Set(wa)];
  return short.every((w) => long.has(w));
}

export interface PastMeeting {
  id: number;
  date: string;
  opponent: string;
  ourScore: number;
  theirScore: number;
  competition: string | null;
  scorers: string | null;
  homeAway: "home" | "away" | null;
}

export interface HeadToHead {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Newest first, at most `limit` */
  meetings: PastMeeting[];
}

/** Our record from the matches against this opponent (any order in, newest first out). */
export function headToHead(opponent: string, results: PastMeeting[], limit = 5): HeadToHead {
  const mine = results
    .filter((r) => sameOpponent(opponent, r.opponent))
    .sort((x, y) => y.date.localeCompare(x.date));
  const out: HeadToHead = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, meetings: mine.slice(0, limit) };
  for (const r of mine) {
    out.played += 1;
    out.goalsFor += r.ourScore;
    out.goalsAgainst += r.theirScore;
    if (r.ourScore > r.theirScore) out.won += 1;
    else if (r.ourScore === r.theirScore) out.drawn += 1;
    else out.lost += 1;
  }
  return out;
}
