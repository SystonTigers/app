import { describe, it, expect, vi } from "vitest";
import { exchangeCode, listPages, loginUrl, MetaError, publishFacebook, publishInstagram } from "../meta";

const env = { META_APP_ID: "123", META_APP_SECRET: "shh", META_LOGIN_CONFIG_ID: "cfg9" };
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("Meta Graph API", () => {
  it("builds a Facebook Login for Business link", () => {
    const url = new URL(loginUrl(env, "https://api.example/cb", "state1"));
    expect(url.hostname).toBe("www.facebook.com");
    expect(url.searchParams.get("config_id")).toBe("cfg9");
    expect(url.searchParams.get("state")).toBe("state1");
    expect(url.searchParams.get("scope")).toBeNull();
    expect(new URL(loginUrl({ META_APP_ID: "1" }, "https://x/cb", "s")).searchParams.get("scope")).toContain("pages_manage_posts");
  });

  it("swaps the login code for a long-lived token and lists pages with their Instagram", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(ok({ access_token: "short" }))
      .mockResolvedValueOnce(ok({ access_token: "long" }))
      .mockResolvedValueOnce(ok({ data: [{ id: "p1", name: "Syston Tigers", access_token: "pagetok", instagram_business_account: { id: "ig1", username: "systontigers" } }] }));
    expect(await exchangeCode(env, "code1", "https://x/cb", f)).toBe("long");
    expect(String(f.mock.calls[1][0])).toContain("fb_exchange_token=short");
    const pages = await listPages(env, "long", f);
    expect(pages).toEqual([{ id: "p1", name: "Syston Tigers", accessToken: "pagetok", instagram: { id: "ig1", username: "systontigers" } }]);
  });

  it("posts a photo to the page, or text when there's no image", async () => {
    const f = vi.fn().mockResolvedValueOnce(ok({ id: "photo1", post_id: "p1_post1" })).mockResolvedValueOnce(ok({ id: "p1_post2" }));
    expect(await publishFacebook(env, "p1", "tok", "GOAL!", "https://img/1.jpg", f)).toBe("p1_post1");
    expect(String(f.mock.calls[0][0])).toMatch(/\/p1\/photos$/);
    expect(await publishFacebook(env, "p1", "tok", "Half time", null, f)).toBe("p1_post2");
    expect(String(f.mock.calls[1][0])).toMatch(/\/p1\/feed$/);
  });

  it("publishes to Instagram, waiting while the image is processed", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce(ok({ id: "container1" }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "not ready", code: 9007 } }), { status: 400 }))
      .mockResolvedValueOnce(ok({ id: "media1" }));
    expect(await publishInstagram(env, "ig1", "tok", "GOAL!", "https://img/1.jpg", f, 0)).toBe("media1");
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("reports an expired connection clearly", async () => {
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Session has expired", code: 190 } }), { status: 400 }));
    const err = await publishFacebook(env, "p1", "tok", "x", null, f).catch((e) => e);
    expect(err).toBeInstanceOf(MetaError);
    expect(err.needsReconnect).toBe(true);
  });
});
