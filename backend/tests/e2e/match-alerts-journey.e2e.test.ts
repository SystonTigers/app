/**
 * Journey: match day for parents who can't be there.
 *
 * - Everyone's phone registers for notifications (phone app and web app).
 * - A parent at the ground is marked "at the match" (their phone works it out;
 *   only yes/no reaches us) and gets no notifications; everyone else does.
 * - Updates wait for the undo window, so an undone goal never notifies; one
 *   that already went out gets a correction.
 * - The manager pastes the YouTube link (or it's found on the club's channel):
 *   the app shows the video and people away from the ground hear "Live now" once.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";
import { processDueAlerts } from "../../src/services/matchAlerts/queue";
import { detectStreams } from "../../src/services/stream/detect";
import { encryptToken } from "../../src/services/social/tokenCrypto";
import { ukTime } from "../../src/services/social/scheduler";

let seq = 0;
const tap = () => `md-tap-${Date.now()}-${++seq}`;
const expoToken = (name: string) => `ExponentPushToken[${name}-${Date.now()}-${++seq}]`;
// A browser push subscription as the web app sends it (keys are a real P-256 point + 16 bytes)
const webSubscription = (n: number) => JSON.stringify({
  endpoint: `https://web.push.example.com/send/${n}-${Date.now()}`,
  keys: { p256dh: "BNzV-dGFBW-6zSAbSxx_ZjjpxH7zhJIhZg7tGGYcaMAJgKLtaYgHPzEf3-a3ZaoDSL6dUCVlczRjorYC-oDatGc", auth: "_zq0nrhdBcyfgr7B5Vt4Wg" },
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Push services answer OK; Expo tickets say ok for every message. Returns who was told what. */
function mockPushServices(extra?: (url: string, init?: RequestInit) => Response | null) {
  const expo: { to: string; title: string }[] = [];
  const web: string[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const custom = extra?.(url, init);
    if (custom) return custom;
    if (url.startsWith("https://exp.host/")) {
      const messages = JSON.parse(String(init?.body)) as { to: string; title: string }[];
      expo.push(...messages);
      return json({ data: messages.map(() => ({ status: "ok", id: "ticket" })) });
    }
    if (url.startsWith("https://web.push.example.com/")) {
      web.push(url);
      return new Response(null, { status: 201 });
    }
    return new Response("unexpected", { status: 500 });
  });
  return { expo, web, spy };
}

async function register(token: string, device: string, platform: "ios" | "web") {
  const res = await call("/api/v1/push/register", { token, body: { platform, token: device } });
  expect(res.status).toBe(200);
}

