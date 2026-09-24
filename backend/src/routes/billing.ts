/**
 * Billing: club subscriptions through Stripe Checkout.
 *
 * Plans live in PLANS below (the one place to change names, prices shown and
 * features). The real amount charged is the Stripe Price each plan points at:
 *   STRIPE_STARTER_MONTHLY_PRICE_ID, STRIPE_PRO_MONTHLY_PRICE_ID
 *   (optional) STRIPE_STARTER_ANNUAL_PRICE_ID, STRIPE_PRO_ANNUAL_PRICE_ID
 * plus the secrets STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.
 * Until STRIPE_SECRET_KEY is set, checkout answers "payments aren't switched on".
 *
 * Stripe webhooks: POST /webhooks/stripe (verified, idempotent by event id).
 */

import Stripe from 'stripe';
import { requireTenantJWT, hasAnyRole } from '../services/auth';
import { json } from '../services/util';

export const PLANS = {
    starter: {
        name: 'Starter',
        monthlyPence: 1499,
        features: [
            'Club website and dashboard',
            'Club app for players and parents',
            'Fixtures, results and league table',
            'Squad, team news and match videos',
            'Your club colours and badge',
        ],
    },
    pro: {
        name: 'Pro',
        monthlyPence: 2999,
        features: ['Everything in Starter', 'Priority support', 'Advanced analytics'],
    },
} as const;

export type PlanId = keyof typeof PLANS;
type Interval = 'monthly' | 'annual';

const BILLING_ROLES = ['owner', 'tenant_admin', 'admin', 'platform_admin'] as const;

const isPlan = (value: unknown): value is PlanId => typeof value === 'string' && value in PLANS;
const priceIdFor = (env: any, plan: PlanId, interval: Interval): string | undefined =>
    env[`STRIPE_${plan.toUpperCase()}_${interval.toUpperCase()}_PRICE_ID`];

function getStripe(env: any): Stripe {
    return new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-11-20.acacia' as any,
        httpClient: Stripe.createFetchHttpClient(),
    });
}

const notConfigured = (corsHdrs: Headers) =>
    json({
        success: false,
        error: { code: 'PAYMENTS_NOT_CONFIGURED', message: "Online payments aren't switched on yet. Your free trial carries on in the meantime." },
    }, 503, corsHdrs);

