/**
 * Journey: a new club signs up on the website.
 * Owner creates an account -> lands signed in on a free trial -> picks the
 * club name and URL -> can log back in later and manage the club.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call } from "./helpers";

let n = 0;
const ip = () => ({ "CF-Connecting-IP": `203.0.113.${++n}` });
const owner = (tag: string) => ({
  name: "Jo Manager",
  email: `owner-${tag}-${Date.now()}@example.com`,
  password: "ClubOwnerPass123",
});

async function signUp(tag: string) {
  const body = owner(tag);
  const res = await call("/api/v1/auth/register-owner", { body, headers: ip() });
  return { ...res, body };
}

describe("Club sign-up journey", () => {
  it("creates the club on a 14-day trial and signs the owner straight in", async () => {
    const { status, data, body } = await signUp("trial");

    expect(status).toBe(201);
    expect(data.data.token).toEqual(expect.any(String));
    expect(data.data.user.roles).toEqual(["owner", "tenant_admin"]);
    expect(data.data.tenant.status).toBe("trial");

    const tenant = await env.DB.prepare("SELECT status, plan, trial_ends_at, email FROM tenants WHERE id = ?")
      .bind(data.data.tenant.id).first<any>();
    expect(tenant.status).toBe("trial");
    expect(tenant.email).toBe(body.email.toLowerCase());
    const days = (tenant.trial_ends_at - Date.now() / 1000) / 86400;
    expect(days).toBeGreaterThan(13.9);
    expect(days).toBeLessThanOrEqual(14);

    const me = await call("/api/v1/tenants/me", { token: data.data.token });
    expect(me.status).toBe(200);
    expect(me.data.tenant.id).toBe(data.data.tenant.id);
  });

  it("lets the owner name the club and choose its URL, then log back in to it", async () => {
    const { data, body } = await signUp("setup");
    const token = data.data.token;
    const slug = `rovers-${Date.now()}`;

    const saved = await call("/api/v1/tenants/me", {
      method: "PATCH",
      token,
      body: { name: "Riverside Rovers", slug, primaryColor: "#123456", secondaryColor: "#FFFFFF" },
    });
    expect(saved.status).toBe(200);
    expect(saved.data.tenant.slug).toBe(slug);

    const login = await call("/api/v1/auth/login", { body: { email: body.email, password: body.password }, headers: ip() });
    expect(login.status).toBe(200);
    expect(login.data.data.user.tenant_slug).toBe(slug);
    expect(login.data.data.user.roles).toContain("owner");

    // The owner can manage their own club
    const fixture = await call("/api/v1/admin/fixtures", {
      method: "POST",
      token: login.data.data.token,
      body: { opponent: "Hillside FC", date: "2099-10-04", time: "10:30", venue: "Home", homeAway: "home" },
    });
    expect(fixture.status).toBe(200);
  });

  it("does not let an owner mark their own club as paid", async () => {
    const { data } = await signUp("status");
    await call("/api/v1/tenants/me", { method: "PATCH", token: data.data.token, body: { status: "active" } });

    const row = await env.DB.prepare("SELECT status FROM tenants WHERE id = ?").bind(data.data.tenant.id).first<any>();
    expect(row.status).toBe("trial");
  });

  it("refuses a club URL that is taken or reserved", async () => {
    const first = await signUp("taken-a");
    const second = await signUp("taken-b");
    const slug = `united-${Date.now()}`;

    await call("/api/v1/tenants/me", { method: "PATCH", token: first.data.data.token, body: { slug } });
    const clash = await call("/api/v1/tenants/me", { method: "PATCH", token: second.data.data.token, body: { slug } });
    expect(clash.status).toBe(409);
    expect(clash.data.error.message).toMatch(/taken/i);

    const reserved = await call("/api/v1/tenants/me", { method: "PATCH", token: second.data.data.token, body: { slug: "pricing" } });
    expect(reserved.status).toBe(400);
    expect(reserved.data.error.message).toMatch(/reserved/i);
  });

  it("refuses a second sign-up with the same email", async () => {
    const { body } = await signUp("dupe");
    const again = await call("/api/v1/auth/register-owner", { body, headers: ip() });
    expect(again.status).toBe(409);
    expect(again.data.error.code).toBe("EMAIL_IN_USE");
  });

  it("explains what's wrong with an invalid form", async () => {
    const res = await call("/api/v1/auth/register-owner", {
      body: { name: "Jo", email: "not-an-email", password: "short" },
      headers: ip(),
    });
    expect(res.status).toBe(400);
    expect(res.data.error.message).toEqual(expect.any(String));
  });
});
