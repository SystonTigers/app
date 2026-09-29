/**
 * Journey: a parent says whether their child's photo and video can be used
 * publicly. Without a "yes", the photo never appears on the public club page
 * or in posts, and staff see who has no video consent in the line-up and on
 * highlight clips.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Photo and video consent journey", () => {
  it("lets parents decide and keeps photos private until they do", async () => {
    const coach = await registerAdmin("consent-coach");
    const parent = await registerMember("consent-parent");
    const otherParent = await registerMember("consent-other");
    const add = async (name: string, n: number) => (await call("/api/v1/admin/squad", { token: coach.token, body: { name, squadNumber: n } })).data.playerId as string;
    const child = await add("Casey Consent", 31);
    const other = await add("Olly Other", 32);
    await env.DB.prepare(`UPDATE squad SET headshot_url = 'https://img.example/' || id || '.jpg' WHERE id IN (?, ?)`).bind(child, other).run();
    await env.DB.prepare(`INSERT INTO auth_user_players (user_id, player_id, tenant_id) VALUES (?, ?, 'syston')`).bind(parent.userId, child).run();
    await env.DB.prepare(`UPDATE tenants SET public_photos = 1 WHERE id = 'syston'`).run();

    // The club allows photos, but no parent has said yes yet: no photo on the public page
    const photoOf = async (id: string) => ((await call("/public/syston/squad")).data.data as any[]).find((p) => p.id === id)?.photo;
    expect(await photoOf(child)).toBeUndefined();

    // A parent sees only their own child, not asked yet
    const mine = (await call("/api/v1/consent", { token: parent.token })).data.data;
    expect(mine.canEditAll).toBe(false);
    expect(mine.players).toEqual([expect.objectContaining({ playerId: child, photos: null, video: null })]);

    // They can't answer for someone else's child
    expect((await call(`/api/v1/players/${other}/consent`, { method: "PUT", token: parent.token, body: { photos: true } })).status).toBe(403);
    expect((await call(`/api/v1/players/${child}/consent`, { method: "PUT", token: otherParent.token, body: { photos: true } })).status).toBe(403);
    expect((await call(`/api/v1/players/${child}/consent`, { method: "PUT", token: parent.token, body: { photos: "yes" } })).status).toBe(400);

    // Yes to photos, no to video
    const saved = await call(`/api/v1/players/${child}/consent`, { method: "PUT", token: parent.token, body: { photos: true, video: false } });
    expect(saved.status).toBe(200);
    expect(saved.data.data).toMatchObject({ photos: true, video: false, source: "parent" });
    expect(await photoOf(child)).toBe(`https://img.example/${child}.jpg`);
    expect(await photoOf(other)).toBeUndefined();

    // Staff see the whole squad and can record a paper form
    const all = (await call("/api/v1/consent", { token: coach.token })).data.data;
    expect(all.canEditAll).toBe(true);
    expect(all.players.find((p: any) => p.playerId === other)).toMatchObject({ photos: null, video: null });
    const paper = await call(`/api/v1/players/${other}/consent`, { method: "PUT", token: coach.token, body: { video: true } });
    expect(paper.data.data).toMatchObject({ photos: null, video: true, source: "staff" });

    // Line-up: staff are told who has no video consent (they'll be on the live stream)
    const fixture = await call("/api/v1/admin/fixtures", { token: coach.token, body: { opponent: "Consent Rovers", date: "2026-09-26", time: "10:00", homeAway: "home" } });
    const fixtureId = fixture.data.id as string;
    const extra = [await add("Extra One", 33), await add("Extra Two", 34), await add("Extra Three", 35)];
    await env.DB.prepare(`UPDATE squad SET video_consent = 1 WHERE id IN (?, ?, ?)`).bind(...extra).run();
    const starters = [child, other, ...extra];
    const lineup = await call(`/api/v1/fixtures/${fixtureId}/lineup`, { method: "PUT", token: coach.token, body: { teamSize: 5, starters, subs: [] } });
    expect(lineup.status).toBe(200);
    expect(lineup.data.data.noVideoConsent).toContain("Casey Consent");
    expect(lineup.data.data.noVideoConsent).not.toContain("Olly Other");
    expect((await call(`/api/v1/fixtures/${fixtureId}/lineup`, { token: parent.token })).data.data.noVideoConsent).toBeUndefined();

    // Highlights: the clip with Casey is flagged for staff
    const t0 = Date.now() - 20 * 60_000;
    let n = 0;
    const post = (body: Record<string, unknown>, s: number) =>
      call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: `consent-${Date.now()}-${n++}`, occurredAt: t0 + s * 1000, ...body } });
    await post({ type: "kick_off" }, 0);
    await post({ type: "goal", playerId: child, player2Id: other, minute: 2 }, 100);
    await post({ type: "goal", playerId: other, minute: 4 }, 200);
    const view = (await call(`/api/v1/fixtures/${fixtureId}/highlights`, { token: coach.token })).data.data;
    expect(view.momentsFromKickOff.map((m: any) => m.noVideoConsent)).toEqual([["Casey Consent"], []]);
    const parentView = (await call(`/api/v1/fixtures/${fixtureId}/highlights`, { token: parent.token })).data.data;
    expect(parentView.momentsFromKickOff).toEqual([]);
  });
});
