/**
 * Journey: a club on its free trial looks at billing; later Stripe confirms a
 * payment. Covers the "payments not switched on" state, owner-only checkout,
 * webhook signature checks and applying each Stripe event once.
 */
import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import Stripe from "stripe";
import worker from "../../src/index";
import { call } from "./helpers";

let n = 0;
const ip = () => ({ "CF-Connecting-IP": `192.0.2.${++n}` });
const ctx = { waitUntil: () => {}, passThroughOnException: () => {}, props: {} } as unknown as ExecutionContext;
const WEBHOOK_SECRET = "whsec_test_secret";
const stripeEnv = { ...env, STRIPE_SECRET_KEY: "sk_test_dummy", STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET } as typeof env;

async function newClub() {
  const email = `billing-${Date.now()}-${++n}@example.com`;
  const res = await call("/api/v1/auth/register-owner", {
    body: { name: "Owner", email, password: "ClubOwnerPass123", clubName: "Billing FC" },
    headers: ip(),
  });
  return { token: res.data.data.token as string, tenantId: res.data.data.tenant.id as string };
}

async function sendWebhook(payload: object, signature?: string) {
  const body = JSON.stringify(payload);
  const stripe = new Stripe("sk_test_dummy");
  const header = signature ?? (await stripe.webhooks.generateTestHeaderStringAsync({
    payload: body,
    secret: WEBHOOK_SECRET,
    cryptoProvider: Stripe.createSubtleCryptoProvider(),
  }));
  return worker.fetch(
    new Request("https://example.com/webhooks/stripe", { method: "POST", headers: { "stripe-signature": header }, body }),
    stripeEnv,
    ctx,
  );
}

describe("Billing journey", () => {
  it("shows the trial and the plans, with payments not yet switched on", async () => {
    const { token } = await newClub();
    const res = await call("/api/v1/billing/status", { token });
    expect(res.status).toBe(200);
    expect(res.data.data).toEqual(expect.objectContaining({
      subscriptionStatus: "trialing",
      trialEnded: false,
      paymentsEnabled: false,
    }));
    expect(res.data.data.trialDaysRemaining).toBe(14);
    expect(res.data.data.plans.map((p: any) => p.id)).toEqual(["starter", "pro"]);
  });

  it("explains that payments aren't on yet instead of failing", async () => {
    const { token } = await newClub();
    const res = await call("/api/v1/billing/checkout", { token, body: { plan: "starter" } });
    expect(res.status).toBe(503);
    expect(res.data.error.code).toBe("PAYMENTS_NOT_CONFIGURED");
  });

  it("only lets the club owner start a payment", async () => {
    const { tenantId } = await newClub();
    const slug = (await env.DB.prepare("SELECT slug FROM tenants WHERE id = ?").bind(tenantId).first<any>()).slug;
    const email = `member-${Date.now()}@example.com`;
    const member = await call("/api/v1/auth/register", {
      body: { tenant_id: slug, email, password: "MemberPass123" },
      headers: { "Idempotency-Key": `reg-${email}`, ...ip() },
    });
    const res = await call("/api/v1/billing/checkout", { token: member.data.data.token, body: { plan: "pro" } });
    expect(res.status).toBe(403);
  });

  it("rejects a Stripe webhook with a bad signature", async () => {
    const res = await sendWebhook({ id: "evt_bad", type: "checkout.session.completed", data: { object: {} } }, "t=1,v1=nope");
    expect(res.status).toBe(400);
  });

  it("activates the club once when Stripe confirms payment, even if Stripe sends it twice", async () => {
    const { tenantId } = await newClub();
    const event = {
      id: `evt_${Date.now()}`,
      object: "event",
      type: "checkout.session.completed",
      data: { object: { object: "checkout.session", metadata: { tenant_id: tenantId, plan: "pro" }, subscription: "sub_123", customer: "cus_123" } },
    };

    expect((await sendWebhook(event)).status).toBe(200);
    const after = await env.DB.prepare("SELECT status, plan, subscription_status, stripe_subscription_id FROM tenants WHERE id = ?")
      .bind(tenantId).first<any>();
    expect(after).toEqual({ status: "active", plan: "pro", subscription_status: "active", stripe_subscription_id: "sub_123" });

    // Stripe retries: acknowledged, not applied again
    const again = await sendWebhook(event);
    expect(again.status).toBe(200);
    expect(await again.text()).toMatch(/already processed/);
    const events = await env.DB.prepare("SELECT COUNT(*) AS c FROM billing_events WHERE stripe_event_id = ?").bind(event.id).first<any>();
    expect(events.c).toBe(1);
  });

  it("marks the club cancelled when the subscription ends", async () => {
    const { tenantId } = await newClub();
    const res = await sendWebhook({
      id: `evt_del_${Date.now()}`,
      object: "event",
      type: "customer.subscription.deleted",
      data: { object: { object: "subscription", id: "sub_x", status: "canceled", metadata: { tenant_id: tenantId } } },
    });
    expect(res.status).toBe(200);
    const row = await env.DB.prepare("SELECT status, subscription_status FROM tenants WHERE id = ?").bind(tenantId).first<any>();
    expect(row).toEqual({ status: "cancelled", subscription_status: "canceled" });
  });
});
