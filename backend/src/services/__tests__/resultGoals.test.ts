import { describe, it, expect } from "vitest";
import { ownGoalsIn, readGoalPicks, scorersText } from "../resultGoals";

describe("scorers picked on a result", () => {
  it("reads picks, or nothing when none were sent", () => {
    expect(readGoalPicks({})).toBeUndefined();
    expect(readGoalPicks({ scorerIds: ["a", "a", "b"] })).toEqual({ scorerIds: ["a", "a", "b"], ownGoals: 0 });
    expect(readGoalPicks({ ownGoals: 2 })).toEqual({ scorerIds: [], ownGoals: 2 });
    expect(readGoalPicks({ scorerIds: "a" })).toMatch(/squad/);
    expect(readGoalPicks({ scorerIds: [""] })).toMatch(/squad/);
    expect(readGoalPicks({ ownGoals: -1 })).toMatch(/whole number/);
    expect(readGoalPicks({ scorerIds: Array(100).fill("a") })).toMatch(/too many/);
  });

  it("writes the scorers line with goal counts and own goals", () => {
    const names = new Map([["a", "Pat Player"], ["b", "Sam Smith"]]);
    expect(scorersText({ scorerIds: ["a", "b", "a"], ownGoals: 0 }, names)).toBe("Pat Player 2, Sam Smith");
    expect(scorersText({ scorerIds: ["b"], ownGoals: 1 }, names)).toBe("Sam Smith, OG");
    expect(scorersText({ scorerIds: [], ownGoals: 2 }, names)).toBe("OG 2");
    expect(scorersText({ scorerIds: [], ownGoals: 0 }, names)).toBeNull();
  });

  it("finds own goals in a scorers line it wrote", () => {
    expect(ownGoalsIn("Sam Smith, OG")).toBe(1);
    expect(ownGoalsIn("OG 2")).toBe(2);
    expect(ownGoalsIn("Ogbonna 2, Sam")).toBe(0);
    expect(ownGoalsIn(null)).toBe(0);
  });
});
