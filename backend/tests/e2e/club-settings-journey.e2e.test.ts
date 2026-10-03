/**
 * Journey: club settings from the phone app. A club admin uploads the club's
 * own badge (it shows in the app and goes on every graphic), replaces and
 * removes it, and connects Facebook from the app: Facebook lands on a "go back
 * to the app" page and, with several Pages, the app offers the choice.
 * Facebook is simulated.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";

afterEach(() => { vi.restoreAllMocks(); });

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1, 2, 3]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 1, 2, 3, 4]);
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

const keyOf = (url: string) => decodeURIComponent(new URL(url).pathname.replace(/^\/api\/v1\/media\//, ""));
const publicBadge = async () => (await call("/public/syston/info")).data.data.badgeUrl as string | null;

describe("Club settings from the app", () => {
  it("uploads, replaces and removes the club badge", async () => {
    const admin = await registerAdmin("badge-admin");

    // A PNG sent as the raw body (the web app)
    const first = await call("/api/v1/club/badge", { token: admin.token, body: PNG, headers: { "content-type": "image/png" } });
    expect(first.status).toBe(200);
    const firstUrl = first.data.data.badgeUrl as string;
    expect(firstUrl).toMatch(/\/api\/v1\/media\/badges\/syston\/_club\/badge-\d+\.png$/);
    expect(await publicBadge()).toBe(firstUrl);
    expect(await env.R2_MEDIA.head(keyOf(firstUrl))).not.toBeNull();
    // Anyone can load it (club pages, graphics)
    expect((await call(new URL(firstUrl).pathname)).status).toBe(200);

    // A JPEG sent as a form (the phone app) replaces it and the old file goes
    await new Promise((r) => setTimeout(r, 2));
    const form = new FormData();
    form.append("badge", new Blob([JPEG], { type: "image/jpeg" }), "badge.jpg");
    const second = await call("/api/v1/club/badge", { token: admin.token, body: form });
    expect(second.status).toBe(200);
    const secondUrl = second.data.data.badgeUrl as string;
    expect(secondUrl).toMatch(/\/_club\/badge-\d+\.jpg$/);
    expect(await publicBadge()).toBe(secondUrl);
    expect(await env.R2_MEDIA.head(keyOf(firstUrl))).toBeNull();

    // Graphics use it
    const settings = await call("/api/v1/social/settings", { token: admin.token });
    expect(settings.data.data.canManage).toBe(true);

    // The sponsor logo can be sent as a form from the phone too
    const logoForm = new FormData();
    logoForm.append("logo", new Blob([PNG], { type: "image/png" }), "logo.png");
    const logo = await call("/api/v1/social/sponsor-logo", { token: admin.token, body: logoForm });
    expect(logo.data.data.sponsorLogoUrl).toMatch(/\/sponsors\/syston\/logo-\d+\.png$/);
    await call("/api/v1/social/sponsor-logo", { method: "DELETE", token: admin.token });

    // Removing it goes back to initials
    const removed = await call("/api/v1/club/badge", { method: "DELETE", token: admin.token });
    expect(removed.data.data.badgeUrl).toBeNull();
    expect(await publicBadge()).toBeNull();
    expect(await env.R2_MEDIA.head(keyOf(secondUrl))).toBeNull();
  });

  it("only accepts PNG or JPG badges from club admins", async () => {
    const admin = await registerAdmin("badge-rules");
    const svg = await call("/api/v1/club/badge", { token: admin.token, body: new TextEncoder().encode("<svg/>"), headers: { "content-type": "image/svg+xml" } });
    expect(svg.status).toBe(400);
    expect(svg.data.error.message).toMatch(/PNG or JPG/);
    const empty = new FormData();
    expect((await call("/api/v1/club/badge", { token: admin.token, body: empty })).status).toBe(400);
    const big = new Uint8Array(3 * 1024 * 1024 + 1);
    big.set(PNG);
    expect((await call("/api/v1/club/badge", { token: admin.token, body: big, headers: { "content-type": "image/png" } })).status).toBe(413);

    const coach = await registerAdmin("badge-coach", "coach");
    const byCoach = await call("/api/v1/club/badge", { token: coach.token, body: PNG, headers: { "content-type": "image/png" } });
    expect(byCoach.status).toBe(403);
    expect((await call("/api/v1/social/settings", { token: coach.token })).data.data).toMatchObject({ canManage: false, pendingChoice: null });

    const parent = await registerMember("badge-parent");
    expect((await call("/api/v1/club/badge", { token: parent.token, body: PNG, headers: { "content-type": "image/png" } })).status).toBe(403);
    expect((await call("/api/v1/club/badge", { method: "DELETE", body: undefined })).status).toBe(401);
  });

  it("connects Facebook from the app and lets the club choose between Pages", async () => {
    const admin = await registerAdmin("app-connect");

    // Cancelled on Facebook: a page saying so, not the website
    const start = await call("/api/v1/social/meta/start", { token: admin.token, body: { from: "app" } });
    const state = new URL(start.data.data.url).searchParams.get("state");
    const cancelled = await call(`/api/v1/social/meta/callback?state=${state}&error=access_denied`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.res.headers.get("content-type")).toMatch(/text\/html/);
    expect(cancelled.data).toMatch(/Connecting was cancelled/);

    // Two Pages: the app is told to choose
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const u = String(input instanceof Request ? input.url : input);
      if (u.includes("/oauth/access_token")) return ok({ access_token: "user-token" });
      if (u.includes("/me/accounts")) {
        return ok({ data: [
          { id: "pg1", name: "Syston Tigers", access_token: "secret-page-1", instagram_business_account: { id: "ig1", username: "systontigers" } },
          { id: "pg2", name: "Danny's Plumbing", access_token: "secret-page-2" },
        ] });
      }
      return ok({});
    });
    const again = await call("/api/v1/social/meta/start", { token: admin.token, body: { from: "app" } });
    const state2 = new URL(again.data.data.url).searchParams.get("state");
    const back = await call(`/api/v1/social/meta/callback?state=${state2}&code=abc`);
    expect(back.status).toBe(200);
    expect(back.data).toMatch(/choose your club's Page/);

    const waiting = await call("/api/v1/social/settings", { token: admin.token });
    const choice = waiting.data.data.pendingChoice;
    expect(choice.pages).toEqual([
      { id: "pg1", name: "Syston Tigers", instagram: "systontigers" },
      { id: "pg2", name: "Danny's Plumbing", instagram: null },
    ]);
    expect(JSON.stringify(waiting.data)).not.toMatch(/secret-page/);

    const chosen = await call("/api/v1/social/meta/select", { token: admin.token, body: { key: choice.key, pageId: "pg1" } });
    expect(chosen.status).toBe(200);
    expect(chosen.data.data.connections).toEqual({ facebook: { id: "pg1", name: "Syston Tigers" }, instagram: { id: "ig1", name: "systontigers" } });
    expect(chosen.data.data.pendingChoice).toBeNull();

    // The website flow is unchanged: back to its settings page
    const web = await call("/api/v1/social/meta/start", { token: admin.token, body: {} });
    const state3 = new URL(web.data.data.url).searchParams.get("state");
    const toSite = await call(`/api/v1/social/meta/callback?state=${state3}`);
    expect(toSite.status).toBe(302);
    expect(toSite.res.headers.get("location")).toBe("https://site.test/syston/admin/settings?social=cancelled");

    await call("/api/v1/social/connections/meta", { method: "DELETE", token: admin.token });
  });
});
