/**
 * Journey: with TRIAL_END_MODE=read_only, a club whose trial has ended keeps
 * every page readable and families carry on, but staff changes get a clear
 * 402 until the club pays; billing still works. With the switch off (the
 * default) nothing changes.
 */
import { describe, it, expect, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { call, registerAdmin, registerMember, TENANT } from "./helpers";

const vars = env as unknown as { TRIAL_END_MODE?: string };

async function setTrialEnd(secondsFromNow: number, extra = "") {
  await env.DB.prepare(`UPDATE tenants SET status = 'trial', subscription_status = 'trialing', comped = 0, trial_ends_at = ?${extra} WHERE id = ?`)
    .bind(Math.floor(Date.now() / 1000) + secondsFromNow, TENANT).run();
}

describe("Trial end journey", () => {
  afterEach(async () => {
    vars.TRIAL_END_MODE = "off";
    await setTrialEnd(14 * 86400);
  });

  it("pauses staff changes after the trial when switched on", async () => {
    const coach = await registerAdmin("trial-coach");
    const parent = await registerMember("trial-parent");
    const post = () => call("/api/v1/events", { token: coach.token, body: { title: "Presentation night", date: "2026-11-20" } });

    // Off (default): an ended trial changes nothing
    await setTrialEnd(-86400);
    expect((await post()).status).not.toBe(402);

    vars.TRIAL_END_MODE = "read_only";
    const paused = await post();
    expect(paused.status).toBe(402);
    expect(paused.data.error.code).toBe("TRIAL_ENDED");
    expect(paused.data.error.message).toMatch(/Choose a plan in Billing/);

    // Reading, billing and families still work
    expect((await call("/api/v1/results", { token: coach.token })).status).toBe(200);
    const billing = await call("/api/v1/billing/status", { token: coach.token });
    expect(billing.status).toBe(200);
    expect(billing.data.data.readOnly).toBe(true);
    expect((await call("/api/v1/training/drill-favourites", { token: parent.token, method: "PUT", body: { ref: "lib:drill-001", favourite: true } })).status).not.toBe(402);

    // Free access (or paying) lifts it straight away
    await env.DB.prepare(`UPDATE tenants SET comped = 1 WHERE id = ?`).bind(TENANT).run();
    expect((await post()).status).not.toBe(402);
    expect((await call("/api/v1/billing/status", { token: coach.token })).data.data.readOnly).toBe(false);
  });
});
