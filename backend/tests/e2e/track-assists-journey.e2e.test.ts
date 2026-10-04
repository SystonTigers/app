/**
 * Journey: a club switches assists off (top goalscorers only). Match Centre
 * goals then save no assist even if one is sent, stats and the public squad
 * show none, the club info tells the app and website, and switching back on
 * brings the assists already recorded back.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

let n = 0;
const tap = () => `assist-${Date.now()}-${++n}`;

describe("Track assists switch", () => {
  it("hides assists everywhere while off and keeps them for later", async () => {
    const admin = await registerAdmin("assist-admin");
    const parent = await registerMember("assist-parent");
    const add = async (firstName: string) => (await call("/api/v1/admin/squad", { token: admin.token, body: { firstName, lastName: "Assist" } })).data.playerId as string;
    const [ann, ben] = await Promise.all([add("Ann"), add("Ben")]);
    const info = async () => (await call("/public/syston/info")).data.data.trackAssists as boolean;
    const statsFor = async (id: string) => ((await call("/api/v1/stats/players", { token: admin.token })).data.data as Array<{ id: string; goals: number; assists: number }>).find((p) => p.id === id);
    const setAssists = (token: string, on: boolean) => call("/api/v1/tenants/me", { method: "PATCH", token, body: { trackAssists: on } });

    expect(await info()).toBe(true);

    const match = async (opponent: string, date: string) => {
      const fixtureId = (await call("/api/v1/admin/fixtures", {
        token: admin.token, body: { opponent, date, time: "10:00", venue: "Home", competition: "Friendly", homeAway: "home" },
      })).data.id as string;
      const t0 = Date.now() - 10 * 60_000;
      return (body: Record<string, unknown>, secs: number) =>
        call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: admin.token, body: { clientEventId: tap(), occurredAt: t0 + secs * 1000, ...body } });
    };

    // A finished match with Ben's assist, recorded while assists are on
    const first = await match("Helpers United", "2026-09-13");
    await first({ type: "kick_off", halfLength: 20 }, 0);
    await first({ type: "goal", playerId: ann, player2Id: ben }, 60);
    await first({ type: "full_time" }, 300);
    expect((await statsFor(ben))?.assists).toBe(1);

    // Families can't change it; staff switch it off
    expect((await setAssists(parent.token, false)).status).toBe(403);
    expect((await setAssists(admin.token, false)).status).toBe(200);
    expect(await info()).toBe(false);
    expect((await statsFor(ben))?.assists).toBe(0);

    // A goal sent with an assist (an older app) saves the goal only
    const second = await match("Solo Rovers", "2026-09-20");
    await second({ type: "kick_off", halfLength: 20 }, 0);
    const goal = await second({ type: "goal", playerId: ann, player2Id: ben }, 60);
    expect(goal.status).toBe(201);
    expect(goal.data.data.events[0]).toMatchObject({ type: "goal", playerId: ann, player2Id: null });
    await second({ type: "full_time" }, 300);
    expect(await statsFor(ann)).toMatchObject({ goals: 2, assists: 0 });

    const publicBen = ((await call("/public/syston/squad")).data.data as Array<{ id: string; stats?: { assists: number } }>).find((p) => p.id === ben);
    expect(publicBen?.stats?.assists ?? 0).toBe(0);

    // Back on: the assist recorded earlier is still there
    expect((await setAssists(admin.token, true)).status).toBe(200);
    expect(await info()).toBe(true);
    expect((await statsFor(ben))?.assists).toBe(1);
  });
});
