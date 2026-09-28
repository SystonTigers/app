import { describe, it, expect } from "vitest";
import { guessOurTeam, matchLeagueTeam, rankStandings, tableFromResults } from "../table";

describe("working out the league table", () => {
  it("orders teams level on points by goal difference, then goals scored", () => {
    const table = tableFromResults([
      { date: "2026-09-06", home: "Syston Tigers", away: "Rovers", homeScore: 5, awayScore: 0 },
      { date: "2026-09-06", home: "Oadby", away: "Birstall", homeScore: 1, awayScore: 0 },
      { date: "2026-09-13", home: "Rovers", away: "Oadby", homeScore: 1, awayScore: 1 },
      { date: "2026-09-13", home: "Birstall", away: "syston  tigers", homeScore: 2, awayScore: 2 },
    ]);
    expect(table.map((r) => [r.position, r.team, r.points, r.goalDifference])).toEqual([
      [1, "Syston Tigers", 4, 5],
      [2, "Oadby", 4, 1],
      [3, "Birstall", 1, -1],
      [4, "Rovers", 1, -5],
    ]);
    expect(table[0]).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 7, goalsAgainst: 2 });
  });

  it("re-sorts a pasted table that the league ordered on points only", () => {
    const ranked = rankStandings([
      { team: "Oadby", played: 5, won: 4, drawn: 0, lost: 1, goalsFor: 12, goalsAgainst: 4, goalDifference: 8, points: 12 },
      { team: "Syston", played: 5, won: 4, drawn: 0, lost: 1, goalsFor: 20, goalsAgainst: 5, goalDifference: 15, points: 12 },
    ]);
    expect(ranked.map((r) => [r.position, r.team])).toEqual([[1, "Syston"], [2, "Oadby"]]);
  });

  it("finds our team and matches opponents to the league's names", () => {
    const teams = ["Oadby Town U18", "Syston Town Juniors U18 Tigers", "Birstall United U18", "Syston Rangers U18"];
    expect(guessOurTeam(teams, "Syston Tigers U16")).toBe("Syston Town Juniors U18 Tigers");
    expect(guessOurTeam(teams, "Leicester Nirvana")).toBeNull();
    expect(matchLeagueTeam("Birstall", teams)).toBe("Birstall United U18");
    expect(matchLeagueTeam("Syston", teams)).toBeNull();
    expect(matchLeagueTeam("oadby town u18", teams)).toBe("Oadby Town U18");
  });
});
