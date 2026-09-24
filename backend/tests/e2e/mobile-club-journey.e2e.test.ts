/**
 * Journey: a parent opens the app, finds their club, creates an account and
 * the app loads their profile and club.
 */
import { describe, it, expect } from "vitest";
import { call } from "./helpers";

let n = 0;
const ip = () => ({ "CF-Connecting-IP": `198.51.100.${++n}` });

async function createClub(name: string) {
  const email = `owner-${Date.now()}-${++n}@example.com`;
  const signup = await call("/api/v1/auth/register-owner", {
    body: { name: "Owner", email, password: "ClubOwnerPass123", clubName: name },
    headers: ip(),
  });
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now() % 100000}`;
  await call("/api/v1/tenants/me", { method: "PATCH", token: signup.data.data.token, body: { name, slug } });
  return { slug, ownerToken: signup.data.data.token as string, ownerEmail: email };
}

describe("Mobile app club journey", () => {
  it("finds a club by part of its name, but not clubs still being set up", async () => {
    const { slug } = await createClub("Meadowbank Harriers");
    // A sign-up that never picked a URL
    await call("/api/v1/auth/register-owner", {
      body: { name: "Half", email: `half-${Date.now()}@example.com`, password: "ClubOwnerPass123", clubName: "Meadowbank Unfinished" },
      headers: ip(),
    });

    const res = await call("/api/v1/clubs/search?q=meadow");
    expect(res.status).toBe(200);
    const slugs = res.data.data.map((c: any) => c.slug);
    expect(slugs).toContain(slug);
    expect(slugs.some((s: string) => /^club-[0-9a-f]{8}$/.test(s))).toBe(false);
    expect(res.data.data[0]).toEqual(expect.objectContaining({ name: expect.any(String), slug: expect.any(String) }));
  });

  it("ignores searches that are too short and treats % as a normal character", async () => {
    expect((await call("/api/v1/clubs/search?q=a")).data.data).toEqual([]);
    expect((await call("/api/v1/clubs/search?q=%25%25")).data.data).toEqual([]);
  });

  it("lets a parent join the club they found and loads their profile", async () => {
    const { slug } = await createClub("Kingsway Colts");
    const email = `parent-${Date.now()}@example.com`;

    const reg = await call("/api/v1/auth/register", {
      body: { tenant_id: slug, email, password: "ParentPass123", profile: { firstName: "Sam", lastName: "Parent" } },
      headers: { "Idempotency-Key": `reg-${email}`, ...ip() },
    });
    expect(reg.status).toBe(201);
    expect(reg.data.data.user.roles).toEqual(["tenant_member"]);

    const me = await call("/api/v1/users/me", { token: reg.data.data.token });
    expect(me.status).toBe(200);
    expect(me.data.user).toEqual(expect.objectContaining({
      email, firstName: "Sam", lastName: "Parent", tenant_slug: slug, roles: ["tenant_member"],
    }));

    // Logging in to that club by its web address works too
    const login = await call("/api/v1/auth/login", { body: { tenant_id: slug, email, password: "ParentPass123" }, headers: ip() });
    expect(login.status).toBe(200);
    expect(login.data.data.user.tenant_slug).toBe(slug);
  });

  it("gives the club owner their name from sign-up", async () => {
    const { ownerToken } = await createClub("Ashby Athletic");
    const me = await call("/api/v1/users/me", { token: ownerToken });
    expect(me.status).toBe(200);
    expect(me.data.user.firstName).toBe("Owner");
    expect(me.data.user.roles).toContain("owner");
  });

  it("saves a changed name and phone number", async () => {
    const { slug } = await createClub("Hinckley Hornets");
    const email = `edit-${Date.now()}@example.com`;
    const reg = await call("/api/v1/auth/register", {
      body: { tenant_id: slug, email, password: "ParentPass123", profile: { firstName: "Al" } },
      headers: { "Idempotency-Key": `reg-${email}`, ...ip() },
    });
    const token = reg.data.data.token;

    const saved = await call("/api/v1/users/profile", { method: "PUT", token, body: { firstName: "Alex", lastName: "Jones", phone: "07700 900123" } });
    expect(saved.status).toBe(200);

    const me = await call("/api/v1/users/me", { token });
    expect(me.data.user).toEqual(expect.objectContaining({ firstName: "Alex", lastName: "Jones" }));

    const bad = await call("/api/v1/users/profile", { method: "PUT", token, body: { firstName: 42 } });
    expect(bad.status).toBe(400);
  });

  it("logging out ends that session only", async () => {
    const { slug } = await createClub("Oadby Owls");
    const email = `logout-${Date.now()}@example.com`;
    await call("/api/v1/auth/register", {
      body: { tenant_id: slug, email, password: "ParentPass123" },
      headers: { "Idempotency-Key": `reg-${email}`, ...ip() },
    });
    const phone = (await call("/api/v1/auth/login", { body: { tenant_id: slug, email, password: "ParentPass123" }, headers: ip() })).data.data.token;
    const laptop = (await call("/api/v1/auth/login", { body: { tenant_id: slug, email, password: "ParentPass123" }, headers: ip() })).data.data.token;

    expect((await call("/api/v1/auth/logout", { method: "POST", token: phone })).status).toBe(200);
    expect((await call("/api/v1/users/me", { token: phone })).status).toBe(401);
    expect((await call("/api/v1/users/me", { token: laptop })).status).toBe(200);

    // Logging back in on the same phone works straight away
    const again = await call("/api/v1/auth/login", { body: { tenant_id: slug, email, password: "ParentPass123" }, headers: ip() });
    expect((await call("/api/v1/users/me", { token: again.data.data.token })).status).toBe(200);
  });

  it("requires a login for the profile", async () => {
    expect((await call("/api/v1/users/me")).status).toBe(401);
  });
});
