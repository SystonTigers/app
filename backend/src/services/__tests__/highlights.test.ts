import { describe, it, expect } from "vitest";
import { buildHighlights, fromKickOffPlacer, kickoffFromStreamStart, parseEdits, partOrigin, partsPlacer, placeTap, shiftFor, type PartTiming } from "../highlights";
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

const part = (videoId: string, over: Partial<PartTiming> = {}): PartTiming => ({ videoId, startedAt: null, addedAt: T0, anchorSec: null, anchorAt: null, ...over });
/** One video whose stream went live 95 seconds before kick-off */
const oneVideo = partsPlacer([part("vid00000001", { startedAt: T0 - 95_000 })]);

describe("match highlights", () => {
  it("makes a clip for each moment, placed in the video by clock time", () => {
    const clips = buildHighlights(events, oneVideo, "Rovers");
    expect(clips.map((c) => [c.id, c.videoId, c.start, c.end])).toEqual([
      ["g1", "vid00000001", 95 + 600 - 30, 95 + 600 + 8],
      ["c1", "vid00000001", 95 + 900 - 20, 95 + 900 + 5],
      ["o1", "vid00000001", 95 + 1200 - 25, 95 + 1200 + 6],
      ["sv", "vid00000001", 95 + 1500 - 15, 95 + 1500 + 5],
    ]);
    expect(clips[0]).toMatchObject({ title: "Goal · Sam S. 11'", detail: "Assist: Ben J.", hidden: false });
    expect(clips[2].title).toBe("Rovers goal 21'");
    expect(clips[3].title).toBe("Save 26'");
  });

  it("knows the score before and after each moment, and how long each side of the clip is", () => {
    const clips = buildHighlights(events, oneVideo, "Rovers");
    expect(clips.map((c) => [c.id, c.scoreBefore, c.scoreAfter])).toEqual([
      ["g1", { us: 0, them: 0 }, { us: 1, them: 0 }],
      ["c1", { us: 1, them: 0 }, { us: 1, them: 0 }],
      ["o1", { us: 1, them: 0 }, { us: 1, them: 1 }],
      ["sv", { us: 1, them: 1 }, { us: 1, them: 1 }],
    ]);
    expect(clips[0]).toMatchObject({ tapAt: 695, before: 30, after: 8 });
  });

  it("turns 'start 40s before, end 2s after' into a saved tweak", () => {
    expect(shiftFor("goal", 40, 2)).toEqual({ start: -10, end: -6 });
    const clips = buildHighlights(events, oneVideo, "Rovers", { g1: shiftFor("goal", 40, 2)! });
    expect(clips[0]).toMatchObject({ before: 40, after: 2 });
    expect(shiftFor("goal", 999, -3)).toEqual({ start: 30 - 120, end: -8 });
    expect(shiftFor("sub", 5, 5)).toBeNull();
  });

  it("applies staff tweaks and hides clips", () => {
    const clips = buildHighlights(events, fromKickOffPlacer(events, 0), "Rovers", { g1: { start: -10, end: 5 }, c1: { hidden: true } });
    expect(clips[0]).toMatchObject({ start: 560, end: 613, shift: { start: -10, end: 5 } });
    expect(clips[1].hidden).toBe(true);
  });

  it("works out kick-off in the video from when the stream started", () => {
    expect(kickoffFromStreamStart(events, T0 - 4 * 60_000)).toBe(240);
    expect(kickoffFromStreamStart(events, null)).toBeNull();
    expect(kickoffFromStreamStart(events, T0 + 60_000)).toBeNull();
    expect(kickoffFromStreamStart([], T0)).toBeNull();
  });

  it("never starts before the video does, leaves out moments before it began, and ignores bad saved tweaks", () => {
    const early = partsPlacer([part("vid00000001", { startedAt: T0 })]);
    expect(buildHighlights([ev("ko", "kick_off", 0), ev("g", "goal", 5)], early, "X")[0].start).toBe(0);
    // The stream only started 10 minutes in: a goal at 2 minutes wasn't filmed
    const late = partsPlacer([part("vid00000001", { startedAt: T0 + 600_000 })]);
    expect(buildHighlights([ev("ko", "kick_off", 0), ev("g", "goal", 120)], late, "X")).toEqual([]);
    expect(parseEdits('{"a":{"start":-999,"end":"x","hidden":"yes"},"b":null}')).toEqual({ a: { start: -120, end: 0 } });
    expect(parseEdits("nonsense")).toEqual({});
  });
});

describe("a match with more than one video", () => {
  // The stream dropped at 25 minutes and was restarted at 27: two parts
  const first = part("first000001", { startedAt: T0 - 60_000 });
  const second = part("second00001", { startedAt: T0 + 27 * 60_000, addedAt: T0 + 28 * 60_000 });

  it("puts each tap in the part that was live then, by clock time", () => {
    expect(placeTap([first, second], T0 + 10 * 60_000)).toEqual({ videoId: "first000001", sec: 660 });
    expect(placeTap([second, first], T0 + 40 * 60_000)).toEqual({ videoId: "second00001", sec: 780 });
    // A tap a few seconds before the restart (clocks differ) still goes in the new part
    expect(placeTap([first, second], T0 + 27 * 60_000 - 20_000)?.videoId).toBe("second00001");
    const clips = buildHighlights([ev("ko", "kick_off", 0), ev("a", "goal", 600), ev("b", "goal", 2400)], partsPlacer([first, second]), "X");
    expect(clips.map((c) => [c.id, c.videoId, c.tapAt])).toEqual([["a", "first000001", 660], ["b", "second00001", 780]]);
  });

  it("uses a coach's line-up over the stream's start time, and waits for one when neither is known", () => {
    // A pasted link (start unknown) lined up: 30 seconds in is the goal tapped at 40 minutes
    const link = part("link0000001", { addedAt: T0 + 27 * 60_000, anchorSec: 30, anchorAt: T0 + 40 * 60_000 });
    expect(partOrigin(link)).toBe(T0 + 40 * 60_000 - 30_000);
    expect(placeTap([first, link], T0 + 41 * 60_000)).toEqual({ videoId: "link0000001", sec: 90 });
    // Not lined up yet: its moments wait (the first part's still work)
    const waiting = part("link0000001", { addedAt: T0 + 27 * 60_000 });
    expect(placeTap([first, waiting], T0 + 41 * 60_000)).toBeNull();
    expect(placeTap([first, waiting], T0 + 5 * 60_000)?.videoId).toBe("first000001");
    expect(placeTap([], T0)).toBeNull();
  });
});