async function setup(opponent: string, venue = "Memorial Park, LE7 1LA") {
  const coach = await registerAdmin("md-coach");
  const atGround = await registerMember("md-at-ground");
  const away = await registerMember("md-away");
  const onWeb = await registerMember("md-web");
  const now = ukTime(new Date());
  const time = `${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}`;
  const fixture = await call("/api/v1/admin/fixtures", { token: coach.token, body: { opponent, date: now.date, time, venue, competition: "League", homeAway: "home" } });
  const striker = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Sam Striker", squadNumber: 9, position: "FW" } })).data.playerId as string;

  const devices = { coach: expoToken("coach"), atGround: expoToken("ground"), away: expoToken("away"), web: webSubscription(seq) };
  await register(coach.token, devices.coach, "ios");
  await register(atGround.token, devices.atGround, "ios");
  await register(away.token, devices.away, "ios");
  await register(onWeb.token, devices.web, "web");
  return { coach, atGround, away, onWeb, devices, fixtureId: fixture.data.id as string, striker };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Match day journey", () => {
  it("only rejects push tokens we can't send to", async () => {
    const member = await registerMember("md-token");
    expect((await call("/api/v1/push/register", { token: member.token, body: { platform: "web", token: "not-a-subscription" } })).status).toBe(400);
    expect((await call("/api/v1/push/register", { token: member.token, body: { platform: "ios", token: "old-fcm-token" } })).status).toBe(400);
    const config = await call("/api/v1/push/config");
    expect(config.data.data.webPushKey).toMatch(/^B[A-Za-z0-9_-]{86}$/);
  });

  it("tells people away from the ground, not the ones who are there", async () => {
    const { coach, atGround, away, devices, fixtureId, striker } = await setup("Alert Rovers");

    // Match day: where the ground is comes from the venue's postcode
    const postcodes = mockPushServices((url) => url.startsWith("https://api.postcodes.io/")
      ? json({ status: 200, result: { latitude: 52.6993, longitude: -1.0712 } })
      : null);
    const day = await call("/api/v1/matchday", { token: away.token });
    expect(day.status).toBe(200);
    const today = day.data.data.fixtures.find((f: any) => f.id === fixtureId);
    expect(today).toMatchObject({ opponent: "Alert Rovers", venueLocation: { lat: 52.6993, lng: -1.0712 }, stream: null, attendance: null });
    expect(typeof today.kickOffAt).toBe("number");
    expect(day.data.data.radiusMeters).toBe(500);
    postcodes.spy.mockRestore();

    // One parent's phone says they're at the ground. A manual choice beats the phone.
    const mark = (token: string, body: unknown) => call(`/api/v1/fixtures/${fixtureId}/attendance`, { method: "PUT", token, body });
    expect((await mark(atGround.token, { atVenue: "yes", source: "location" })).status).toBe(400);
    expect((await mark(atGround.token, { atVenue: true, source: "manual" })).data.data).toEqual({ atVenue: true, source: "manual" });
    expect((await mark(atGround.token, { atVenue: false, source: "location" })).data.data).toEqual({ atVenue: true, source: "manual" });
    expect((await mark(away.token, { atVenue: false, source: "location" })).data.data).toEqual({ atVenue: false, source: "location" });

    // Kick-off and a goal from the touchline
    const post = (body: Record<string, unknown>) => call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: tap(), ...body } });
    expect((await post({ type: "kick_off", halfLength: 30 })).status).toBe(201);
    expect((await post({ type: "goal", playerId: striker, minute: 12 })).status).toBe(201);

    // Nothing goes out during the undo window
    const push = mockPushServices();
    await processDueAlerts(env as any, Date.now());
    expect(push.expo).toHaveLength(0);

    await processDueAlerts(env as any, Date.now() + 61_000);
    const told = push.expo.map((m) => m.to);
    expect(told).toContain(devices.away);
    expect(told).not.toContain(devices.atGround); // at the ground
    expect(told).not.toContain(devices.coach);    // recorded it
    expect(push.web).toHaveLength(2);              // the web app user, kick-off and goal
    const goal = push.expo.find((m) => m.to === devices.away && m.title.startsWith("⚽"));
    expect(goal?.title).toBe("⚽ GOAL! Syston Tigers (test) 1-0 Alert Rovers");

    // Sent once: running again sends nothing new
    await processDueAlerts(env as any, Date.now() + 120_000);
    expect(push.expo.filter((m) => m.to === devices.away)).toHaveLength(2);
  });

  it("never announces an undone goal, and corrects one that already went out", async () => {
    const { coach, devices, fixtureId, striker } = await setup("Undo United");
    const post = (body: Record<string, unknown>) => call(`/api/v1/fixtures/${fixtureId}/live/events`, { token: coach.token, body: { clientEventId: tap(), ...body } });
    await post({ type: "kick_off" });
    const wrong = (await post({ type: "goal", playerId: striker })).data.data.events[0];
    await call(`/api/v1/fixtures/${fixtureId}/live/events/${wrong.id}`, { method: "DELETE", token: coach.token });

    const push = mockPushServices();
    await processDueAlerts(env as any, Date.now() + 61_000);
    expect(push.expo.filter((m) => m.to === devices.away).map((m) => m.title)).toEqual(["Kick-off: Syston Tigers (test) v Undo United"]);

    // This one goes out, then turns out to be a mistake
    const second = (await post({ type: "goal", playerId: striker })).data.data.events[0];
    await processDueAlerts(env as any, Date.now() + 61_000);
    await call(`/api/v1/fixtures/${fixtureId}/live/events/${second.id}`, { method: "DELETE", token: coach.token });
    await processDueAlerts(env as any, Date.now() + 1_000);
    const titles = push.expo.filter((m) => m.to === devices.away).map((m) => m.title);
    expect(titles.at(-1)).toBe("Correction: Syston Tigers (test) 0-0 Undo United");
  });

  it("shows the manager's YouTube link in the app and says we're live once", async () => {
    const { coach, away, devices, fixtureId } = await setup("Stream City");
    const setStream = (token: string, url: string) => call(`/api/v1/fixtures/${fixtureId}/stream`, { method: "PUT", token, body: { url } });

    expect((await setStream(away.token, "https://youtu.be/dQw4w9WgXcQ")).status).toBe(403);
    expect((await setStream(coach.token, "https://example.com/video")).status).toBe(400);

    const push = mockPushServices();
    const set = await setStream(coach.token, "https://www.youtube.com/live/dQw4w9WgXcQ?si=share");
    expect(set.status).toBe(200);
    expect(set.data.data.stream).toMatchObject({ videoId: "dQw4w9WgXcQ", status: "live", source: "link", embeddable: true });
    await setStream(coach.token, "https://youtu.be/dQw4w9WgXcQ");
    // "Live now" is sent straight away (in the background), and only once
    await processDueAlerts(env as any, Date.now());
    await vi.waitFor(() => {
      expect(push.expo.filter((m) => m.to === devices.away).map((m) => m.title)).toEqual(["🔴 Live now: Syston Tigers (test) v Stream City"]);
    });

    const day = await call("/api/v1/matchday", { token: away.token });
    const today = day.data.data.fixtures.find((f: any) => f.id === fixtureId);
    expect(today.stream.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&playsinline=1&rel=0");

    expect((await call(`/api/v1/fixtures/${fixtureId}/stream`, { method: "DELETE", token: coach.token })).data.data.stream).toBeNull();
  });

  it("finds the stream on the club's connected YouTube channel", async () => {
    const { coach, away, fixtureId } = await setup("Channel Athletic");
    const settings = await call("/api/v1/stream/settings", { token: coach.token });
    expect(settings.data.data).toMatchObject({ canConnect: true, youtube: { connected: false } });
    const start = await call("/api/v1/stream/youtube/start", { method: "POST", token: coach.token, body: {} });
    expect(start.data.data.url).toContain("accounts.google.com");
    expect(start.data.data.url).toContain("youtube.readonly");

    await env.DB.prepare(
      `INSERT OR REPLACE INTO social_connections (tenant_id, platform, account_id, account_name, access_token_enc, connected_by, created_at)
       VALUES ('syston', 'youtube', 'UC123', 'Syston Tigers TV', ?, NULL, ?)`,
    ).bind(await encryptToken(env.SOCIAL_TOKEN_KEY as string, "refresh-1"), Date.now()).run();
    await env.KV_IDEMP.delete("yt_access:syston");
    // Earlier journeys' matches today are over, so the stream belongs to this one
    await env.DB.prepare(`UPDATE fixtures SET match_status = 'full_time' WHERE tenant_id = 'syston' AND id != ?`).bind(fixtureId).run();

    let live = true;
    mockPushServices((url) => {
      if (url === "https://oauth2.googleapis.com/token") return json({ access_token: "access-1", expires_in: 3600 });
      if (url.startsWith("https://www.googleapis.com/youtube/v3/liveBroadcasts")) {
        return json({ items: live ? [{ id: "abcdefghijk", snippet: { title: "Match", actualStartTime: new Date().toISOString() }, status: { privacyStatus: "unlisted" }, contentDetails: { enableEmbed: true } }] : [] });
      }
      return null;
    });
    expect(await detectStreams(env as any)).toBeGreaterThanOrEqual(1);
    let today = (await call("/api/v1/matchday", { token: away.token })).data.data.fixtures.find((f: any) => f.id === fixtureId);
    expect(today.stream).toMatchObject({ videoId: "abcdefghijk", source: "youtube", status: "live" });

    // The stream stops: the video stays for watching back (checked every 5 minutes while it's on)
    live = false;
    await detectStreams(env as any, Math.ceil((Date.now() + 1) / 300_000) * 300_000);
    today = (await call("/api/v1/matchday", { token: away.token })).data.data.fixtures.find((f: any) => f.id === fixtureId);
    expect(today.stream).toMatchObject({ videoId: "abcdefghijk", status: "ended" });

    expect((await call("/api/v1/stream/settings", { token: coach.token })).data.data.youtube).toMatchObject({ connected: true, channelName: "Syston Tigers TV" });
    await call("/api/v1/stream/youtube", { method: "DELETE", token: coach.token });
    expect((await call("/api/v1/stream/settings", { token: coach.token })).data.data.youtube.connected).toBe(false);
  });
});
