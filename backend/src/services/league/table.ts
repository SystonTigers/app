/**
 * Our league table: worked out from results, or re-sorted from a pasted table.
 * Order: points, then goal difference, then goals scored, then name.
 */

export interface MatchResult {
  date: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

export interface StandingRow {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDifference: number;
  points: number;
}

/** A key that treats "Rovers U18" and "rovers  u18." as the same team. */
export function teamKey(name: string): string {
  return name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Sort by points, goal difference, goals scored, then name, and number the positions. */
export function rankStandings<T extends Omit<StandingRow, "position">>(rows: T[]): Array<T & { position: number }> {
  return [...rows]
    .sort((a, b) =>
      b.points - a.points
      || b.goalDifference - a.goalDifference
      || (b.goalsFor ?? 0) - (a.goalsFor ?? 0)
      || a.team.localeCompare(b.team))
    .map((row, i) => ({ ...row, position: i + 1 }));
}

/** The table from a set of results (3 points for a win, 1 for a draw). */
export function tableFromResults(results: MatchResult[], points = { win: 3, draw: 1 }): StandingRow[] {
  const teams = new Map<string, Omit<StandingRow, "position"> & { goalsFor: number; goalsAgainst: number }>();
  const row = (name: string) => {
    const key = teamKey(name);
    let r = teams.get(key);
    if (!r) {
      r = { team: name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
      teams.set(key, r);
    }
    return r;
  };
  for (const m of results) {
    const home = row(m.home);
    const away = row(m.away);
    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.won++;
      away.lost++;
      home.points += points.win;
    } else if (m.homeScore < m.awayScore) {
      away.won++;
      home.lost++;
      away.points += points.win;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += points.draw;
      away.points += points.draw;
    }
  }
  return rankStandings([...teams.values()].map((t) => ({ ...t, goalDifference: t.goalsFor - t.goalsAgainst })));
}

/**
 * Which league team name is ours: the saved one, or the team whose name shares
 * the most words with the club's name (e.g. "Syston Tigers" → "Syston Town Juniors U18 Tigers").
 */
export function guessOurTeam(teams: string[], clubName: string): string | null {
  const words = teamKey(clubName).split(" ").filter((w) => w.length >= 3 && !/^u\d+$/.test(w));
  let best: { team: string; score: number } | null = null;
  for (const team of teams) {
    const key = ` ${teamKey(team)} `;
    const score = words.filter((w) => key.includes(` ${w} `)).length;
    if (score > 0 && (!best || score > best.score)) best = { team, score };
  }
  return best?.team ?? null;
}

/**
 * The league name for an opponent as we have it in fixtures ("Rovers") →
 * the league's spelling ("Rovers FC U18") when there's exactly one match.
 */
export function matchLeagueTeam(opponent: string, teams: string[]): string | null {
  const key = teamKey(opponent);
  const exact = teams.find((t) => teamKey(t) === key);
  if (exact) return exact;
  const loose = teams.filter((t) => ` ${teamKey(t)} `.includes(` ${key} `) || ` ${key} `.includes(` ${teamKey(t)} `));
  return loose.length === 1 ? loose[0] : null;
}
