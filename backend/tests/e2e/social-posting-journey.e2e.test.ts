/**
 * Journey: automatic posts from Match Centre. A goal is recorded, the phone
 * uploads the graphic, and a minute later it goes to the club app feed,
 * Facebook and Instagram. Undo within the minute stops it; undo afterwards
 * removes it from the app and Facebook. Facebook/Instagram are simulated.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";
import { encryptToken } from "../../src/services/social/tokenCrypto";
import { processDueJobs } from "../../src/services/social/jobs";

afterEach(() => { vi.restoreAllMocks(); });

let seq = 0;
const tap = () => `social-${Date.now()}-${++seq}`;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

/** Pretend Facebook/Instagram: records calls and returns ids. */
function fakeMeta() {
  const calls: string[] = [];
  const f = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push(`${init?.method ?? "GET"} ${u.replace(/^https:\/\/graph\.facebook\.com\/v[\d.]+/, "")}`);
    if (u.endsWith("/photos")) return ok({ id: "photo1", post_id: "page1_post1" });
    if (u.endsWith("/feed")) return ok({ id: "page1_text1" });
    if (u.endsWith("/media")) return ok({ id: "container1" });
    if (u.endsWith("/media_publish")) return ok({ id: "igmedia1" });
    return ok({ success: true });
  });
  return { f: f as unknown as typeof fetch, calls };
}

async function setup(opponent: string) {
  const coach = await registerAdmin("social-coach");
  const sam = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Sam Smith", squadNumber: 9, position: "FW" } })).data.playerId as string;
  const will = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Will Jones", squadNumber: 7, position: "MF" } })).data.playerId as string;
  const fixture = await call("/api/v1/admin/fixtures", {
    token: coach.token,
    body: { opponent, date: "2026-09-27", time: "10:00", venue: "Home Ground", competition: "League", homeAway: "home" },
  });
  const fixtureId = fixture.data.id as string;
  const post = (body: Record<string, unknown>) => call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: tap(), ...body } });
  return { coach, sam, will, fixtureId, post };
}

async function connectMeta() {
  const token = await encryptToken(env.SOCIAL_TOKEN_KEY as string, "page-token-1");
  await env.DB.batch([
    env.DB.prepare(`INSERT OR REPLACE INTO social_connections (tenant_id, platform, account_id, account_name, access_token_enc, created_at) VALUES ('syston', 'facebook', 'page1', 'Syston Tigers', ?, ?)`).bind(token, Date.now()),
    env.DB.prepare(`INSERT OR REPLACE INTO social_connections (tenant_id, platform, account_id, account_name, access_token_enc, created_at) VALUES ('syston', 'instagram', 'ig1', 'systontigers', ?, ?)`).bind(token, Date.now()),
  ]);
}

