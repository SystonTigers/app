import { describe, it, expect } from "vitest";
import {
  ADDED_TIME_SHOWN, computeState, matchClock, matchMinute, minutesPlayed, secondYellowIds, sentOffIds, sinBinMinutes, sinBinRemainingMs,
  STALE_AFTER_MS, type LiveEvent, type LiveEventType,
} from "../liveMatchState";

let n = 0;
const MIN = 60_000;
const ev = (type: LiveEventType, createdAt: number, extra: Partial<LiveEvent> = {}): LiveEvent => ({
  id: `x${++n}`, type, minute: null, playerId: null, playerName: null, player2Id: null, player2Name: null, text: null, createdAt, ...extra,
});

describe("match clock", () => {
  const ko = ev("kick_off", 0, { text: "40" });

  it("counts on into added time and stops showing a number past 15 extra minutes", () => {
    const state = computeState([ko]);
    expect(matchClock(state, 23 * MIN).label).toBe("24'");
    expect(matchClock(state, 41 * MIN + 1000)).toMatchObject({ minute: 40, label: "40+2'" });
    expect(matchClock(state, (40 + ADDED_TIME_SHOWN + 5) * MIN).label).toBe("40+'");
    expect(matchMinute(state, 300 * MIN)).toBe(40 + ADDED_TIME_SHOWN);
  });

  it("holds at half time and carries on from the half length", () => {
    const events = [ko, ev("half_time", 42 * MIN), ev("second_half", 55 * MIN)];
    expect(matchClock(computeState(events.slice(0, 2)), 50 * MIN)).toMatchObject({ minute: 40, label: null });
    expect(matchClock(computeState(events), 60 * MIN).label).toBe("46'");
    expect(matchClock(computeState(events), 96 * MIN).label).toBe("80+2'");
  });

  it("flags a match left running: overdue, then stale", () => {
    const state = computeState([ko]);
    expect(matchClock(state, 90 * MIN).overdue).toBe(false);
    expect(matchClock(state, 101 * MIN).overdue).toBe(true);
    expect(matchClock(state, STALE_AFTER_MS + MIN)).toMatchObject({ stale: true, label: null, minute: null });
    expect(matchClock(computeState([ko, ev("full_time", 90 * MIN)]), 500 * MIN)).toMatchObject({ overdue: false, stale: false });
  });
});

describe("cards and sin bins", () => {
  it("treats a player's second yellow as a sending-off", () => {
    const y1 = ev("yellow", 1, { playerId: "sam" });
    const other = ev("yellow", 2, { playerId: "ben" });
    const y2 = ev("yellow", 3, { playerId: "sam" });
    expect([...secondYellowIds([y1, other, y2])]).toEqual([y2.id]);
    expect([...sentOffIds([y1, other, y2, ev("red", 4, { playerId: "al" })])].sort()).toEqual(["al", "sam"]);
  });

  it("sizes a sin bin at a tenth of the match, at least 2 minutes", () => {
    expect(sinBinMinutes(40)).toBe(8);
    expect(sinBinMinutes(25)).toBe(5);
    expect(sinBinMinutes(5)).toBe(2);
  });

  it("counts a sin bin down only while the match is being played", () => {
    const ko = ev("kick_off", 0, { text: "40" });
    const bin = ev("sin_bin", 36 * MIN, { playerId: "sam", text: "8" });
    const ht = ev("half_time", 40 * MIN);
    const sh = ev("second_half", 50 * MIN);
    expect(sinBinRemainingMs([ko, bin], bin, 38 * MIN)).toBe(6 * MIN);
    // 4 minutes served before half time, none during the break
    expect(sinBinRemainingMs([ko, bin, ht], bin, 45 * MIN)).toBe(4 * MIN);
    expect(sinBinRemainingMs([ko, bin, ht, sh], bin, 52 * MIN)).toBe(2 * MIN);
    expect(sinBinRemainingMs([ko, bin, ht, sh], bin, 60 * MIN)).toBe(0);
    expect(sinBinRemainingMs([ko, bin, ev("full_time", 37 * MIN)], bin, 38 * MIN)).toBe(0);
  });
});

describe("minutes played", () => {
  const lineup = [
    { playerId: "a", role: "starter" as const }, { playerId: "b", role: "starter" as const },
    { playerId: "c", role: "sub" as const }, { playerId: "d", role: "sub" as const },
  ];

  it("gives starters the match, subs from when they came on, and stops at a sending-off", () => {
    const events = [
      ev("kick_off", 0, { text: "30" }),
      ev("sub", 1, { minute: 20, playerId: "c", player2Id: "b" }),
      ev("half_time", 2, { minute: 31 }),
      ev("second_half", 3, { minute: 30 }),
      ev("yellow", 4, { minute: 35, playerId: "a" }),
      ev("yellow", 5, { minute: 50, playerId: "a" }),
      ev("full_time", 6, { minute: 62 }),
    ];
    const m = minutesPlayed(lineup, events);
    expect(Object.fromEntries(m)).toEqual({ a: 50, b: 20, c: 40 });
    expect(m.has("d")).toBe(false);
  });

  it("caps added time and counts a match report's starters for the whole match", () => {
    const m = minutesPlayed(lineup, [ev("red", 0, { minute: 70, playerId: "b" })]);
    expect(m.get("a")).toBe(80);
    expect(m.get("b")).toBe(70);
  });

  it("gives a player who went off without being in the line-up the time from kick-off", () => {
    const m = minutesPlayed([], [ev("kick_off", 0, { text: "40" }), ev("sub", 1, { minute: 10, playerId: "c", player2Id: "z" }), ev("full_time", 2, { minute: 80 })]);
    expect(Object.fromEntries(m)).toEqual({ z: 10, c: 70 });
  });
});
