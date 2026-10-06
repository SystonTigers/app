/**
 * Journey: people sign up as a parent, player, supporter or coach and wait
 * for the club's staff to let them in. Until then they can't see the squad,
 * fixtures or training. Staff are told, approve (getting the role they asked
 * for; a coach request stays for an admin) or turn them down. A code from the
 * coach for their child lets a parent straight in. Nobody can make themselves
 * staff by what they send.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, TENANT } from "./helpers";

let n = 0;
async function signUp(requestedRole: unknown, extra: Record<string, unknown> = {}) {
  const email = `signup-${String(requestedRole)}-${Date.now()}-${++n}@example.com`;
  const res = await call("/api/v1/auth/register", {
    body: { ageConfirmed: true, tenant_id: TENANT, email, password: "SecurePass123!", profile: { name: `Signup ${n}`, requestedRole, ...extra }, ...extra },
    headers: { "Idempotency-Key": `reg-${email}` },
  });
  expect(res.status).toBe(201);
  return { id: res.data.data.user.id as string, token: res.data.data.token as string, roles: res.data.data.user.roles as string[] };
}

describe("Sign-up approval journey", () => {
  it("keeps new sign-ups waiting until staff let them in", async () => {
    const admin = await registerAdmin("signup-admin");
    const coachStaff = await registerAdmin("signup-coachstaff", "coach");
    const parent = await signUp("parent");
    const player = await signUp("player");
    const supporter = await signUp("supporter");
    const coach = await signUp("coach");
    const sneaky = await signUp("tenant_admin", { roles: ["tenant_admin"], pendingRole: "coach", joinAs: "coach", approvedAt: "now" });

    for (const p of [parent, player, supporter, coach, sneaky]) expect(p.roles).toEqual(["pending"]);

    // Waiting: no squad, fixtures, training or events; their own account is fine
    for (const path of ["/api/v1/squad", "/api/v1/fixtures", "/api/v1/training/sessions", "/api/v1/events", "/api/v1/discussions", "/api/v1/calendar/link"]) {
      const res = await call(path, { token: parent.token });
      expect(res.status, path).toBe(403);
      expect(res.data.error.code, path).toBe("WAITING_FOR_APPROVAL");
    }
    expect((await call("/api/v1/users/me", { token: parent.token })).status).toBe(200);
    expect((await call("/api/v1/membership", { token: parent.token })).data.data).toEqual({ status: "pending" });

    // Staff were told, and see who's waiting and as what
    const told = await env.DB.prepare(`SELECT COUNT(*) AS n FROM notifications WHERE tenant_id = ? AND type = 'member_waiting' AND user_id = ?`).bind(TENANT, coachStaff.userId).first<{ n: number }>();
    expect(told!.n).toBeGreaterThan(0);
    const members = async () => (await call("/api/v1/club/members", { token: coachStaff.token })).data.data.members as any[];
    const row = (list: any[], id: string) => list.find((m) => m.id === id);
    let list = await members();
    expect(row(list, parent.id)).toMatchObject({ role: "pending", joinAs: "parent" });
    expect(row(list, player.id)).toMatchObject({ role: "pending", joinAs: "player" });
    expect(row(list, coach.id)).toMatchObject({ role: "pending", joinAs: "coach" });
    // What they sent can't decide anything
    expect(row(list, sneaky.id)).toMatchObject({ role: "pending", joinAs: "parent" });

    // Members can't approve; any staff can
    expect((await call(`/api/v1/club/members/${player.id}/approve`, { token: parent.token, body: {} })).status).toBe(403);
    expect((await call(`/api/v1/club/members/${parent.id}/approve`, { token: coachStaff.token, body: {} })).data.data).toMatchObject({ role: "parent" });
    expect((await call(`/api/v1/club/members/${parent.id}/approve`, { token: coachStaff.token, body: {} })).status).toBe(409);
    expect((await call(`/api/v1/club/members/${player.id}/approve`, { token: coachStaff.token, body: {} })).data.data).toMatchObject({ role: "player" });
    expect((await call(`/api/v1/club/members/${coach.id}/approve`, { token: coachStaff.token, body: {} })).data.data).toMatchObject({ role: "supporter", requestedRole: "coach" });

    // The app picks up the new access
    const now = await call("/api/v1/membership", { token: parent.token });
    expect(now.data.data.status).toBe("member");
    expect((await call("/api/v1/squad", { token: now.data.data.token })).status).toBe(200);

    // The coach applicant still isn't staff until an admin says so
    const coachIn = (await call("/api/v1/membership", { token: coach.token })).data.data.token;
    expect((await call("/api/v1/admin/squad", { token: coachIn, body: { name: "No", number: 1 } })).status).toBe(403);
    expect((await call(`/api/v1/club/members/${coach.id}/role`, { method: "PUT", token: admin.token, body: { role: "coach" } })).data.data).toMatchObject({ role: "coach", requestedRole: null });

    // Turned down: the account goes and they're told
    expect((await call(`/api/v1/club/members/${supporter.id}/decline`, { token: coachStaff.token, body: {} })).status).toBe(200);
    list = await members();
    expect(row(list, supporter.id)).toBeUndefined();
    expect((await call(`/api/v1/club/members/${parent.id}/decline`, { token: coachStaff.token, body: {} })).status).toBe(409);
  });

  it("lets a parent with the coach's code for their child straight in", async () => {
    const coachStaff = await registerAdmin("signup-code-coach", "coach");
    const kid = (await call("/api/v1/admin/squad", { token: coachStaff.token, body: { name: "Code Kid", squadNumber: 4 } })).data.playerId as string;
    const code = (await call(`/api/v1/players/${kid}/parent-invite`, { method: "POST", token: coachStaff.token, body: {} })).data.data.code;
    const parent = await signUp("parent");
    expect((await call("/api/v1/link-child", { token: parent.token, body: { code: "WRONG123" } })).status).toBe(404);
    const linked = await call("/api/v1/link-child", { token: parent.token, body: { code } });
    expect(linked.status).toBe(200);
    expect(linked.data.data).toMatchObject({ letIn: true, roles: ["tenant_member"] });
    expect((await call("/api/v1/squad", { token: linked.data.data.token })).status).toBe(200);
  });
});
