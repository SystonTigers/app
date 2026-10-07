/**
 * Journey: club extras (Subs and fees, Signing on, Shop) are off until a club
 * admin switches them on. While off their API refuses with MODULE_OFF (staff
 * and families alike, and the public shop), and the club info tells the app
 * and website what to show.
 */
import { describe, it, expect } from "vitest";
import { call, registerAdmin, registerMember } from "./helpers";

describe("Club extras switches", () => {
  it("keeps Subs and fees, Signing on and the Shop off until a club admin switches them on", async () => {
    const admin = await registerAdmin("modules-admin");
    const coach = await registerAdmin("modules-coach", "coach");
    const parent = await registerMember("modules-parent");
    const info = async () => (await call("/public/syston/info")).data.data.modules;
    const set = (token: string, modules: Record<string, unknown>) => call("/api/v1/tenants/me", { method: "PATCH", token, body: { modules } });

    expect(await info()).toEqual({ subs: false, signingOn: false, shop: false });
    const subs = await call("/api/v1/dues/requests", { token: admin.token });
    expect(subs.status).toBe(403);
    expect(subs.data.error).toMatchObject({ code: "MODULE_OFF", module: "subs" });
    expect((await call("/api/v1/dues/requests", { token: parent.token })).status).toBe(403);
    expect((await call("/api/v1/registration/fees", { token: admin.token })).data.error.module).toBe("signingOn");
    expect((await call("/api/v1/shop/products?tenant=syston")).data.error.module).toBe("shop");

    // Only club admins switch them, and only real switches
    expect((await set(coach.token, { subs: true })).status).toBe(403);
    expect((await set(admin.token, { payroll: true })).status).toBe(400);
    expect((await set(admin.token, { subs: "yes" })).status).toBe(400);

    expect((await set(admin.token, { subs: true })).status).toBe(200);
    expect(await info()).toEqual({ subs: true, signingOn: false, shop: false });
    expect((await call("/api/v1/dues/requests", { token: admin.token })).status).toBe(200);
    expect((await call("/api/v1/registration/fees", { token: admin.token })).status).toBe(403);

    await set(admin.token, { subs: false, shop: true });
    expect(await info()).toEqual({ subs: false, signingOn: false, shop: true });
    expect((await call("/api/v1/dues/requests", { token: admin.token })).status).toBe(403);
    expect((await call("/api/v1/shop/products?tenant=syston")).status).toBe(200);
    await set(admin.token, { shop: false });
  });
});
