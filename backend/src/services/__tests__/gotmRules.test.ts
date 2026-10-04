import { describe, it, expect } from "vitest";
import { monthLabel, monthRange, readMonth, readNewVote, winnersOf } from "../gotm/rules";

const goal = (playerId: string, extra: Record<string, unknown> = {}) => ({ playerId, ...extra });

describe("Goal of the Month rules", () => {
  it("reads the month in either form", () => {
    expect(readMonth("2026-09", null)).toEqual({ month: 9, year: 2026 });
    expect(readMonth("September", 2026)).toEqual({ month: 9, year: 2026 });
    expect(readMonth("9", "2026")).toEqual({ month: 9, year: 2026 });
    expect(readMonth("2026-13", null)).toBeNull();
    expect(readMonth("Septembre", 2026)).toBeNull();
    expect(readMonth("May", 1990)).toBeNull();
  });

  it("checks a new vote", () => {
    expect(readNewVote({ month: "2026-09", goals: [goal("a")] })).toMatch(/at least 2/);
    expect(readNewVote({ month: "2026-09", goals: Array.from({ length: 11 }, (_, i) => goal(`p${i}`)) })).toMatch(/up to 10/);
    expect(readNewVote({ goals: [goal("a"), goal("b")] })).toMatch(/month/);
    expect(readNewVote({ month: "2026-09", goals: [goal("a"), { description: "no scorer" }] })).toMatch(/who scored/);
    expect(readNewVote({ month: "2026-09", goals: [goal("a", { eventId: "e1" }), goal("b", { eventId: "e1" })] })).toMatch(/only be picked once/);
    expect(readNewVote({ month: "2026-09", goals: [goal("a", { videoUrl: "javascript:alert(1)" }), goal("b")] })).toMatch(/https/);
    expect(readNewVote({
      month: "2026-09",
      goals: [goal(" a ", { eventId: "e1", fixtureId: "f1", description: "  Volley   from 25 yards " }), goal("b", { matchId: "f2", videoUrl: "https://youtu.be/x" })],
    })).toEqual({
      month: 9, year: 2026,
      goals: [
        { eventId: "e1", playerId: "a", fixtureId: "f1", description: "Volley from 25 yards", videoUrl: null },
        { eventId: null, playerId: "b", fixtureId: "f2", description: null, videoUrl: "https://youtu.be/x" },
      ],
    });
  });

  it("finds the winner, joint winners, or none", () => {
    expect(winnersOf([{ id: "a", votes: 3 }, { id: "b", votes: 5 }])).toEqual([{ id: "b", votes: 5 }]);
    expect(winnersOf([{ id: "a", votes: 4 }, { id: "b", votes: 4 }, { id: "c", votes: 1 }]).map((c) => c.id)).toEqual(["a", "b"]);
    expect(winnersOf([{ id: "a", votes: 0 }])).toEqual([]);
  });

  it("labels months and their days", () => {
    expect(monthLabel("september", 2026)).toBe("September 2026");
    expect(monthLabel(2, 2028)).toBe("February 2028");
    expect(monthRange(2, 2028)).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
});
