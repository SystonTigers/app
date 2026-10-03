/**
 * "As it stands": the league table with a match that's still being played
 * counted at its current score. Nothing is saved; full time does that.
 */
import { rankStandings, teamKey, type StandingRow } from "./table";

export interface LiveScore {
  ourScore: number;
  theirScore: number;
}

/** A table row, with where the team was before the live score and whether it's playing now. */
export interface LiveStandingRow extends StandingRow {
  /** Position in the saved table; null for a team that wasn't in it yet */
  was: number | null;
  playing: boolean;
}

/** Adds one result to a row (3 points for a win, 1 for a draw). */
function addResult(row: Omit<StandingRow, "position">, scored: number, conceded: number): Omit<StandingRow, "position"> {
  const won = scored > conceded ? 1 : 0;
  const drawn = scored === conceded ? 1 : 0;
  // A pasted table may only have GD: goals stay unknown, GD still moves
  const goalsFor = row.goalsFor === null ? null : row.goalsFor + scored;
  const goalsAgainst = row.goalsAgainst === null ? null : row.goalsAgainst + conceded;
  return {
    ...row,
    played: row.played + 1,
    won: row.won + won,
    drawn: row.drawn + drawn,
    lost: row.lost + (won || drawn ? 0 : 1),
    goalsFor,
    goalsAgainst,
    goalDifference: row.goalDifference + scored - conceded,
    points: row.points + won * 3 + drawn,
  };
}

function emptyRow(team: string): Omit<StandingRow, "position"> {
  return { team, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
}

/**
 * The table re-sorted with the live score counted for us and, when they're in
 * the table, the opposition. `opponent` is the league's name for them (or null
 * when we couldn't match it), so only our row changes.
 */
export function asItStands(table: StandingRow[], ourTeam: string, opponent: string | null, score: LiveScore): LiveStandingRow[] {
  const ourKey = teamKey(ourTeam);
  const theirKey = opponent ? teamKey(opponent) : null;
  const was = new Map(table.map((r) => [teamKey(r.team), r.position]));
  const rows = table.map(({ position: _position, ...r }) => r);
  if (!was.has(ourKey)) rows.push(emptyRow(ourTeam));
  if (theirKey && theirKey !== ourKey && !was.has(theirKey)) rows.push(emptyRow(opponent as string));

  const updated = rows.map((r) => {
    const key = teamKey(r.team);
    if (key === ourKey) return addResult(r, score.ourScore, score.theirScore);
    if (theirKey && key === theirKey) return addResult(r, score.theirScore, score.ourScore);
    return r;
  });
  return rankStandings(updated).map((r) => {
    const key = teamKey(r.team);
    return { ...r, was: was.get(key) ?? null, playing: key === ourKey || (!!theirKey && key === theirKey) };
  });
}

/**
 * The rows to show in a short strip: our row with the teams either side
 * (more below when we're top, more above when we're bottom).
 */
export function aroundUs<T extends { team: string }>(rows: T[], ourTeam: string, size = 5): T[] {
  const i = rows.findIndex((r) => teamKey(r.team) === teamKey(ourTeam));
  if (i < 0 || rows.length <= size) return i < 0 ? [] : rows;
  const start = Math.min(Math.max(i - Math.floor(size / 2), 0), rows.length - size);
  return rows.slice(start, start + size);
}

/** Matches our fixtures count towards the league table: no competition, "League", or the table's own name. */
export function isLeagueGame(competition: string | null | undefined, leagueCompetition: string): boolean {
  const c = (competition ?? "").trim().toLowerCase();
  return !c || c === "league" || c === leagueCompetition.trim().toLowerCase();
}
