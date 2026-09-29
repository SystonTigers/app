/**
 * Journey: the manager shares an invite code with a family, the parent enters
 * it and can then answer photo/video consent. Parents who haven't answered get
 * a reminder, and one more a week later. Wrong or used-up codes don't work,
 * and staff can remove a wrong link.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";
import { sendConsentReminders } from "../../src/services/consentReminders";

describe("Parent linking journey", () => {
  it("links parents with an invite code, then reminds them about consent", async () => {
    const coach = await registerAdmin("link-coach");
    const mum = await registerMember("link-mum");
    const dad = await registerMember("link-dad");
    const stranger = await registerMember("link-stranger");
    const child = (await call("/api/v1/admin/squad", { token: coach.token, body: { name: "Lily Linked", squadNumber: 51 } })).data.playerId as string;

    // Only staff can create invites
    expect((await call(`/api/v1/players/${child}/parent-invite`, { method: "POST", token: mum.token, body: {} })).status).toBe(403);
    const invite = await call(`/api/v1/players/${child}/parent-invite`, { method: "POST", token: coach.token, body: {} });
    expect(invite.status).toBe(200);
    const code = invite.data.data.code as string;
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(invite.data.data.playerName).toBe("Lily Linked");
    // Only a hash is stored
    const stored = await env.DB.prepare(`SELECT code_hash FROM parent_invites WHERE player_id = ?`).bind(child).first<any>();
    expect(stored.code_hash).not.toContain(code.replace("-", ""));

    // A wrong code does nothing
    expect((await call("/api/v1/link-child", { token: stranger.token, body: { code: "AAAA-BBBB" } })).status).toBe(404);
    expect((await call("/api/v1/link-child", { token: stranger.token, body: { code: "short" } })).status).toBe(400);

    // Mum types it in lower case with a space: linked, and she can answer consent
    const linked = await call("/api/v1/link-child", { token: mum.token, body: { code: code.toLowerCase().replace("-", " ") } });
    expect(linked.status).toBe(200);
    expect(linked.data.data).toMatchObject({ playerId: child, name: "Lily Linked", alreadyLinked: false });
    expect((await call("/api/v1/link-child", { token: mum.token, body: { code } })).data.data.alreadyLinked).toBe(true);
    expect((await call("/api/v1/consent", { token: mum.token })).data.data.players.map((p: any) => p.playerId)).toEqual([child]);
    await call("/api/v1/link-child", { token: dad.token, body: { code } });

    // Staff see who's linked, and how many
    const parents = await call(`/api/v1/players/${child}/parents`, { token: coach.token });
    expect(parents.data.data.map((p: any) => p.userId).sort()).toEqual([mum.userId, dad.userId].sort());
    expect((await call("/api/v1/consent", { token: coach.token })).data.data.players.find((p: any) => p.playerId === child).linkedParents).toBe(2);
    expect((await call(`/api/v1/players/${child}/parents`, { token: mum.token })).status).toBe(403);

    // A new invite replaces the old code
    const second = (await call(`/api/v1/players/${child}/parent-invite`, { method: "POST", token: coach.token, body: {} })).data.data.code;
    expect((await call("/api/v1/link-child", { token: stranger.token, body: { code } })).status).toBe(404);
    // The stranger used the new code by mistake: staff remove the link
    expect((await call("/api/v1/link-child", { token: stranger.token, body: { code: second } })).status).toBe(200);
    const removed = await call(`/api/v1/players/${child}/parents/${stranger.userId}`, { method: "DELETE", token: coach.token });
    expect(removed.data.data.map((p: any) => p.userId)).not.toContain(stranger.userId);
    expect((await call("/api/v1/consent", { token: stranger.token })).data.data.players).toEqual([]);

    // Reminders: parents with a device and an unanswered question
    await env.DB.prepare(`INSERT INTO devices (id, user_id, tenant_id, token, platform, created_at) VALUES (?, ?, 'syston', ?, 'web', ?)`)
      .bind(crypto.randomUUID(), mum.userId, `test-device-${mum.userId}`, Date.now()).run();
    const noon = new Date("2026-10-01T11:00:00Z");
    const night = new Date("2026-10-01T22:00:00Z");
    expect(await sendConsentReminders(env as any, night)).toBe(0);
    const firstRun = await sendConsentReminders(env as any, noon);
    expect(firstRun).toBeGreaterThanOrEqual(1);
    const rounds = async () => (await env.DB.prepare(`SELECT round FROM consent_reminders WHERE user_id = ? ORDER BY round`).bind(mum.userId).all<any>()).results.map((r: any) => r.round);
    expect(await rounds()).toEqual([1]);
    // Dad has no device for notifications: nothing sent to him
    expect((await env.DB.prepare(`SELECT COUNT(*) AS c FROM consent_reminders WHERE user_id = ?`).bind(dad.userId).first<any>()).c).toBe(0);
    // Running again the same day sends nothing new; a week later, one reminder; then never again
    await sendConsentReminders(env as any, new Date(noon.getTime() + 5 * 60_000));
    expect(await rounds()).toEqual([1]);
    const weekLater = new Date(noon.getTime() + 8 * 86_400_000);
    await sendConsentReminders(env as any, weekLater);
    expect(await rounds()).toEqual([1, 2]);
    await sendConsentReminders(env as any, new Date(weekLater.getTime() + 8 * 86_400_000));
    expect(await rounds()).toEqual([1, 2]);

    // Once answered, no reminders for the next child's parents either way
    await call(`/api/v1/players/${child}/consent`, { method: "PUT", token: mum.token, body: { photos: true, video: true } });
    await env.DB.prepare(`DELETE FROM consent_reminders WHERE user_id = ?`).bind(mum.userId).run();
    await sendConsentReminders(env as any, noon);
    expect(await rounds()).toEqual([]);
  });
});
