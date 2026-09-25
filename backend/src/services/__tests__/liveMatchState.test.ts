import { describe, it, expect } from "vitest";
import { computeState, matchMinute, rejectReason, undoBlockedReason, type LiveEvent, type LiveEventType } from "../liveMatchState";

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
