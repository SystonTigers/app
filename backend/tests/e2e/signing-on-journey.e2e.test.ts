/**
 * Journey: signing on for the season. A club admin switches it on and sets
 * the fee, how to pay and the code of conduct. A parent linked to their child
 * fills in the form (details, emergency contacts, photo and video consent,
 * code of conduct); the squad's details and consent follow it. Staff see who
 * has signed on and mark the fee paid. Other parents can't see the child's
 * answers.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember } from "./helpers";

const answers = (over: Record<string, unknown> = {}) => ({
  details: { dob: "2015-03-14", address: "1 Test Lane", school: "Test Primary", medical: "Asthma: inhaler in bag", allergies: null },
  contacts: [{ name: "Pat Parent", relationship: "Mum", phone: "07700 900123", email: "pat@example.com" }],
  photos: true,
  video: false,
  agreeConduct: true,
  ...over,
});

describe("Signing on", () => {
  it("signs a child on, keeps the squad in step and lets staff mark the fee paid", async () => {
    const admin = await registerAdmin("signon-admin");
    const parent = await registerMember("signon-parent");
    const otherParent = await registerMember("signon-other");
    const playerId = (await call("/api/v1/admin/squad", { token: admin.token, body: { name: "Sienna Signon", squadNumber: 21 } })).data.playerId as string;

    // Off until a club admin switches it on
    expect((await call("/api/v1/signing-on", { token: parent.token })).data.error.code).toBe("MODULE_OFF");
    await call("/api/v1/tenants/me", { method: "PATCH", token: admin.token, body: { modules: { signingOn: true } } });
    try {
      // The club sets the fee and code of conduct; families can't
      expect((await call("/api/v1/signing-on/form", { method: "PUT", token: parent.token, body: { feeAmount: 45 } })).status).toBe(403);
      expect((await call("/api/v1/signing-on/form", { method: "PUT", token: admin.token, body: { feeAmount: -1 } })).status).toBe(400);
      const form = await call("/api/v1/signing-on/form", { method: "PUT", token: admin.token, body: { feeAmount: 45.5, feeNote: "Bank transfer to the club", conduct: "Be kind. Be on time." } });
      expect(form.data.data).toEqual({ feeAmount: 45.5, feeNote: "Bank transfer to the club", conduct: "Be kind. Be on time." });

      // Link the parent to their child with the coach's code
      const code = (await call(`/api/v1/players/${playerId}/parent-invite`, { method: "POST", token: admin.token, body: {} })).data.data.code;
      expect((await call("/api/v1/link-child", { token: parent.token, body: { code } })).status).toBe(200);

      const mine = await call("/api/v1/signing-on", { token: parent.token });
      expect(mine.data.data.form.feeAmount).toBe(45.5);
      expect(mine.data.data.children).toEqual([{ playerId, name: "Sienna Signon", entry: null }]);
      expect(mine.data.data.squad).toBeUndefined();

      // The form is checked
      const put = (token: string, body: unknown) => call(`/api/v1/signing-on/players/${playerId}`, { method: "PUT", token, body });
      expect((await put(parent.token, answers({ contacts: [] }))).data.error.message).toBe("Please add at least one emergency contact.");
      expect((await put(parent.token, answers({ agreeConduct: false }))).data.error.message).toBe("Please read and agree to the club's code of conduct.");
      expect((await put(parent.token, answers({ details: { dob: "2999-01-01" } }))).status).toBe(400);
      // Only the child's family (or staff) can sign them on or read the answers
      expect((await put(otherParent.token, answers())).status).toBe(403);
      expect((await call(`/api/v1/signing-on/players/${playerId}`, { token: otherParent.token })).status).toBe(403);

      const signed = await put(parent.token, answers());
      expect(signed.status).toBe(200);
      expect(signed.data.data).toMatchObject({ playerId, photos: true, video: false, conductAgreed: true, paid: false });
      const squadRow = await env.DB.prepare(`SELECT dob, contact1_name, contact1_phone, photo_consent, video_consent, consent_source FROM squad WHERE id = ?`).bind(playerId).first<any>();
      expect(squadRow).toEqual({ dob: "2015-03-14", contact1_name: "Pat Parent", contact1_phone: "07700 900123", photo_consent: 1, video_consent: 0, consent_source: "parent" });

      // Staff see who has signed on, and mark the fee paid
      const staffView = (await call("/api/v1/signing-on", { token: admin.token })).data.data.squad.find((p: any) => p.playerId === playerId);
      expect(staffView).toMatchObject({ signedOn: true, paid: false, linkedParents: 1 });
      expect((await call(`/api/v1/signing-on/players/${playerId}/paid`, { method: "PUT", token: parent.token, body: { paid: true } })).status).toBe(403);
      expect((await call(`/api/v1/signing-on/players/${playerId}/paid`, { method: "PUT", token: admin.token, body: { paid: true } })).data.data.paid).toBe(true);
      expect((await call(`/api/v1/signing-on/players/${playerId}`, { token: admin.token })).data.data.details.medical).toBe("Asthma: inhaler in bag");

      // Updating the form later keeps the payment
      expect((await put(parent.token, answers({ video: true }))).data.data).toMatchObject({ video: true, paid: true });
    } finally {
      await call("/api/v1/tenants/me", { method: "PATCH", token: admin.token, body: { modules: { signingOn: false } } });
    }
  });

  it("won't mark a fee paid before the child has signed on", async () => {
    const admin = await registerAdmin("signon-admin2");
    const playerId = (await call("/api/v1/admin/squad", { token: admin.token, body: { name: "Not Yet", squadNumber: 22 } })).data.playerId as string;
    await call("/api/v1/tenants/me", { method: "PATCH", token: admin.token, body: { modules: { signingOn: true } } });
    try {
      const res = await call(`/api/v1/signing-on/players/${playerId}/paid`, { method: "PUT", token: admin.token, body: { paid: true } });
      expect(res.status).toBe(409);
      expect((await call(`/api/v1/signing-on/players/missing/paid`, { method: "PUT", token: admin.token, body: { paid: true } })).status).toBe(409);
    } finally {
      await call("/api/v1/tenants/me", { method: "PATCH", token: admin.token, body: { modules: { signingOn: false } } });
    }
  });
});
