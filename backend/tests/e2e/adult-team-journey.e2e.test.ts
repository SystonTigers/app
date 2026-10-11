/**
 * Journey: a club switches to an adult team (Club Settings → Team type).
 * Full names and photos go on; photos and clips are used unless the player
 * says no for themselves; upcoming fixtures are public; new members join as
 * players. Switching back to juniors restores the junior rules.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerWaiting, TENANT } from "./helpers";

describe("Adult team", () => {
  it("uses photos unless a player says no, shows fixtures publicly and signs people up as players", async () => {
    const admin = await registerAdmin("adult-admin");

    // A junior club to start with: photos need a yes, fixtures are members only
    const add = await call("/api/v1/admin/squad", { token: admin.token, body: { name: "Danny Adult", squadNumber: 9 } });
    const playerId = add.data.playerId as string;
    await env.DB.prepare(`UPDATE squad SET photo_url = 'https://img.test/danny.jpg', photo_consent = NULL, video_consent = NULL WHERE id = ?`).bind(playerId).run();
    const fx = await call("/api/v1/admin/fixtures", { token: admin.token, body: { opponent: "Sunday Rovers", date: "2099-11-01", time: "10:30", venue: "The Rec", homeAway: "home" } });
    expect(fx.status).toBe(200);
    const publicFixtures = async () => (await call(`/public/${TENANT}/fixtures`)).data;
    const photoOf = async () => (await call(`/public/${TENANT}/squad`)).data.data.find((p: any) => p.id === playerId)?.photo ?? null;
    expect((await publicFixtures()).meta?.membersOnly).toBe(true);
    expect(await photoOf()).toBeNull();

    // Only the club's admins can change it
    const parent = await registerWaiting("adult-parent");
    expect((await call("/api/v1/tenants/me", { method: "PATCH", token: parent.token, body: { teamType: "adult" } })).status).toBeGreaterThanOrEqual(400);
    expect((await call("/api/v1/tenants/me", { method: "PATCH", token: admin.token, body: { teamType: "teenagers" } })).status).toBe(400);

    // Switch to adults
    const set = await call("/api/v1/tenants/me", { method: "PATCH", token: admin.token, body: { teamType: "adult" } });
    expect(set.status, JSON.stringify(set.data)).toBe(200);
    expect((await call(`/public/${TENANT}/info`)).data.data.teamType).toBe("adult");
    const club = await env.DB.prepare(`SELECT team_type, public_name_style, public_photos FROM tenants WHERE id = ?`).bind(TENANT).first<any>();
    expect(club).toMatchObject({ team_type: "adult", public_name_style: "full", public_photos: 1 });

    // Not answered counts as yes; the fixture, time and ground are public
    expect(await photoOf()).toBe("https://img.test/danny.jpg");
    const list = await publicFixtures();
    expect(list.meta?.membersOnly).toBeFalsy();
    expect(list.data.some((f: any) => /Sunday Rovers/.test(JSON.stringify(f)))).toBe(true);

    // The player says no: no photo
    await env.DB.prepare(`UPDATE squad SET photo_consent = 0, video_consent = 0 WHERE id = ?`).bind(playerId).run();
    expect(await photoOf()).toBeNull();

    // A new sign-up who doesn't choose joins as a player, not a parent
    const joiner = await registerWaiting("adult-joiner");
    const profile = await env.DB.prepare(`SELECT profile FROM auth_users WHERE id = ?`).bind(joiner.userId).first<{ profile: string }>();
    expect(JSON.parse(profile!.profile).joinAs).toBe("player");

    // Back to juniors: initials, no photos, members-only fixtures
    await env.DB.prepare(`UPDATE squad SET photo_consent = NULL WHERE id = ?`).bind(playerId).run();
    expect((await call("/api/v1/tenants/me", { method: "PATCH", token: admin.token, body: { teamType: "junior" } })).status).toBe(200);
    const after = await env.DB.prepare(`SELECT team_type, public_name_style, public_photos FROM tenants WHERE id = ?`).bind(TENANT).first<any>();
    expect(after).toMatchObject({ team_type: "junior", public_name_style: "first_initial", public_photos: 0 });
    expect(await photoOf()).toBeNull();
    expect((await publicFixtures()).meta?.membersOnly).toBe(true);
    const junior = await registerWaiting("junior-joiner");
    const jp = await env.DB.prepare(`SELECT profile FROM auth_users WHERE id = ?`).bind(junior.userId).first<{ profile: string }>();
    expect(JSON.parse(jp!.profile).joinAs).toBe("parent");
  });
});
