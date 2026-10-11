import { describe, it, expect } from "vitest";
import { computeState, matchMinute, pitchAndBench, rejectReason, undoBlockedReason, type LiveEvent, type LiveEventType } from "../liveMatchState";

let n = 0;
const ev = (type: LiveEventType, createdAt: number, extra: Partial<LiveEvent> = {}): LiveEvent => ({
  id: `e${++n}`, type, minute: null, playerId: null, playerName: null, player2Id: null, player2Name: null, text: null, createdAt, ...extra,
});
const MIN = 60_000;

describe("live match state", () => {
  it("follows the match from kick-off to full time", () => {
    expect(computeState([]).status).toBe("scheduled");
    const events = [ev("kick_off", 0, { text: "25" }), ev("goal", 5 * MIN), ev("opp_goal", 9 * MIN), ev("goal", 20 * MIN)];
    const firstHalf = computeState(events);
    expect(firstHalf).toMatchObject({ status: "live", period: 1, ourScore: 2, theirScore: 1, halfLength: 25 });
    expect(matchMinute(firstHalf, 12 * MIN + 30_000)).toBe(13);

    events.push(ev("half_time", 26 * MIN));
    const ht = computeState(events);
    expect(ht.status).toBe("half_time");
    expect(matchMinute(ht, 30 * MIN)).toBe(25);

    events.push(ev("second_half", 35 * MIN));
    const second = computeState(events);
    expect(second).toMatchObject({ status: "live", period: 2 });
    expect(matchMinute(second, 35 * MIN)).toBe(26);

    events.push(ev("full_time", 62 * MIN));
    expect(computeState(events)).toMatchObject({ status: "full_time", ourScore: 2, theirScore: 1, endedAt: 62 * MIN });
  });

  it("uses a 40-minute half unless another length was given", () => {
    expect(computeState([ev("kick_off", 0)]).halfLength).toBe(40);
    expect(computeState([ev("kick_off", 0, { text: "999" })]).halfLength).toBe(40);
  });

  it("only allows things in a sensible order", () => {
    const scheduled = computeState([]);
    expect(rejectReason(scheduled, "goal")).toMatch(/Kick off first/);
    expect(rejectReason(scheduled, "half_time")).toBeTruthy();
    expect(rejectReason(scheduled, "kick_off")).toBeNull();

    const live = computeState([ev("kick_off", 0)]);
    expect(rejectReason(live, "kick_off")).toMatch(/already/);
    expect(rejectReason(live, "second_half")).toBeTruthy();
    expect(rejectReason(live, "goal")).toBeNull();

    const finished = computeState([ev("kick_off", 0), ev("full_time", MIN)]);
    expect(rejectReason(finished, "goal")).toMatch(/Undo full time/);
  });

  it("undoes a half-time call only when nothing came after it", () => {
    const kickOff = ev("kick_off", 0);
    const goal = ev("goal", MIN);
    const events = [kickOff, goal];
    expect(undoBlockedReason(events, kickOff)).toMatch(/later/);
    expect(undoBlockedReason(events, goal)).toBeNull();
    expect(undoBlockedReason([kickOff], kickOff)).toBeNull();
    const fullTime = ev("full_time", 2 * MIN);
    expect(undoBlockedReason([kickOff, goal, fullTime], goal)).toMatch(/full time first/);
    expect(undoBlockedReason([kickOff, goal, fullTime], fullTime)).toBeNull();
  });
});

describe("who is on the pitch", () => {
  const lineup = { starters: ["a", "b", "c"], subs: ["d", "e"] };
  it("starts from the line-up and follows subs, including a player coming back on", () => {
    const first = pitchAndBench(lineup, [])!;
    expect([...first.onPitch]).toEqual(["a", "b", "c"]);
    expect([...first.bench]).toEqual(["d", "e"]);
    const events = [ev("sub", 2 * MIN, { playerId: "d", player2Id: "a" }), ev("sub", 1 * MIN, { playerId: "e", player2Id: "b" })];
    const later = pitchAndBench(lineup, events)!;
    expect([...later.onPitch].sort()).toEqual(["c", "d", "e"]);
    expect([...later.bench].sort()).toEqual(["a", "b"]);
    const back = pitchAndBench(lineup, [...events, ev("sub", 3 * MIN, { playerId: "a", player2Id: "d" })])!;
    expect(back.onPitch.has("a")).toBe(true);
    expect(back.bench.has("d")).toBe(true);
  });
  it("takes sent-off players out of both, and means no rule without a line-up", () => {
    const sides = pitchAndBench(lineup, [ev("yellow", MIN, { playerId: "c" }), ev("yellow", 2 * MIN, { playerId: "c" })])!;
    expect(sides.onPitch.has("c")).toBe(false);
    expect(sides.bench.has("c")).toBe(false);
    expect(pitchAndBench(null, [])).toBeNull();
    expect(pitchAndBench({ starters: [], subs: ["d"] }, [])).toBeNull();
  });
});
