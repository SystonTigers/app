/**
 * Journey: the manager adds a player, sets their shirt number, then enters
 * their apps and a red card for a past season by hand. Stats show them for
 * that season and all time, on top of Match Centre; families can see but not
 * change them.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Player season stats journey", () => {
  it("enters past-season stats and shows them in Stats", async () => {
    const coach = await registerAdmin("pss-coach");
    const parent = await registerMember("pss-parent");

    // Add a player with a shirt number (the app sends `number`), then change it
    const added = await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Stat Son", number: 9, position: "Forward" } });
    expect(added.status).toBe(200);
    const id = added.data.playerId as string;
    const edit = await call(`/api/v1/admin/squad/${id}`, { method: "PUT", token: coach.token, body: { number: 10, position: "Midfielder" } });
    expect(edit.status).toBe(200);
    const squad = (await call("/api/v1/squad", { token: coach.token })).data.data as any[];
    expect(squad.find((p) => p.id === id)).toMatchObject({ number: 10, position: "Midfielder" });

    // Seasons offered for this player; nothing entered yet
    const seasons = (await call(`/api/v1/players/${id}/season-stats`, { token: parent.token })).data.data as any[];
    expect(seasons.length).toBeGreaterThan(0);
    expect(seasons.every((s) => s.entered === null)).toBe(true);
    const current = seasons.find((s) => s.current);

    // Families can't change stats; bad numbers are refused
    const put = (season: string, body: unknown, token = coach.token) => call(`/api/v1/players/${id}/season-stats/${season}`, { method: "PUT", token, body });
    expect((await put(current.id, { appearances: 3 }, parent.token)).status).toBe(403);
    expect((await put(current.id, { appearances: -1 })).status).toBe(400);
    expect((await put(current.id, { redCards: 1.5 })).status).toBe(400);
    expect((await put("all", { appearances: 1 })).status).toBe(400);
    expect((await put("nonsense", { appearances: 1 })).status).toBe(400);
    expect((await call(`/api/v1/players/nobody/season-stats/${current.id}`, { method: "PUT", token: coach.token, body: { goals: 1 } })).status).toBe(404);

    // 12 apps, 4 goals and a red card this season; 20 apps in 2023/24
    const saved = await put(current.id, { appearances: 12, goals: 4, redCards: 1 });
    expect(saved.status).toBe(200);
    expect(saved.data.data.entered).toMatchObject({ appearances: 12, goals: 4, redCards: 1, yellowCards: 0 });
    expect((await put("2023-24", { appearances: 20, assists: 5 })).status).toBe(200);

    const stats = async (season?: string) => ((await call(`/api/v1/stats/players${season ? `?season=${season}` : ""}`, { token: parent.token })).data.data as any[]).find((p) => p.id === id);
    expect(await stats(current.id)).toMatchObject({ appearances: 12, goals: 4, redCards: 1, assists: 0 });
    expect(await stats("2023-24")).toMatchObject({ appearances: 20, assists: 5, redCards: 0 });
    expect(await stats()).toMatchObject({ appearances: 32, goals: 4, assists: 5, redCards: 1 });

    // Changing replaces; all zeros clears the season
    await put(current.id, { appearances: 13, goals: 4, redCards: 1 });
    expect(await stats(current.id)).toMatchObject({ appearances: 13 });
    const cleared = await put("2023-24", {});
    expect(cleared.data.data.entered).toBeNull();
    expect(await stats("2023-24")).toMatchObject({ appearances: 0, assists: 0 });
    const after = (await call(`/api/v1/players/${id}/season-stats`, { token: coach.token })).data.data as any[];
    expect(after.find((s) => s.id === current.id).entered).toMatchObject({ appearances: 13 });
  });
});
