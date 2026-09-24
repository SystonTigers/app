/**
 * Journey: children's details stay with club staff and the child's own family.
 * Any parent in the club sees the team sheet (name, number, position, photo);
 * only staff, or a parent linked to that child, see date of birth, emergency
 * contacts and login codes. Club-admin actions are staff-only.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Player privacy journey", () => {
  it("keeps children's personal details from other parents", async () => {
    const coach = await registerAdmin("privacy-coach");
    const otherParent = await registerMember("privacy-other");
    const ownParent = await registerMember("privacy-own");

    const added = await call("/api/v1/admin/squad", {
      token: coach.token,
      body: { name: "Private Child", squadNumber: 11, position: "FW", dateOfBirth: "2012-05-01" },
    });
    expect(added.status).toBe(200);
    const playerId = added.data.playerId as string;
    await env.DB.prepare(
      `UPDATE squad SET contact1_name = 'Mum', contact1_phone = '07000 000000', parent_email = 'mum@example.com', login_code = 'SECRET1' WHERE id = ?`,
    ).bind(playerId).run();
    await env.DB.prepare(`INSERT INTO auth_user_players (user_id, player_id, tenant_id) VALUES (?, ?, 'syston')`)
      .bind(ownParent.userId, playerId).run();

    // Staff see everything
    const staffView = (await call("/api/v1/squad", { token: coach.token })).data.data.find((p: any) => p.id === playerId);
    expect(staffView).toMatchObject({ dob: "2012-05-01", contact1_phone: "07000 000000", login_code: "SECRET1" });

    // Another parent sees only the team sheet
    const list = await call("/api/v1/squad", { token: otherParent.token });
    const teamSheet = list.data.data.find((p: any) => p.id === playerId);
    expect(teamSheet).toMatchObject({ name: "Private Child", number: 11, position: "FW" });
    for (const hidden of ["dob", "date_of_birth", "contact1_name", "contact1_phone", "parent_email", "login_code"]) {
      expect(teamSheet).not.toHaveProperty(hidden);
    }
    const single = await call(`/api/v1/squad/${playerId}`, { token: otherParent.token });
    expect(single.data.data).not.toHaveProperty("contact1_phone");
    expect((await call(`/api/v1/players/${playerId}`, { token: otherParent.token })).status).toBe(403);

    // The child's own parent sees their child's full record
    const own = (await call("/api/v1/squad", { token: ownParent.token })).data.data.find((p: any) => p.id === playerId);
    expect(own).toMatchObject({ contact1_phone: "07000 000000" });
    expect((await call(`/api/v1/players/${playerId}`, { token: ownParent.token })).status).toBe(200);
  });

  it("stops parents doing club-admin actions", async () => {
    const parent = await registerMember("privacy-admin-attempt");
    const attempts: Array<[string, string, unknown]> = [
      ["POST", "/api/v1/codes/coach", {}],
      ["POST", "/api/v1/push/broadcast", { title: "Hi", body: "All" }],
      ["POST", "/api/v1/dues/requests", { title: "Pay me", amount: 10 }],
      ["POST", "/api/v1/import/players", { csv: "name\nX" }],
      ["POST", "/api/v1/seasons", { name: "2099" }],
      ["POST", "/api/v1/events", { title: "Party" }],
      ["PUT", "/api/v1/players/any-id", { contact1_phone: "1" }],
      ["POST", "/api/v1/players/any-id/regenerate-code", {}],
      ["POST", "/api/v1/training/sessions", { title: "x" }],
    ];
    for (const [method, path, body] of attempts) {
      const res = await call(path, { method, token: parent.token, body });
      expect(res.status, `${method} ${path}`).toBe(403);
    }
  });
});
