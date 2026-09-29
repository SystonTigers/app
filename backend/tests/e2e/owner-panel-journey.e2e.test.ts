/**
 * Journey: the platform owner signs in to the owner panel, sees every club,
 * opens one and changes it (trial, plan, free access, graphics, suspend,
 * reactivate). Suspending signs the club out and stops its logins until it's
 * reactivated. Club admins and wrong passwords get nowhere.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import bcrypt from "bcryptjs";
import { call } from "./helpers";
import { issuePlatformAdminJWT } from "../../src/services/jwt";

const OWNER_EMAIL = "owner-journey@example.com";
const OWNER_PASSWORD = "correct horse battery";
const CLUB = "owner-test-club";
const MEMBER_PASSWORD = "SecurePass123!";

async function makeOwner() {
  await env.DB.prepare(`INSERT OR IGNORE INTO platform_owners (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`)
    .bind("owner_journey", OWNER_EMAIL, bcrypt.hashSync(OWNER_PASSWORD, 4), Date.now()).run();
}

async function makeClub() {
  const trialEnds = Math.floor(Date.now() / 1000) + 3 * 86400;
  await env.DB.prepare(
    `INSERT OR IGNORE INTO tenants (id, slug, name, email, plan, status, trial_ends_at, created_at, updated_at)
     VALUES (?, ?, 'Owner Test Rovers', 'secretary@example.com', 'starter', 'trial', ?, unixepoch(), unixepoch())`,
  ).bind(CLUB, CLUB, trialEnds).run();
  const email = `owner-club-admin-${Date.now()}@example.com`;
  const reg = await call("/api/v1/auth/register", {
    body: { ageConfirmed: true, tenant_id: CLUB, email, password: MEMBER_PASSWORD, profile: { name: "Club Admin" } },
    headers: { "Idempotency-Key": `reg-${email}` },
  });
  expect(reg.status).toBe(201);
  await env.DB.prepare(`UPDATE auth_users SET roles = ? WHERE id = ?`).bind(JSON.stringify(["tenant_admin"]), reg.data.data.user.id).run();
  return { email };
}

const clubLogin = (email: string) => call("/api/v1/auth/login", { body: { tenant_id: CLUB, email, password: MEMBER_PASSWORD } });

describe("Owner panel journey", () => {
  it("signs in, sees clubs and members, and changes a club", async () => {
    await makeOwner();
    const { email: adminEmail } = await makeClub();

    // A club admin can't use the owner panel
    const admin = await clubLogin(adminEmail);
    expect(admin.status).toBe(200);
    const adminToken = admin.data.data.token as string;
    expect([401, 403]).toContain((await call("/api/v1/owner/overview", { token: adminToken })).status);
    expect((await call("/api/v1/owner/overview")).status).toBe(401);
    // So can't an older admin token that isn't a platform owner's
    const oldAdmin = await issuePlatformAdminJWT(env, { tenant_id: "platform", ttlMinutes: 5 });
    expect((await call("/api/v1/owner/overview", { token: oldAdmin })).status).toBe(403);

    // Wrong password, then the right one (email case doesn't matter)
    const wrong = await call("/api/v1/owner/login", { body: { email: OWNER_EMAIL, password: "not the password" } });
    expect(wrong.status).toBe(401);
    expect(wrong.data.error.code).toBe("INVALID_LOGIN");
    expect((await call("/api/v1/owner/login", { body: { email: OWNER_EMAIL } })).status).toBe(400);
    const login = await call("/api/v1/owner/login", { body: { email: OWNER_EMAIL.toUpperCase(), password: OWNER_PASSWORD } });
    expect(login.status).toBe(200);
    const token = login.data.data.token as string;
    expect(login.data.data.expiresAt).toBeGreaterThan(Date.now());

    // Overview counts the club and its trial ending this week
    const overview = (await call("/api/v1/owner/overview", { token })).data.data;
    expect(overview.clubs.total).toBeGreaterThanOrEqual(2);
    expect(overview.trialsEndingSoon.map((t: any) => t.id)).toContain(CLUB);
    expect(overview.recentSignups.map((c: any) => c.id)).toContain(CLUB);

    // Clubs list, search and status filter
    const all = (await call("/api/v1/owner/clubs", { token })).data.data;
    const row = all.find((c: any) => c.id === CLUB);
    expect(row).toMatchObject({ name: "Owner Test Rovers", plan: "starter", status: "trial", members: 1, staff: 1 });
    expect(row.trialDaysLeft).toBe(3);
    expect((await call("/api/v1/owner/clubs?q=rovers", { token })).data.data.map((c: any) => c.id)).toEqual([CLUB]);
    expect((await call("/api/v1/owner/clubs?status=active", { token })).data.data.map((c: any) => c.id)).not.toContain(CLUB);

    // Detail: staff and last sign-in
    const detail = (await call(`/api/v1/owner/clubs/${CLUB}`, { token })).data.data;
    expect(detail.staffList[0]).toMatchObject({ email: adminEmail, roles: ["tenant_admin"] });
    expect(detail.staffList[0].lastLoginAt).toBeGreaterThan(0);
    expect((await call("/api/v1/owner/clubs/no-such-club", { token })).status).toBe(404);

    // Members search needs 3+ characters
    expect((await call("/api/v1/owner/members?q=ow", { token })).data.data).toEqual([]);
    const members = (await call("/api/v1/owner/members?q=owner-club-admin", { token })).data.data;
    expect(members.find((m: any) => m.email === adminEmail)).toMatchObject({ clubId: CLUB, clubName: "Owner Test Rovers" });

    const act = (body: Record<string, unknown>) => call(`/api/v1/owner/clubs/${CLUB}/actions`, { token, body });

    // Bad actions are refused
    expect((await act({ action: "extend_trial", days: 400 })).status).toBe(400);
    expect((await act({ action: "set_plan", plan: "platinum" })).status).toBe(400);
    expect((await act({ action: "graphics", pack: "touchline", on: true })).status).toBe(400);
    expect((await act({ action: "delete_everything" })).status).toBe(400);

    // Extend the trial by 14 days
    const extended = await act({ action: "extend_trial", days: 14 });
    expect(extended.status).toBe(200);
    expect(extended.data.data.club.trialDaysLeft).toBe(17);

    // Move to Pro, unlock Elite graphics, give free access
    expect((await act({ action: "set_plan", plan: "pro" })).data.data.club.plan).toBe("pro");
    expect((await act({ action: "graphics", pack: "elite", on: true })).data.data.club.unlockedPacks).toContain("elite");
    const comped = (await act({ action: "comp", on: true })).data.data.club;
    expect(comped).toMatchObject({ comped: true, status: "active" });

    // Money counts a free club as not paying
    const money = (await call("/api/v1/owner/money", { token })).data.data;
    expect(money.byPlan.map((p: any) => p.plan)).toEqual(expect.arrayContaining(["starter", "pro"]));
    expect(typeof money.monthlyRecurringPence).toBe("number");

    // Suspend: the admin's session stops working and they can't sign in again
    expect((await act({ action: "suspend" })).data.data.club.status).toBe("suspended");
    expect((await call("/api/v1/users/me", { token: adminToken })).status).toBe(401);
    const blocked = await clubLogin(adminEmail);
    expect(blocked.status).toBe(403);
    expect(blocked.data.error.code).toBe("CLUB_SUSPENDED");
    // Extending the trial doesn't lift a suspension
    expect((await act({ action: "extend_trial", days: 7 })).data.data.club.status).toBe("suspended");

    // Reactivate: free access means straight back to active, and sign-in works
    expect((await act({ action: "reactivate" })).data.data.club.status).toBe("active");
    const back = await clubLogin(adminEmail);
    expect(back.status).toBe(200);
    expect((await call("/api/v1/users/me", { token: back.data.data.token })).status).toBe(200);

    // Everything is in the history, newest first, with who did it
    const history = (await call("/api/v1/owner/history", { token })).data.data.filter((h: any) => h.clubId === CLUB);
    expect(history.map((h: any) => h.action).slice(0, 3)).toEqual(["reactivate", "extend_trial", "suspend"]);
    expect(history[0].by).toBe(OWNER_EMAIL);

    // Signing out ends the session
    expect((await call("/api/v1/owner/logout", { method: "POST", token })).status).toBe(200);
    expect((await call("/api/v1/owner/overview", { token })).status).toBe(401);
  });
});
