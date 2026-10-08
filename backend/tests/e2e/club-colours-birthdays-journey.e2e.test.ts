/**
 * Journey: a club admin sets the kit colours (the app and graphics read them
 * from the club's info), and staff give a player a date of birth for the
 * birthday posts. Only admins change colours; bad colours and dates are refused.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin } from "./helpers";

describe("Club colours and players' birthdays", () => {
  it("saves the club's colours and a player's date of birth", async () => {
    const admin = await registerAdmin("colours-admin");
    const coach = await registerAdmin("colours-coach", "coach");
    const info = async () => (await call("/public/syston/info")).data.data;
    const before = await info();

    // Only club admins change the colours, and only to real colours
    expect((await call("/api/v1/tenants/me", { method: "PATCH", token: coach.token, body: { primaryColor: "#FFD700" } })).status).toBe(403);
    expect((await call("/api/v1/tenants/me", { method: "PATCH", token: admin.token, body: { primaryColor: "yellow" } })).status).toBe(400);
    try {
      expect((await call("/api/v1/tenants/me", { method: "PATCH", token: admin.token, body: { primaryColor: "#FFD700", secondaryColor: "#111111" } })).status).toBe(200);
      expect(await info()).toMatchObject({ primaryColor: "#FFD700", secondaryColor: "#111111" });
    } finally {
      await call("/api/v1/tenants/me", { method: "PATCH", token: admin.token, body: { primaryColor: before.primaryColor ?? "#0066CC", secondaryColor: before.secondaryColor ?? "#FFFFFF" } });
    }

    // A date of birth for the birthday posts: set, refused when it isn't a date, cleared
    const playerId = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Birthday Bea", squadNumber: 14 } })).data.playerId as string;
    const put = (dateOfBirth: unknown) => call(`/api/v1/admin/squad/${playerId}`, { method: "PUT", token: coach.token, body: { dateOfBirth } });
    expect((await put("2012-03-14")).status).toBe(200);
    expect((await env.DB.prepare(`SELECT dob FROM squad WHERE id = ?`).bind(playerId).first<{ dob: string }>())?.dob).toBe("2012-03-14");
    expect((await put("14th March")).status).toBe(400);
    expect((await put(null)).status).toBe(200);
    expect((await env.DB.prepare(`SELECT dob FROM squad WHERE id = ?`).bind(playerId).first<{ dob: string | null }>())?.dob).toBeNull();
  });
});
