/**
 * Journey: people sign up as a parent, player or supporter and get that role;
 * someone asking to be a coach becomes a supporter until an admin approves.
 * Nobody can make themselves staff or admin by what they send.
 */
import { describe, it, expect } from "vitest";
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

describe("Sign-up roles journey", () => {
  it("gives members the role they chose and holds coach requests for an admin", async () => {
    const admin = await registerAdmin("signup-admin");
    const parent = await signUp("parent");
    const player = await signUp("player");
    const supporter = await signUp("supporter");
    const coach = await signUp("coach");
    const sneaky = await signUp("tenant_admin", { roles: ["tenant_admin"], pendingRole: "coach" });

    expect(parent.roles).toEqual(["tenant_member"]);
    expect(player.roles).toEqual(["tenant_member", "player"]);
    expect(supporter.roles).toEqual(["tenant_member", "supporter"]);
    expect(coach.roles).toEqual(["tenant_member", "supporter"]);
    expect(sneaky.roles).toEqual(["tenant_member"]);

    // The coach applicant isn't staff yet
    expect((await call("/api/v1/admin/squad", { token: coach.token, body: { name: "No", number: 1 } })).status).toBe(403);

    const members = async () => (await call("/api/v1/club/members", { token: admin.token })).data.data.members as any[];
    const row = (list: any[], id: string) => list.find((m) => m.id === id);
    let list = await members();
    expect(row(list, parent.id)).toMatchObject({ role: "parent", requestedRole: null });
    expect(row(list, player.id)).toMatchObject({ role: "player" });
    expect(row(list, supporter.id)).toMatchObject({ role: "supporter", requestedRole: null });
    expect(row(list, coach.id)).toMatchObject({ role: "supporter", requestedRole: "coach" });
    // Sending pendingRole directly doesn't count as asking
    expect(row(list, sneaky.id)).toMatchObject({ role: "parent", requestedRole: null });

    // Admin approves: the request is answered
    const approved = await call(`/api/v1/club/members/${coach.id}/role`, { method: "PUT", token: admin.token, body: { role: "coach" } });
    expect(approved.data.data).toMatchObject({ role: "coach", requestedRole: null });

    // Admin can make someone a supporter
    const made = await call(`/api/v1/club/members/${parent.id}/role`, { method: "PUT", token: admin.token, body: { role: "supporter" } });
    expect(made.data.data).toMatchObject({ role: "supporter", roles: ["tenant_member", "supporter"] });
    list = await members();
    expect(row(list, coach.id).requestedRole).toBeNull();
  });
});
