import { describe, it, expect } from "vitest";
import { aroundUs, asItStands, isLeagueGame } from "../live";
import type { StandingRow } from "../table";

const row = (position: number, team: string, points: number, gd: number, gf: number | null = 10): StandingRow => ({
  position, team, played: 5, won: 0, drawn: 0, lost: 0, goalsFor: gf, goalsAgainst: gf === null ? null : gf - gd, goalDifference: gd, points,
});

const TABLE: StandingRow[] = [
  row(1, "Anstey Nomads U18", 12, 8),
  row(2, "Oadby Town U18", 10, 4),
  row(3, "Syston Tigers", 9, 3),
  row(4, "Birstall United U18", 7, -1),
  row(5, "Wigston U18", 3, -14),
];

describe("league table as it stands", () => {
  it("counts a live win for us and a loss for the opposition, and re-sorts", () => {
    const rows = asItStands(TABLE, "Syston Tigers", "Oadby Town U18", { ourScore: 2, theirScore: 0 });
    // Syston 12 pts (+5) go above Oadby but stay below Anstey (12 pts, +8)
    expect(rows.map((r) => [r.position, r.team, r.points, r.goalDifference, r.was, r.playing])).toEqual([
      [1, "Anstey Nomads U18", 12, 8, 1, false],
      [2, "Syston Tigers", 12, 5, 3, true],
      [3, "Oadby Town U18", 10, 2, 2, true],
      [4, "Birstall United U18", 7, -1, 4, false],
      [5, "Wigston U18", 3, -14, 5, false],
    ]);
  });

  it("orders level points by goal difference", () => {
    const rows = asItStands(TABLE, "Syston Tigers", "Wigston U18", { ourScore: 7, theirScore: 0 });
    // 12 points each; Syston's GD +10 beats Anstey's +8
    expect(rows.slice(0, 2).map((r) => [r.team, r.points, r.goalDifference])).toEqual([["Syston Tigers", 12, 10], ["Anstey Nomads U18", 12, 8]]);
    expect(rows[0]).toMatchObject({ played: 6, won: 1, goalsFor: 17, goalsAgainst: 7, was: 3 });
    expect(rows.find((r) => r.team === "Wigston U18")).toMatchObject({ played: 6, lost: 1, points: 3, goalDifference: -21 });
  });

  it("gives both sides a point for a draw and leaves the saved table alone", () => {
    const before = JSON.stringify(TABLE);
    const rows = asItStands(TABLE, "Syston Tigers", "Birstall United U18", { ourScore: 1, theirScore: 1 });
    expect(rows.find((r) => r.team === "Syston Tigers")).toMatchObject({ points: 10, drawn: 1 });
    expect(rows.find((r) => r.team === "Birstall United U18")).toMatchObject({ points: 8, drawn: 1 });
    expect(JSON.stringify(TABLE)).toBe(before);
  });

  it("only changes our row when the opposition isn't in the table", () => {
    const rows = asItStands(TABLE, "Syston Tigers", null, { ourScore: 0, theirScore: 3 });
    expect(rows.filter((r) => r.playing).map((r) => r.team)).toEqual(["Syston Tigers"]);
    expect(rows.find((r) => r.team === "Syston Tigers")).toMatchObject({ lost: 1, points: 9, goalDifference: 0, position: 3 });
    expect(rows).toHaveLength(5);
  });

  it("keeps unknown goals unknown in a pasted table but still moves goal difference", () => {
    const pasted = TABLE.map((r) => ({ ...r, goalsFor: null, goalsAgainst: null }));
    const us = asItStands(pasted, "Syston Tigers", "Oadby Town U18", { ourScore: 3, theirScore: 1 }).find((r) => r.team === "Syston Tigers");
    expect(us).toMatchObject({ goalsFor: null, goalsAgainst: null, goalDifference: 5, points: 12 });
  });

  it("matches team names loosely (case and punctuation)", () => {
    const rows = asItStands(TABLE, "syston tigers.", "OADBY TOWN U18", { ourScore: 1, theirScore: 0 });
    expect(rows.filter((r) => r.playing).map((r) => r.team).sort()).toEqual(["Oadby Town U18", "Syston Tigers"]);
  });
});

describe("the teams around us", () => {
  const teams = Array.from({ length: 10 }, (_, i) => ({ team: `Team ${i + 1}` }));
  it("centres on our row", () => expect(aroundUs(teams, "Team 5").map((t) => t.team)).toEqual(["Team 3", "Team 4", "Team 5", "Team 6", "Team 7"]));
  it("shows more below when we're top", () => expect(aroundUs(teams, "Team 1").map((t) => t.team)).toEqual(["Team 1", "Team 2", "Team 3", "Team 4", "Team 5"]));
  it("shows more above when we're bottom", () => expect(aroundUs(teams, "Team 10").map((t) => t.team)).toEqual(["Team 6", "Team 7", "Team 8", "Team 9", "Team 10"]));
  it("shows a short league whole, and nothing when we aren't in it", () => {
    expect(aroundUs(teams.slice(0, 3), "Team 2")).toHaveLength(3);
    expect(aroundUs(teams, "Nobody")).toEqual([]);
  });
});

describe("which games count for the league", () => {
  it("counts league games and ones with no competition, not cups", () => {
    expect(isLeagueGame(null, "U18 League")).toBe(true);
    expect(isLeagueGame("League", "U18 League")).toBe(true);
    expect(isLeagueGame("u18 league ", "U18 League")).toBe(true);
    expect(isLeagueGame("County Cup", "U18 League")).toBe(false);
    expect(isLeagueGame("Friendly", "League")).toBe(false);
  });
});
