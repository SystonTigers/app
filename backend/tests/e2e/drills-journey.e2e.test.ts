/**
 * Journey: a coach makes a club drill with set-up, steps and coaching points,
 * adds a TikTok link to it and to a built-in drill; members favourite drills
 * (each person has their own) but can't change them. Removing a drill removes
 * its links and favourites.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

const TIKTOK = "https://www.tiktok.com/@coachjoe/video/7312345678901234567?is_from_webapp=1";

describe("Drills", () => {
  it("club drills, favourites and video links", async () => {
    const coach = await registerAdmin("drills-coach", "coach");
    const parent = await registerMember("drills-parent");
    const player = await registerMember("drills-player");

    expect((await call("/api/v1/training/drills")).status).toBe(401);
    expect((await call("/api/v1/training/drills", { token: parent.token, body: { name: "Mine", category: "Passing", duration: 10, description: "x" } })).status).toBe(403);
    const invalid = await call("/api/v1/training/drills", { token: coach.token, body: { name: "Rondo", category: "Juggling", duration: 10 } });
    expect(invalid.status).toBe(400);
    expect(invalid.data.error.message).toMatch(/category/);

    const created = await call("/api/v1/training/drills", {
      token: coach.token,
      body: {
        name: "Tigers Rondo", category: "Passing", duration: "15 mins", players: "7", difficulty: "advanced",
        equipment: "Cones, Bibs", setup: "15 x 15 m square.", steps: "Five on the outside\nTwo in the middle", coachingPoints: ["Open body"],
      },
    });
    expect(created.status).toBe(201);
    const drill = created.data.data;
    expect(drill).toMatchObject({
      ref: `club:${created.data.id}`, name: "Tigers Rondo", durationMinutes: 15, difficulty: "advanced", players: "7",
      equipment: ["Cones", "Bibs"], setup: "15 x 15 m square.", steps: ["Five on the outside", "Two in the middle"], coachingPoints: ["Open body"],
    });

    const edited = await call(`/api/v1/training/drills/${drill.id}`, { method: "PUT", token: coach.token, body: { ...drill, name: "Tigers Rondo 5v2", coachingPoints: ["Open body", "Play away from pressure"] } });
    expect(edited.data.data).toMatchObject({ name: "Tigers Rondo 5v2", coachingPoints: ["Open body", "Play away from pressure"] });
    expect((await call(`/api/v1/training/drills/${drill.id}`, { method: "PUT", token: parent.token, body: drill })).status).toBe(403);

    // Video links: TikTok on our drill (tracking removed) and on a built-in drill
    expect((await call("/api/v1/training/drill-links", { token: coach.token, body: { ref: drill.ref, url: "https://example.com/video" } })).status).toBe(400);
    const link = await call("/api/v1/training/drill-links", { token: coach.token, body: { ref: drill.ref, url: TIKTOK } });
    expect(link.status).toBe(201);
    expect(link.data.data).toMatchObject({ ref: drill.ref, platform: "tiktok", url: "https://www.tiktok.com/@coachjoe/video/7312345678901234567" });
    expect((await call("/api/v1/training/drill-links", { token: coach.token, body: { ref: drill.ref, url: TIKTOK } })).status).toBe(409);
    expect((await call("/api/v1/training/drill-links", { token: coach.token, body: { ref: "lib:drill-021", url: "https://www.instagram.com/reel/C1a2B3c4D5e/" } })).status).toBe(201);
    expect((await call("/api/v1/training/drill-links", { token: parent.token, body: { ref: "lib:drill-021", url: TIKTOK } })).status).toBe(403);
    expect((await call("/api/v1/training/drill-links", { token: coach.token, body: { ref: "club:00000000-0000-0000-0000-000000000000", url: TIKTOK } })).status).toBe(404);

    // Favourites are per person
    const fav = await call("/api/v1/training/drill-favourites", { method: "PUT", token: parent.token, body: { ref: drill.ref, favourite: true } });
    expect(fav.data.data.favourites).toEqual([drill.ref]);
    await call("/api/v1/training/drill-favourites", { method: "PUT", token: parent.token, body: { ref: "lib:drill-021", favourite: true } });
    expect((await call("/api/v1/training/drill-favourites", { method: "PUT", token: parent.token, body: { ref: "lib:nope", favourite: true } })).status).toBe(400);

    const parentView = (await call("/api/v1/training/drills", { token: parent.token })).data;
    expect(parentView.data.map((d: any) => d.name)).toEqual(["Tigers Rondo 5v2"]);
    expect([...parentView.favourites].sort()).toEqual([drill.ref, "lib:drill-021"].sort());
    expect(parentView.links[drill.ref]).toHaveLength(1);
    expect(parentView.links["lib:drill-021"][0].platform).toBe("instagram");
    expect((await call("/api/v1/training/drills", { token: player.token })).data.favourites).toEqual([]);

    const unfav = await call("/api/v1/training/drill-favourites", { method: "PUT", token: parent.token, body: { ref: "lib:drill-021", favourite: false } });
    expect(unfav.data.data.favourites).toEqual([drill.ref]);

    // Removing a link, then the drill (its other links and favourites go too)
    expect((await call(`/api/v1/training/drill-links/${link.data.data.id}`, { method: "DELETE", token: coach.token })).status).toBe(200);
    expect((await call("/api/v1/training/drills", { token: coach.token })).data.links[drill.ref]).toBeUndefined();
    expect((await call(`/api/v1/training/drills/${drill.id}`, { method: "DELETE", token: coach.token })).status).toBe(200);
    const after = (await call("/api/v1/training/drills", { token: parent.token })).data;
    expect(after.data).toEqual([]);
    expect(after.favourites).toEqual([]);
    expect(after.links["lib:drill-021"]).toHaveLength(1);
  });
});
