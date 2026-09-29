import { describe, it, expect } from "vitest";
import { buildHighlights, kickoffFromStreamStart, parseEdits, shiftFor } from "../highlights";
import type { LiveEvent } from "../liveMatchState";

const T0 = Date.UTC(2026, 9, 4, 9, 30);
const ev = (id: string, type: LiveEvent["type"], secondsAfterKickOff: number, extra: Partial<LiveEvent> = {}): LiveEvent => ({
  id, type, minute: Math.floor(secondsAfterKickOff / 60) + 1, playerId: null, playerName: null, player2Id: null, player2Name: null, text: null,
  createdAt: T0 + secondsAfterKickOff * 1000, ...extra,
});

const events: LiveEvent[] = [
  ev("ko", "kick_off", 0),
  ev("g1", "goal", 600, { playerName: "Sam S.", player2Name: "Ben J." }),
  ev("c1", "chance", 900, { playerName: "Will J." }),
  ev("sub", "sub", 1000),
  ev("o1", "opp_goal", 1200),
  ev("sv", "save", 1500),
  ev("ht", "half_time", 1800),
];

describe("match highlights", () => {
  it("makes a clip for each moment, lined up with the video", () => {
    const clips = buildHighlights(events, 95, "Rovers");
    expect(clips.map((c) => [c.id, c.start, c.end])).toEqual([
      ["g1", 95 + 600 - 20, 95 + 600 + 6],
      ["c1", 95 + 900 - 15, 95 + 900 + 4],
      ["o1", 95 + 1200 - 18, 95 + 1200 + 5],
      ["sv", 95 + 1500 - 12, 95 + 1500 + 4],
    ]);
    expect(clips[0]).toMatchObject({ title: "Goal · Sam S. 11'", detail: "Assist: Ben J.", hidden: false });
    expect(clips[2].title).toBe("Rovers goal 21'");
    expect(clips[3].title).toBe("Save 26'");
  });

  it("knows the score before and after each moment, and how long each side of the clip is", () => {
    const clips = buildHighlights(events, 95, "Rovers");
    expect(clips.map((c) => [c.id, c.scoreBefore, c.scoreAfter])).toEqual([
      ["g1", { us: 0, them: 0 }, { us: 1, them: 0 }],
      ["c1", { us: 1, them: 0 }, { us: 1, them: 0 }],
      ["o1", { us: 1, them: 0 }, { us: 1, them: 1 }],
      ["sv", { us: 1, them: 1 }, { us: 1, them: 1 }],
    ]);
    expect(clips[0]).toMatchObject({ tapAt: 695, before: 20, after: 6 });
  });

  it("turns 'start 30s before, end 2s after' into a saved tweak", () => {
    expect(shiftFor("goal", 30, 2)).toEqual({ start: -10, end: -4 });
    const clips = buildHighlights(events, 95, "Rovers", { g1: shiftFor("goal", 30, 2)! });
    expect(clips[0]).toMatchObject({ before: 30, after: 2 });
    expect(shiftFor("goal", 999, -3)).toEqual({ start: 20 - 120, end: -6 });
    expect(shiftFor("sub", 5, 5)).toBeNull();
  });

  it("applies staff tweaks and hides clips", () => {
    const clips = buildHighlights(events, 0, "Rovers", { g1: { start: -10, end: 5 }, c1: { hidden: true } });
    expect(clips[0]).toMatchObject({ start: 570, end: 611, shift: { start: -10, end: 5 } });
    expect(clips[1].hidden).toBe(true);
  });

  it("works out kick-off in the video from when the stream started", () => {
    expect(kickoffFromStreamStart(events, T0 - 4 * 60_000)).toBe(240);
    expect(kickoffFromStreamStart(events, null)).toBeNull();
    expect(kickoffFromStreamStart(events, T0 + 60_000)).toBeNull(); // stream started after kick-off: unknown
    expect(kickoffFromStreamStart([], T0)).toBeNull();
  });

  it("never starts before the video does, and ignores bad saved tweaks", () => {
    expect(buildHighlights([ev("ko", "kick_off", 0), ev("g", "goal", 5)], 0, "X")[0].start).toBe(0);
    expect(parseEdits('{"a":{"start":-999,"end":"x","hidden":"yes"},"b":null}')).toEqual({ a: { start: -120, end: 0 } });
    expect(parseEdits("nonsense")).toEqual({});
  });
});
