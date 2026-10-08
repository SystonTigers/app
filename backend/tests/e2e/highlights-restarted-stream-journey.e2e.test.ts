/**
 * Journey: the match stream drops after 20 minutes and is restarted. Both
 * videos stay with the match: each goal's clip plays from the part that was
 * live when it was tapped, worked out from when each stream started, with no
 * lining up. A pasted link whose start isn't known waits until a coach lines
 * it up on one moment. Removing a wrong link only removes that part.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";
import { setFixtureStream } from "../../src/services/stream/detect";

let seq = 0;
const tap = () => `hlr-${Date.now()}-${++seq}`;

describe("Highlights when the stream restarts", () => {
  it("keeps every part of the match video and places each clip in the right one", async () => {
    const coach = await registerAdmin("hlr-coach");
    const parent = await registerMember("hlr-parent");
    const striker = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Rhys Restart", squadNumber: 9 } })).data.playerId as string;
    const fixtureId = (await call("/api/v1/admin/fixtures", {
      token: coach.token, body: { opponent: "Dropout Rovers", date: "2026-09-27", time: "10:00", venue: "Home", competition: "League", homeAway: "home" },
    })).data.id as string;
    const tenantId = (await env.DB.prepare(`SELECT tenant_id FROM fixtures WHERE id = ?`).bind(fixtureId).first<{ tenant_id: string }>())!.tenant_id;

    const t0 = Date.now() - 50 * 60_000;
    const post = (body: Record<string, unknown>, secondsIn: number) =>
      call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: tap(), occurredAt: t0 + secondsIn * 1000, ...body } });

    // The club's channel stream goes live a minute before kick-off...
    await setFixtureStream(env as never, tenantId, fixtureId, { videoId: "firsthalf01", source: "youtube", embeddable: true, startedAt: t0 - 60_000 }, t0 - 60_000);
    await post({ type: "kick_off" }, 0);
    await post({ type: "goal", playerId: striker, minute: 6 }, 300);
    // ...drops at 20 minutes and is restarted at 22: a second part, the first is kept
    await setFixtureStream(env as never, tenantId, fixtureId, { videoId: "restarted01", source: "youtube", embeddable: true, startedAt: t0 + 22 * 60_000 }, t0 + 22 * 60_000);
    await post({ type: "goal", playerId: striker, minute: 31 }, 30 * 60);

    let view = (await call(`/api/v1/fixtures/${fixtureId}/highlights`, { token: parent.token })).data.data;
    expect(view.video.videoId).toBe("restarted01");
    expect(view.parts.map((p: any) => [p.part, p.videoId, p.lineUp, p.moments])).toEqual([[1, "firsthalf01", "automatic", 1], [2, "restarted01", "automatic", 1]]);
    expect(view.moments.map((m: any) => [m.videoId, m.tapAt])).toEqual([["firsthalf01", 60 + 300], ["restarted01", 8 * 60]]);
    expect(view.momentsWaiting).toBe(0);
    // The scorer's page gets both clips, each from its own video
    const page = (await call(`/api/v1/players/${striker}/profile`, { token: coach.token })).data.data;
    expect(page.clips.map((c: any) => c.videoId).sort()).toEqual(["firsthalf01", "restarted01"]);

    // A third part from a pasted link (start time unknown here): its goal waits until it's lined up
    expect((await call(`/api/v1/fixtures/${fixtureId}/stream`, { method: "PUT", token: coach.token, body: { url: "https://youtu.be/pastedlink1" } })).status).toBe(200);
    await env.DB.prepare(`UPDATE fixture_videos SET added_at = ? WHERE fixture_id = ? AND video_id = 'pastedlink1'`).bind(t0 + 40 * 60_000, fixtureId).run();
    const late = await post({ type: "goal", playerId: striker, minute: 46 }, 45 * 60);
    expect(late.status).toBe(201);
    view = (await call(`/api/v1/fixtures/${fixtureId}/highlights`, { token: coach.token })).data.data;
    const third = view.parts.find((p: any) => p.videoId === "pastedlink1");
    expect(third).toMatchObject({ part: 3, lineUp: null, moments: 0 });
    expect(view.momentsWaiting).toBe(1);
    expect(third.lineUpWith.label).toBe("the goal by Rhys Restart (46')");

    // Families can't line it up; a coach pauses on that goal (95 seconds in)
    const lineUp = { videoId: "pastedlink1", eventId: third.lineUpWith.eventId, sec: 95 };
    expect((await call(`/api/v1/fixtures/${fixtureId}/highlights`, { method: "PUT", token: parent.token, body: { lineUp } })).status).toBe(403);
    expect((await call(`/api/v1/fixtures/${fixtureId}/highlights`, { method: "PUT", token: coach.token, body: { lineUp: { ...lineUp, videoId: "nottheone01" } } })).status).toBe(404);
    view = (await call(`/api/v1/fixtures/${fixtureId}/highlights`, { method: "PUT", token: coach.token, body: { lineUp } })).data.data;
    expect(view.parts.find((p: any) => p.videoId === "pastedlink1")).toMatchObject({ lineUp: "manual", moments: 1 });
    expect(view.moments.at(-1)).toMatchObject({ videoId: "pastedlink1", tapAt: 95 });
    expect(view.momentsWaiting).toBe(0);

    // Removing a wrong link takes off that part only; the match points back at the restarted stream
    const removed = await call(`/api/v1/fixtures/${fixtureId}/stream?videoId=pastedlink1`, { method: "DELETE", token: coach.token });
    expect(removed.data.data.stream.videoId).toBe("restarted01");
    view = (await call(`/api/v1/fixtures/${fixtureId}/highlights`, { token: coach.token })).data.data;
    expect(view.parts.map((p: any) => p.videoId)).toEqual(["firsthalf01", "restarted01"]);
  });
});
