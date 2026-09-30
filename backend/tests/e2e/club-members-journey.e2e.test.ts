/**
 * Journey: the club admin sees everyone at the club and makes a parent a
 * coach. The change applies when the person signs in again (their old session
 * ends). Coaches can see the list but not change roles; families can't see it,
 * and the @mention search never shows families other people's emails.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember, TENANT } from "./helpers";

const login = (email: string) => call("/api/v1/auth/login", { body: { tenant_id: TENANT, email, password: "SecurePass123!" } });

describe("Club members journey", () => {
  it("lists members and changes roles safely", async () => {
    const admin = await registerAdmin("members-admin");
    const coach = await registerAdmin("members-coach", "coach");
    const mum = await registerMember("members-mum");

    // Families can't see the member list; staff can
    expect((await call("/api/v1/club/members", { token: mum.token })).status).toBe(403);
    const list = await call("/api/v1/club/members", { token: admin.token });
    expect(list.status).toBe(200);
    expect(list.data.data.canChangeRoles).toBe(true);
    const mumRow = list.data.data.members.find((m: any) => m.id === mum.userId);
    expect(mumRow).toMatchObject({ email: mum.email, role: "parent" });
    const coachView = await call("/api/v1/club/members", { token: coach.token });
    expect(coachView.data.data.canChangeRoles).toBe(false);

    const setRole = (token: string, id: string, role: unknown) => call(`/api/v1/club/members/${id}/role`, { method: "PUT", token, body: { role } });

    // Only admins, valid roles, not yourself, only people in this club
    expect((await setRole(coach.token, mum.userId, "coach")).status).toBe(403);
    expect((await setRole(admin.token, mum.userId, "superuser")).status).toBe(400);
    expect((await setRole(admin.token, admin.userId, "parent")).status).toBe(400);
    expect((await setRole(admin.token, "user_not_here", "coach")).status).toBe(404);

    // The owner can't be demoted
    await env.DB.prepare(`UPDATE auth_users SET roles = ? WHERE id = ?`).bind(JSON.stringify(["owner", "tenant_admin"]), coach.userId).run();
    expect((await setRole(admin.token, coach.userId, "parent")).status).toBe(400);
    await env.DB.prepare(`UPDATE auth_users SET roles = ? WHERE id = ?`).bind(JSON.stringify(["coach"]), coach.userId).run();

    // Before: mum can't change club content
    expect((await call("/api/v1/admin/squad", { token: mum.token, body: { name: "Not Allowed", squadNumber: 71 } })).status).toBe(403);

    // Admin makes mum a coach: her old session ends, and after signing in again she's staff
    const changed = await setRole(admin.token, mum.userId, "coach");
    expect(changed.status).toBe(200);
    expect(changed.data.data).toMatchObject({ id: mum.userId, role: "coach", roles: ["coach"] });
    expect((await call("/api/v1/users/me", { token: mum.token })).status).toBe(401);
    await new Promise((r) => setTimeout(r, 1100)); // tokens are dated to the second
    const again = await login(mum.email);
    expect(again.status).toBe(200);
    expect((await call("/api/v1/admin/squad", { token: again.data.data.token, body: { name: "Coach Added", squadNumber: 72 } })).status).toBeLessThan(300);

    // Mentions: families find people by name only and never see emails
    const parent = await registerMember("members-dad");
    const search = await call("/api/v1/members/search?q=members", { token: parent.token });
    expect(search.status).toBe(200);
    expect(search.data.data.every((m: any) => m.email === undefined)).toBe(true);
    expect((await call("/api/v1/members/search?q=example.com", { token: parent.token })).data.data).toEqual([]);
    const staffSearch = await call("/api/v1/members/search?q=members-mum", { token: admin.token });
    expect(staffSearch.data.data.some((m: any) => m.email === mum.email)).toBe(true);
  });
});
