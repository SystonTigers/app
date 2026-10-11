/**
 * Journey: staff keep the club's opponents (the app's and website's
 * Opponents screen): add a team, upload its badge from the website (picture
 * as the body) or the app (a form), see it listed, and remove a team.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

// A 1x1 PNG
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (ch) => ch.charCodeAt(0));

describe("Opponents", () => {
  it("adds a team, takes its badge both ways and removes it", async () => {
    const coach = await registerAdmin("op-coach", "coach");
    const parent = await registerMember("op-parent");
    expect((await call("/api/v1/opponents", { token: parent.token, body: { team_name: "Badge Rovers" } })).status).toBe(403);

    const added = await call("/api/v1/opponents", { token: coach.token, body: { team_name: "Badge Rovers" } });
    expect(added.status, JSON.stringify(added.data)).toBe(200);
    const find = async (name: string) => (await call("/api/v1/opponents", { token: coach.token })).data.data.find((o: any) => o.team_name === name);
    const team = await find("Badge Rovers");
    expect(team).toBeTruthy();

    const raw = await call(`/api/v1/opponents/${team.id}/upload-badge`, { token: coach.token, body: PNG, headers: { "content-type": "image/png" } });
    expect(raw.status, JSON.stringify(raw.data)).toBe(200);
    expect((await find("Badge Rovers")).effective_badge_url).toBeTruthy();

    const form = new FormData();
    form.append("badge", new File([PNG], "badge.png", { type: "image/png" }));
    const viaForm = await call(`/api/v1/opponents/${team.id}/upload-badge`, { token: coach.token, body: form });
    expect(viaForm.status, JSON.stringify(viaForm.data)).toBe(200);

    const notImage = await call(`/api/v1/opponents/${team.id}/upload-badge`, { token: coach.token, body: new TextEncoder().encode("hello"), headers: { "content-type": "text/plain" } });
    expect(notImage.status).toBe(400);

    // The app's fixture cards show the badge instead of initials ("FC" and case don't matter)
    const fx = await call("/api/v1/admin/fixtures", { token: coach.token, body: { opponent: "Badge Rovers FC", date: "2099-10-11", time: "14:00", homeAway: "home" } });
    expect(fx.status, JSON.stringify(fx.data)).toBe(200);
    const upcoming = await call("/api/v1/fixtures/upcoming", { token: parent.token });
    const card = upcoming.data.find((f: any) => f.id === fx.data.id);
    expect(card.opponentBadgeUrl).toBe((await find("Badge Rovers")).effective_badge_url);

    const removed = await call(`/api/v1/opponents/${team.id}`, { method: "DELETE", token: coach.token });
    expect(removed.status, JSON.stringify(removed.data)).toBe(200);
    expect(await find("Badge Rovers")).toBeFalsy();
  });
});