describe("Automatic social posts", () => {
  it("posts a goal to the club app, Facebook and Instagram after the undo minute", async () => {
    await connectMeta();
    const { coach, sam, will, post } = await setup("Social Rovers");

    const kickOff = await post({ type: "kick_off" });
    // Kick-off goes to the club app only by default
    expect(kickOff.data.data.newPost.targets).toEqual(["feed"]);

    const goal = await post({ type: "goal", playerId: sam, player2Id: will, minute: 23 });
    const job = goal.data.data.newPost;
    expect(job.targets).toEqual(["feed", "facebook", "instagram"]);
    expect(job.caption).toBe("⚽ GOAL! Sam S. 23' (assist Will J.)\nSyston Tigers (test) 1–0 Social Rovers");
    expect(job.graphic).toMatchObject({ headline: "GOAL!", playerName: "Sam S.", secondary: "Assist: Will J.", minute: 23, photoUrl: null });
    expect(job.postAfter - Date.now()).toBeGreaterThan(50_000);

    // The phone uploads the graphic; parents can't
    const parent = await registerMember("social-parent");
    const denied = await call(`/api/v1/social/jobs/${job.id}/graphic`, { method: "POST", token: parent.token, body: JPEG, headers: { "content-type": "image/jpeg" } });
    expect(denied.status).toBe(403);
    const upload = await uploadGraphic(coach.token, job.id);
    expect(upload.data.data.hasImage).toBe(true);

    // Nothing goes out during the undo minute
    const meta = fakeMeta();
    expect(await processDueJobs(env as any, { fetchImpl: meta.f })).toBe(0);

    // A minute later it posts everywhere, once
    const later = Date.now() + 61_000;
    await processDueJobs(env as any, { now: later, fetchImpl: meta.f });
    await processDueJobs(env as any, { now: later + 60_000, fetchImpl: meta.f });
    expect(meta.calls.filter((c) => c.includes("/page1/photos"))).toHaveLength(1);
    expect(meta.calls.filter((c) => c.includes("/ig1/media_publish"))).toHaveLength(1);

    const saved = await env.DB.prepare(`SELECT status, results FROM social_jobs WHERE id = ?`).bind(job.id).first<any>();
    expect(saved.status).toBe("done");
    expect(JSON.parse(saved.results)).toMatchObject({ feed: { ok: true }, facebook: { ok: true, id: "page1_post1" }, instagram: { ok: true, id: "igmedia1" } });

    // Parents see it in the club app feed with the graphic
    const feed = await call("/api/v1/feed", { token: parent.token });
    const item = feed.data.data.find((p: any) => p.id === `social-${job.id}`);
    expect(item.content).toContain("GOAL! Sam S.");
    expect(item.imageUrl).toBe(`https://api.test/api/v1/media/social/syston/${job.id}.jpg`);

    // The graphic is publicly readable (Instagram fetches it) from any site
    const image = await call(`/api/v1/media/social/syston/${job.id}.jpg`);
    expect(image.status).toBe(200);
    expect(image.res.headers.get("cross-origin-resource-policy")).toBe("cross-origin");
  });

  it("undo within the minute stops the post; undo later takes it down from the app and Facebook", async () => {
    await connectMeta();
    const { coach, sam, fixtureId, post } = await setup("Undo Rovers");
    await post({ type: "kick_off" });

    const mistake = await post({ type: "goal", playerId: sam, minute: 5 });
    const undo = await call(`/api/v1/fixtures/${fixtureId}/live/events/${mistake.data.data.events[0].id}`, { method: "DELETE", token: coach.token });
    expect(undo.data.data.undonePost).toEqual({ cancelled: true, instagramLeftUp: false });
    const meta = fakeMeta();
    await processDueJobs(env as any, { now: Date.now() + 200_000, fetchImpl: meta.f });
    expect(meta.calls.some((c) => c.includes("/photos"))).toBe(false);

    // This one goes out, then gets undone
    const goal = await post({ type: "goal", playerId: sam, minute: 9 });
    const job = goal.data.data.newPost;
    await uploadGraphic(coach.token, job.id);
    await processDueJobs(env as any, { now: Date.now() + 61_000, fetchImpl: meta.f });
    const deletes = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok({ success: true }));
    const late = await call(`/api/v1/fixtures/${fixtureId}/live/events/${goal.data.data.events[0].id}`, { method: "DELETE", token: coach.token });
    expect(late.data.data.undonePost).toEqual({ cancelled: true, instagramLeftUp: true });
    expect(deletes.mock.calls.some(([u, init]) => String(u).includes("/page1_post1") && (init as RequestInit)?.method === "DELETE")).toBe(true);
    const feedRow = await env.DB.prepare(`SELECT COUNT(*) AS c FROM feed_posts WHERE id = ?`).bind(`social-${job.id}`).first<any>();
    expect(feedRow.c).toBe(0);
  });

  it("follows the club's settings: name style, undo window and which events post", async () => {
    await connectMeta();
    const { coach, sam, post } = await setup("Settings Rovers");
    const parent = await registerMember("social-settings-parent");

    expect((await call("/api/v1/social/settings", { method: "PUT", token: parent.token, body: { undoWindow: false } })).status).toBe(403);
    const saved = await call("/api/v1/social/settings", {
      method: "PUT", token: coach.token, body: { undoWindow: false, events: { yellow: { feed: true, social: true }, kick_off: { feed: false, social: false } } },
    });
    expect(saved.status).toBe(200);
    expect(saved.data.data).toMatchObject({ undoWindow: false, canConnect: true, connections: { facebook: { id: "page1" }, instagram: { id: "ig1" } } });
    expect(saved.data.data.events.yellow).toEqual({ feed: true, social: true });
    expect((await call("/api/v1/social/settings", { method: "PUT", token: coach.token, body: { events: { nonsense: { feed: true, social: true } } } })).status).toBe(400);

    await call("/api/v1/tenants/me", { method: "PATCH", token: coach.token, body: { publicNameStyle: "initial_last" } });

    expect((await post({ type: "kick_off" })).data.data.newPost).toBeNull();
    const card = (await post({ type: "yellow", playerId: sam, minute: 30 })).data.data.newPost;
    expect(card.caption).toBe("🟨 Yellow card: S. Smith 30'");
    expect(card.targets).toEqual(["feed", "facebook", "instagram"]);
    expect(card.postAfter).toBeLessThanOrEqual(Date.now());

    // Put the test club back to its defaults
    await call("/api/v1/social/settings", { method: "PUT", token: coach.token, body: { undoWindow: true, events: { yellow: { feed: true, social: false }, kick_off: { feed: true, social: false } } } });
    await call("/api/v1/tenants/me", { method: "PATCH", token: coach.token, body: { publicNameStyle: "first_initial" } });
  });

  it("sends club admins to Facebook to connect, and back to their settings", async () => {
    const admin = await registerAdmin("social-connect");
    const start = await call("/api/v1/social/meta/start", { token: admin.token, body: {} });
    expect(start.status).toBe(200);
    const url = new URL(start.data.data.url);
    expect(url.searchParams.get("config_id")).toBe("cfg-1");
    expect(url.searchParams.get("redirect_uri")).toBe("https://api.test/api/v1/social/meta/callback");

    // Cancelled on Facebook: back to settings saying so
    const cancelled = await call(`/api/v1/social/meta/callback?state=${url.searchParams.get("state")}&error=access_denied`);
    expect(cancelled.status).toBe(302);
    expect(cancelled.res.headers.get("location")).toBe("https://site.test/syston/admin/settings?social=cancelled");

    // The same link can't be reused
    expect((await call(`/api/v1/social/meta/callback?state=${url.searchParams.get("state")}&code=x`)).status).toBe(400);
  });
});

async function uploadGraphic(token: string, jobId: string) {
  return call(`/api/v1/social/jobs/${jobId}/graphic`, { method: "POST", token, body: JPEG, headers: { "content-type": "image/jpeg" } });
}
