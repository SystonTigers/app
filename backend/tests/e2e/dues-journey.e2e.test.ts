/**
 * Journey: staff ask for subs (app Manager zone → Subs and fees, website
 * Admin → Subs and fees), see the request listed and send a reminder. A
 * parent with two children gets one reminder, not two. Parents can't make
 * requests or send reminders.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember, TENANT } from "./helpers";

describe("Subs and fees", () => {
  it("makes a request and reminds each parent once", async () => {
    const coach = await registerAdmin("dues-coach", "coach");
    const parent = await registerMember("dues-parent");

    expect((await call("/api/v1/dues/requests", { token: parent.token, body: { title: "Nope", amount: 5 } })).status).toBe(403);
    expect((await call("/api/v1/dues/requests", { token: coach.token, body: { title: "", amount: 5 } })).status).toBe(400);

    const made = await call("/api/v1/dues/requests", { token: coach.token, body: { title: "March subs", amount: 25.5, dueDate: "2026-03-31" } });
    expect(made.status, JSON.stringify(made.data)).toBeLessThan(300);
    const list = await call("/api/v1/dues/requests", { token: coach.token });
    const req = list.data.data.find((r: any) => r.title === "March subs");
    expect(req).toMatchObject({ amount: 25.5, paidCount: 0, totalCollected: 0 });

    for (const [name, email] of [["Dues Twin A", "twins@example.com"], ["Dues Twin B", "Twins@example.com"], ["Dues Solo", "solo@example.com"]]) {
      const added = await call("/api/v1/admin/squad", { token: coach.token, body: { name, squadNumber: 30, position: "MF" } });
      const id = added.data.playerId as string;
      await env.DB.prepare(`UPDATE squad SET parent_email = ? WHERE id = ? AND tenant_id = ?`).bind(email, id, TENANT).run();
    }
    const expected = await env.DB.prepare(`SELECT COUNT(DISTINCT lower(trim(parent_email))) AS n FROM squad WHERE tenant_id = ? AND parent_email IS NOT NULL AND trim(parent_email) <> ''`).bind(TENANT).first() as { n: number };

    expect((await call("/api/v1/dues/remind", { token: parent.token, body: { requestId: req.id } })).status).toBe(403);
    const reminded = await call("/api/v1/dues/remind", { token: coach.token, body: { requestId: req.id } });
    expect(reminded.status, JSON.stringify(reminded.data)).toBe(200);
    expect(reminded.data.data.remindersSent).toBe(expected.n);
    expect((await call("/api/v1/dues/remind", { token: coach.token, body: { requestId: "missing" } })).status).toBe(404);
  });
});