/** Where to send people back to: their club's billing page on the website. */
async function billingPageUrl(env: any, tenantId: string, query: string): Promise<string> {
    const base = (env.APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const row = await env.DB.prepare('SELECT slug FROM tenants WHERE id = ?').bind(tenantId).first() as { slug: string } | null;
    return `${base}/${row?.slug ?? ''}/admin/billing${query}`;
}

/** Only return-URLs on our own website are accepted (stops open redirects via checkout). */
function sameSiteUrl(env: any, candidate: unknown): string | null {
    if (typeof candidate !== 'string' || !env.APP_BASE_URL) return null;
    try {
        const url = new URL(candidate);
        return url.origin === new URL(env.APP_BASE_URL).origin ? url.toString() : null;
    } catch {
        return null;
    }
}

/**
 * POST /api/v1/billing/checkout  { plan: 'starter' | 'pro', interval?: 'monthly' | 'annual' }
 */
export async function handleCreateCheckout(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireTenantJWT(req, env);
        if (!hasAnyRole(claims, BILLING_ROLES)) {
            return json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the club owner can change the plan.' } }, 403, corsHdrs);
        }
        if (!env.STRIPE_SECRET_KEY) return notConfigured(corsHdrs);

        const tenantId = claims.tenantId;
        const body = await req.json().catch(() => ({})) as { plan?: unknown; interval?: unknown; successUrl?: unknown; cancelUrl?: unknown };
        if (!isPlan(body.plan)) {
            return json({ success: false, error: { code: 'INVALID_PLAN', message: 'Choose a plan.' } }, 400, corsHdrs);
        }
        const plan = body.plan;
        const interval: Interval = body.interval === 'annual' ? 'annual' : 'monthly';
        const priceId = priceIdFor(env, plan, interval);
        if (!priceId) {
            console.error(JSON.stringify({ event: 'billing_checkout', outcome: 'price_missing', plan, interval }));
            return notConfigured(corsHdrs);
        }

        const tenant = await env.DB.prepare(
            'SELECT id, email, name, stripe_customer_id, trial_ends_at FROM tenants WHERE id = ?'
        ).bind(tenantId).first() as any;
        if (!tenant) {
            return json({ success: false, error: { code: 'NOT_FOUND', message: 'Club not found' } }, 404, corsHdrs);
        }

        const stripe = getStripe(env);
        let customerId: string | null = tenant.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create(
                { email: tenant.email, name: tenant.name, metadata: { tenant_id: tenantId } },
                { idempotencyKey: `customer:${tenantId}` },
            );
            customerId = customer.id;
            await env.DB.prepare('UPDATE tenants SET stripe_customer_id = ? WHERE id = ?').bind(customerId, tenantId).run();
        }

        // Subscribing mid-trial keeps the free days: first charge when the trial ends.
        // Stripe needs a trial end at least 48 hours away.
        const now = Math.floor(Date.now() / 1000);
        const keepTrial = typeof tenant.trial_ends_at === 'number' && tenant.trial_ends_at > now + 48 * 3600;

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: sameSiteUrl(env, body.successUrl) ?? await billingPageUrl(env, tenantId, '?success=true'),
            cancel_url: sameSiteUrl(env, body.cancelUrl) ?? await billingPageUrl(env, tenantId, '?canceled=true'),
            subscription_data: {
                metadata: { tenant_id: tenantId, plan },
                ...(keepTrial ? { trial_end: tenant.trial_ends_at } : {}),
            },
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            metadata: { tenant_id: tenantId, plan, interval },
        });

        return json({ success: true, data: { sessionId: session.id, url: session.url } }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) return error;
        console.error(JSON.stringify({ event: 'billing_checkout', outcome: 'error', error: error?.message }));
        return json({ success: false, error: { code: 'CHECKOUT_FAILED', message: "We couldn't start the payment. Please try again." } }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/billing/portal: Stripe's page for changing card, plan or cancelling.
 */
export async function handleBillingPortal(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireTenantJWT(req, env);
        if (!hasAnyRole(claims, BILLING_ROLES)) {
            return json({ success: false, error: { code: 'FORBIDDEN', message: 'Only the club owner can manage billing.' } }, 403, corsHdrs);
        }
        if (!env.STRIPE_SECRET_KEY) return notConfigured(corsHdrs);

        const tenant = await env.DB.prepare('SELECT stripe_customer_id FROM tenants WHERE id = ?')
            .bind(claims.tenantId).first() as { stripe_customer_id: string | null } | null;
        if (!tenant?.stripe_customer_id) {
            return json({ success: false, error: { code: 'NO_BILLING_ACCOUNT', message: 'Choose a plan first.' } }, 400, corsHdrs);
        }

        const session = await getStripe(env).billingPortal.sessions.create({
            customer: tenant.stripe_customer_id,
            return_url: await billingPageUrl(env, claims.tenantId, ''),
        });
        return json({ success: true, data: { url: session.url } }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) return error;
        console.error(JSON.stringify({ event: 'billing_portal', outcome: 'error', error: error?.message }));
        return json({ success: false, error: { code: 'PORTAL_FAILED', message: "We couldn't open billing. Please try again." } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/billing/status: plan, trial and the plans on offer.
 */
export async function handleBillingStatus(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireTenantJWT(req, env);
        const tenant = await env.DB.prepare(`
            SELECT plan, status, subscription_status, trial_ends_at, comped,
                   stripe_customer_id, stripe_subscription_id, billing_tier
            FROM tenants WHERE id = ?
        `).bind(claims.tenantId).first() as any;
        if (!tenant) {
            return json({ success: false, error: { code: 'NOT_FOUND', message: 'Club not found' } }, 404, corsHdrs);
        }

        const now = Math.floor(Date.now() / 1000);
        const trialDaysRemaining = tenant.trial_ends_at ? Math.max(0, Math.ceil((tenant.trial_ends_at - now) / 86400)) : 0;
        const subscriptionStatus = tenant.subscription_status || 'trialing';
        const paid = subscriptionStatus === 'active' || tenant.comped === 1;

        let subscription = null;
        if (tenant.stripe_subscription_id && env.STRIPE_SECRET_KEY) {
            try {
                const sub = await getStripe(env).subscriptions.retrieve(tenant.stripe_subscription_id);
                subscription = {
                    status: sub.status,
                    currentPeriodEnd: sub.items?.data?.[0]?.current_period_end ?? null,
                    cancelAtPeriodEnd: sub.cancel_at_period_end,
                };
            } catch {
                // Subscription removed in Stripe; the webhook will catch up
            }
        }

        const paymentsEnabled = !!env.STRIPE_SECRET_KEY;
        return json({
            success: true,
            data: {
                plan: tenant.plan,
                status: tenant.status,
                subscriptionStatus,
                billingTier: tenant.billing_tier,
                comped: tenant.comped === 1,
                trialEndsAt: tenant.trial_ends_at,
                trialDaysRemaining,
                trialEnded: !paid && !!tenant.trial_ends_at && tenant.trial_ends_at <= now,
                hasPaymentMethod: !!tenant.stripe_customer_id,
                paymentsEnabled,
                subscription,
                plans: (Object.keys(PLANS) as PlanId[]).map((id) => ({
                    id,
                    name: PLANS[id].name,
                    monthlyPence: PLANS[id].monthlyPence,
                    features: PLANS[id].features,
                    available: paymentsEnabled && !!priceIdFor(env, id, 'monthly'),
                    annualAvailable: paymentsEnabled && !!priceIdFor(env, id, 'annual'),
                })),
            },
        }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) return error;
        return json({ success: false, error: { code: 'STATUS_FAILED', message: "Couldn't load billing" } }, 500, corsHdrs);
    }
}

/**
 * POST /webhooks/stripe
 * Verified with STRIPE_WEBHOOK_SECRET. Each Stripe event is applied once:
 * repeats (Stripe retries) are acknowledged without re-applying. Failures
 * return 500 so Stripe retries later.
 */
export async function handleStripeWebhook(req: Request, env: any) {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
        return new Response('Payments not configured', { status: 503 });
    }
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
        return new Response('Missing signature', { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;
    try {
        // Workers have no Node crypto: use the async Web Crypto verifier
        event = await getStripe(env).webhooks.constructEventAsync(
            body, signature, env.STRIPE_WEBHOOK_SECRET, undefined, Stripe.createSubtleCryptoProvider(),
        );
    } catch (err: any) {
        console.warn(JSON.stringify({ event: 'stripe_webhook', outcome: 'bad_signature', error: err?.message }));
        return new Response('Invalid signature', { status: 400 });
    }

    const seen = await env.DB.prepare('SELECT id FROM billing_events WHERE stripe_event_id = ? LIMIT 1').bind(event.id).first();
    if (seen) {
        return new Response('OK (already processed)', { status: 200 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, env);
                break;
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, env);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, env);
                break;
            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object as Stripe.Invoice, env);
                break;
            default:
                break;
        }

        const tenantId = await tenantIdForEvent(event, env);
        if (tenantId) {
            await env.DB.prepare(`
                INSERT INTO billing_events (id, tenant_id, event_type, stripe_event_id, description)
                VALUES (?, ?, ?, ?, ?)
            `).bind(`be_${crypto.randomUUID()}`, tenantId, event.type, event.id, event.type).run();
        }
        console.log(JSON.stringify({ event: 'stripe_webhook', outcome: 'applied', type: event.type, tenant: tenantId }));
        return new Response('OK', { status: 200 });
    } catch (error: any) {
        console.error(JSON.stringify({ event: 'stripe_webhook', outcome: 'error', type: event.type, error: error?.message }));
        return new Response('Handler error', { status: 500 });
    }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, env: any) {
    const tenantId = session.metadata?.tenant_id;
    if (!tenantId) return;
    const plan = isPlan(session.metadata?.plan) ? session.metadata!.plan : null;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;

    await env.DB.prepare(`
        UPDATE tenants
        SET status = 'active',
            subscription_status = 'active',
            plan = COALESCE(?, plan),
            stripe_subscription_id = COALESCE(?, stripe_subscription_id),
            updated_at = unixepoch()
        WHERE id = ?
    `).bind(plan, subscriptionId, tenantId).run();
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription, env: any) {
    const tenantId = subscription.metadata?.tenant_id;
    if (!tenantId) return;
    const statusMap: Record<string, string> = {
        active: 'active',
        trialing: 'trialing',
        past_due: 'past_due',
        unpaid: 'past_due',
        canceled: 'canceled',
        incomplete: 'past_due',
        incomplete_expired: 'canceled',
        paused: 'past_due',
    };
    const subStatus = statusMap[subscription.status] ?? 'past_due';
    // A card on file with a trial still running counts as a paying club
    const clubStatus = subStatus === 'active' || subStatus === 'trialing' ? 'active' : null;
    const plan = isPlan(subscription.metadata?.plan) ? subscription.metadata.plan : null;

    await env.DB.prepare(`
        UPDATE tenants
        SET subscription_status = ?,
            status = COALESCE(?, status),
            plan = COALESCE(?, plan),
            stripe_subscription_id = ?,
            updated_at = unixepoch()
        WHERE id = ?
    `).bind(subStatus, clubStatus, plan, subscription.id, tenantId).run();
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, env: any) {
    const tenantId = subscription.metadata?.tenant_id;
    if (!tenantId) return;
    await env.DB.prepare(`
        UPDATE tenants
        SET subscription_status = 'canceled',
            status = 'cancelled',
            updated_at = unixepoch()
        WHERE id = ?
    `).bind(tenantId).run();
}

async function handlePaymentFailed(invoice: Stripe.Invoice, env: any) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;
    await env.DB.prepare(`UPDATE tenants SET subscription_status = 'past_due', updated_at = unixepoch() WHERE stripe_customer_id = ?`)
        .bind(customerId).run();
}

async function tenantIdForEvent(event: Stripe.Event, env: any): Promise<string | null> {
    const obj = event.data.object as any;
    if (obj?.metadata?.tenant_id) return obj.metadata.tenant_id;
    const customerId = typeof obj?.customer === 'string' ? obj.customer : obj?.customer?.id;
    if (!customerId) return null;
    const row = await env.DB.prepare('SELECT id FROM tenants WHERE stripe_customer_id = ?').bind(customerId).first() as { id: string } | null;
    return row?.id ?? null;
}
