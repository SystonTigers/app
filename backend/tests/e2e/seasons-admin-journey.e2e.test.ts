/**
 * Journey: staff run the club's seasons (the app's and website's Seasons
 * screen): start a new season carrying the squad over, see it as current,
 * look back at how it went, end it with awards, and reopen it.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Season admin", () => {
  it("starts, ends with awards and reopens a season", async () => {
    const coach = await registerAdmin("sa-coach", "coach");
    const parent = await registerMember("sa-parent");
    const pat = (await call("/api/v1/admin/squad", { token: coach.token, body: { firstName: "Season", lastName: "Starter" } })).data.playerId as string;

    expect((await call("/api/v1/seasons/start-new", { token: parent.token, body: { name: "Nope", startDate: "2031-08-01" } })).status).toBe(403);

    const started = await call("/api/v1/seasons/start-new", { token: coach.token, body: { name: "2031-32 test", startDate: "2031-08-01", copySquad: true, playerIds: [pat] } });
    expect(started.status, JSON.stringify(started.data)).toBe(200);
    expect(started.data.success).toBe(true);

    const list = await call("/api/v1/seasons", { token: parent.token });
    expect(list.status).toBe(200);
    const season = list.data.data.find((s: any) => s.name === "2031-32 test");
    expect(season).toBeTruthy();
    expect(season.is_current).toBe(1);

    const preview = await call(`/api/v1/seasons/${season.id}/end-preview`, { token: coach.token });
    expect(preview.status, JSON.stringify(preview.data)).toBe(200);
    expect(preview.data.success).toBe(true);

    const ended = await call(`/api/v1/seasons/${season.id}/end`, { token: coach.token, body: { awards: [{ type: "custom", award_name: "Players' Player", player_id: pat }] } });
    expect(ended.status, JSON.stringify(ended.data)).toBe(200);
    const awards = await call(`/api/v1/seasons/${season.id}/awards`, { token: parent.token });
    expect(awards.status, JSON.stringify(awards.data)).toBe(200);
    expect(JSON.stringify(awards.data)).toContain("Players' Player");
    const archived = (await call("/api/v1/seasons", { token: coach.token })).data.data.find((s: any) => s.id === season.id);
    expect(archived.status).toBe("archived");

    const reopened = await call(`/api/v1/seasons/${season.id}/reopen`, { token: coach.token, body: {} });
    expect(reopened.status, JSON.stringify(reopened.data)).toBe(200);
    expect((await call("/api/v1/seasons", { token: coach.token })).data.data.find((s: any) => s.id === season.id).status).not.toBe("archived");

    const setCurrent = await call("/api/v1/seasons/set-current", { token: coach.token, body: { seasonId: season.id } });
    expect(setCurrent.status, JSON.stringify(setCurrent.data)).toBe(200);
  });
});
