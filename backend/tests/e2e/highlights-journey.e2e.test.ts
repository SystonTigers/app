/**
 * Journey: the manager taps goals, chances and saves in Match Centre; after the
 * match, everyone in the club can watch the highlights from the match's
 * YouTube video. Staff line the video up once and can trim or hide a clip.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

let seq = 0;
const tap = () => `hl-${Date.now()}-${++seq}`;

describe("Match highlights", () => {
  it("builds the highlights from the Match Centre taps and the match video", async () => {
    const coach = await registerAdmin("hl-coach");
    const parent = await registerMember("hl-parent");
    const striker = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Hana Highlight", squadNumber: 7 } })).data.playerId as string;
    const fixtureId = (await call("/api/v1/admin/fixtures", {
      token: coach.token, body: { opponent: "Clip Rovers", date: "2026-09-27", time: "10:00", venue: "Home", competition: "League", homeAway: "home" },
    })).data.id as string;

    const t0 = Date.now() - 12 * 60_000;
    const post = (body: Record<string, unknown>, secondsIn: number) =>
      call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: tap(), occurredAt: t0 + secondsIn * 1000, ...body } });
    await post({ type: "kick_off" }, 0);
    await post({ type: "goal", playerId: striker, minute: 3 }, 150);
    await post({ type: "chance", minute: 6 }, 330);           // no player needed
    await post({ type: "save", minute: 8 }, 450);
    const chances = await post({ type: "chance", playerId: striker, minute: 9 }, 500);
    expect(chances.status).toBe(201);
    await post({ type: "full_time" }, 600);

    // No video yet: nothing to watch, but the taps are counted
    let view = (await call(`/api/v1/fixtures/${fixtureId}/highlights`, { token: parent.token })).data.data;
    expect(view).toMatchObject({ video: null, moments: [], momentsTapped: 4, canEdit: false, momentsFromKickOff: [] });

    // Staff can make a video from the camera's recording without YouTube: clip times from kick-off
    const staffView = (await call(`/api/v1/fixtures/${fixtureId}/highlights`, { token: coach.token })).data.data;
    expect(staffView.momentsFromKickOff.map((m: any) => [m.type, m.start, m.end])).toEqual([
      ["goal", 150 - 20, 150 + 6], ["chance", 330 - 15, 330 + 4], ["save", 450 - 12, 450 + 4], ["chance", 500 - 15, 500 + 4],
    ]);

    // The manager adds the match video (a pasted link, so the video isn't lined up yet)
    expect((await call(`/api/v1/fixtures/${fixtureId}/stream`, { method: "PUT", token: coach.token, body: { url: "https://youtu.be/abcdefghijk" } })).status).toBe(200);
    view = (await call(`/api/v1/fixtures/${fixtureId}/highlights`, { token: parent.token })).data.data;
    expect(view).toMatchObject({ video: { videoId: "abcdefghijk" }, kickoffSec: null, lineUp: null, moments: [] });

    // Parents can't line it up; staff can
    expect((await call(`/api/v1/fixtures/${fixtureId}/highlights`, { method: "PUT", token: parent.token, body: { kickoffSec: 60 } })).status).toBe(403);
    expect((await call(`/api/v1/fixtures/${fixtureId}/highlights`, { method: "PUT", token: coach.token, body: { kickoffSec: -5 } })).status).toBe(400);
    view = (await call(`/api/v1/fixtures/${fixtureId}/highlights`, { method: "PUT", token: coach.token, body: { kickoffSec: 60 } })).data.data;
    expect(view.lineUp).toBe("manual");
    expect(view.moments.map((m: any) => [m.type, m.start, m.end])).toEqual([
      ["goal", 60 + 150 - 20, 60 + 150 + 6],
      ["chance", 60 + 330 - 15, 60 + 330 + 4],
      ["save", 60 + 450 - 12, 60 + 450 + 4],
      ["chance", 60 + 500 - 15, 60 + 500 + 4],
    ]);
    expect(view.moments[0].title).toBe("Goal · Hana Highlight 3'");

    // Staff start the goal 5 seconds earlier and hide the first chance
    const [goal, chance] = view.moments;
    await call(`/api/v1/fixtures/${fixtureId}/highlights`, { method: "PUT", token: coach.token, body: { moment: { id: goal.id, start: -5 } } });
    view = (await call(`/api/v1/fixtures/${fixtureId}/highlights`, { method: "PUT", token: coach.token, body: { moment: { id: chance.id, hidden: true } } })).data.data;
    expect(view.moments[0].start).toBe(60 + 150 - 25);
    expect(view.moments.find((m: any) => m.id === chance.id).hidden).toBe(true);

    const parentView = (await call(`/api/v1/fixtures/${fixtureId}/highlights`, { token: parent.token })).data.data;
    expect(parentView.moments).toHaveLength(3);
    expect(parentView.moments.some((m: any) => m.id === chance.id)).toBe(false);

    // The club's highlights list
    const list = (await call("/api/v1/highlights", { token: parent.token })).data.data;
    expect(list.find((m: any) => m.fixtureId === fixtureId)).toMatchObject({ opponent: "Clip Rovers", videoId: "abcdefghijk", moments: 4 });
    expect((await call("/api/v1/highlights")).status).toBe(401);
  });
});
