/**
 * Billing Routes
 * Stripe subscription management for tenant billing
 * 
 * Supports: Google Pay, Apple Pay, Link, Card (via Stripe Checkout)
 */

import Stripe from 'stripe';
import { requireJWT } from '../services/auth';
import { json } from '../services/util';

// Pricing in pence (GBP) - 20% discount for annual
const PLAN_PRICING = {
    essentials: {
        monthly: 599,    // £5.99
        annual: 5750,    // £57.50 (20% off £71.88)
        maxTeams: 1,
        features: ['squad', 'fixtures', 'reports', 'chat'],
        duesFeePercent: 3.0,
        duesFeePence: 20
    },
    team: {
        monthly: 1299,   // £12.99
        annual: 12470,   // £124.70 (20% off £155.88)
        maxTeams: 1,
        features: ['squad', 'fixtures', 'reports', 'chat', 'stats', 'social', 'video'],
        duesFeePercent: 2.9,
        duesFeePence: 20
    },
    club: {
        monthly: 3999,   // £39.99
        annual: 38390,   // £383.90 (20% off £479.88)
        maxTeams: 5,
        features: ['squad', 'fixtures', 'reports', 'chat', 'stats', 'social', 'video'],
        duesFeePercent: 2.5,
        duesFeePence: 20
    },
    club_pro: {
        monthly: 7999,   // £79.99
        annual: 76790,   // £767.90 (20% off £959.88)
        maxTeams: 999,   // Unlimited
        features: ['squad', 'fixtures', 'reports', 'chat', 'stats', 'social', 'video', 'ai_coaching', 'merch'],
        duesFeePercent: 2.0,
        duesFeePence: 18
    },
};

function getStripe(env: any): Stripe {
    return new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-11-20.acacia' as any,
    });
}

/**
 * POST /api/v1/billing/checkout
 * Create a Stripe Checkout session for subscription
 */
export async function handleCreateCheckout(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as {
            plan: 'essentials' | 'team' | 'club' | 'club_pro';
            interval: 'monthly' | 'annual';
            successUrl?: string;
            cancelUrl?: string;
        };

        const { plan, interval } = body;

        if (!PLAN_PRICING[plan]) {
            return json({ success: false, error: { message: 'Invalid plan' } }, 400, corsHdrs);
        }

        // Get tenant info
        const tenant = await env.DB.prepare(
            'SELECT id, email, name, stripe_customer_id FROM tenants WHERE id = ?'
        ).bind(tenantId).first();

        if (!tenant) {
            return json({ success: false, error: { message: 'Tenant not found' } }, 404, corsHdrs);
        }

        const stripe = getStripe(env);
        let customerId = tenant.stripe_customer_id;

        // Create Stripe customer if not exists
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: tenant.email,
                name: tenant.name,
                metadata: { tenant_id: tenantId },
            });
            customerId = customer.id;

            // Save customer ID
            await env.DB.prepare(
                'UPDATE tenants SET stripe_customer_id = ? WHERE id = ?'
            ).bind(customerId, tenantId).run();
        }

        // Get the price ID from env
        const priceEnvKey = `STRIPE_${plan.toUpperCase()}_${interval.toUpperCase()}_PRICE_ID`;
        const priceId = env[priceEnvKey];

        if (!priceId) {
            return json({
                success: false,
                error: { message: `Price not configured: ${priceEnvKey}` }
            }, 500, corsHdrs);
        }

        // Create checkout session with all payment methods
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'], // Stripe auto-enables Apple Pay, Google Pay, Link
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: body.successUrl || `${env.APP_BASE_URL || 'https://app.syston.co'}/{CHECKOUT_SESSION_ID}?success=true`,
            cancel_url: body.cancelUrl || `${env.APP_BASE_URL || 'https://app.syston.co'}/admin/billing?canceled=true`,
            subscription_data: {
                metadata: { tenant_id: tenantId, plan },
                trial_period_days: 0, // No trial since they're upgrading
            },
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            metadata: { tenant_id: tenantId, plan, interval },
        });

        return json({
            success: true,
            data: {
                sessionId: session.id,
                url: session.url,
            },
        }, 200, corsHdrs);
    } catch (error: any) {
        console.error('[Billing] Checkout error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/billing/portal
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function handleBillingPortal(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const tenant = await env.DB.prepare(
            'SELECT stripe_customer_id FROM tenants WHERE id = ?'
        ).bind(tenantId).first();

        if (!tenant?.stripe_customer_id) {
            return json({
                success: false,
                error: { message: 'No billing account found. Please subscribe first.' }
            }, 400, corsHdrs);
        }

        const stripe = getStripe(env);
        const session = await stripe.billingPortal.sessions.create({
            customer: tenant.stripe_customer_id,
            return_url: `${env.APP_BASE_URL || 'https://app.syston.co'}/admin/billing`,
        });

        return json({
            success: true,
            data: { url: session.url },
        }, 200, corsHdrs);
    } catch (error: any) {
        console.error('[Billing] Portal error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/billing/status
 * Get current subscription status
 */
export async function handleBillingStatus(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const tenant = await env.DB.prepare(`
            SELECT plan, status, subscription_status, trial_ends_at, 
                   stripe_customer_id, stripe_subscription_id, billing_tier
            FROM tenants WHERE id = ?
        `).bind(tenantId).first();

        if (!tenant) {
            return json({ success: false, error: { message: 'Tenant not found' } }, 404, corsHdrs);
        }

        const now = Math.floor(Date.now() / 1000);
        const trialDaysRemaining = tenant.trial_ends_at
            ? Math.max(0, Math.ceil((tenant.trial_ends_at - now) / 86400))
            : 0;

        // Get subscription details from Stripe if exists
        let subscriptionDetails = null;
        if (tenant.stripe_subscription_id) {
            try {
                const stripe = getStripe(env);
                const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
                subscriptionDetails = {
                    status: subscription.status,
                    currentPeriodEnd: subscription.current_period_end,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                };
            } catch {
                // Subscription may have been deleted
            }
        }

        return json({
            success: true,
            data: {
                plan: tenant.plan,
                status: tenant.status,
                subscriptionStatus: tenant.subscription_status || 'trialing',
                billingTier: tenant.billing_tier,
                trialEndsAt: tenant.trial_ends_at,
                trialDaysRemaining,
                hasPaymentMethod: !!tenant.stripe_customer_id,
                subscription: subscriptionDetails,
            },
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * POST /webhooks/stripe
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(req: Request, env: any) {
    const stripe = getStripe(env);
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        return new Response('Missing signature', { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        console.error('[Stripe Webhook] Signature failed:', err.message);
        return new Response('Invalid signature', { status: 400 });
    }

    console.log(`[Stripe Webhook] Event: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(session, env);
                break;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdate(subscription, env);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(subscription, env);
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await handlePaymentFailed(invoice, env);
                break;
            }
        }

        // Log event
        const tenantId = extractTenantId(event);
        if (tenantId) {
            await env.DB.prepare(`
                INSERT INTO billing_events (id, tenant_id, event_type, stripe_event_id, description)
                VALUES (?, ?, ?, ?, ?)
            `).bind(
                `be_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                tenantId,
                event.type,
                event.id,
                JSON.stringify(event.data.object)
            ).run();
        }

    } catch (error) {
        console.error('[Stripe Webhook] Handler error:', error);
    }

    return new Response('OK', { status: 200 });
}

// Helper functions
async function handleCheckoutCompleted(session: Stripe.Checkout.Session, env: any) {
    const tenantId = session.metadata?.tenant_id;
    const plan = session.metadata?.plan;

    if (!tenantId) return;

    await env.DB.prepare(`
        UPDATE tenants 
        SET status = 'active', 
            subscription_status = 'active',
            plan = COALESCE(?, plan),
            stripe_subscription_id = ?
        WHERE id = ?
    `).bind(plan, session.subscription, tenantId).run();

    console.log(`[Billing] Tenant ${tenantId} subscribed to ${plan}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription, env: any) {
    const tenantId = subscription.metadata?.tenant_id;
    if (!tenantId) return;

    const statusMap: Record<string, string> = {
        'active': 'active',
        'past_due': 'past_due',
        'canceled': 'canceled',
        'trialing': 'trialing',
        'unpaid': 'past_due',
    };

    await env.DB.prepare(`
        UPDATE tenants 
        SET subscription_status = ?,
            stripe_subscription_id = ?
        WHERE id = ?
    `).bind(
        statusMap[subscription.status] || subscription.status,
        subscription.id,
        tenantId
    ).run();
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, env: any) {
    const tenantId = subscription.metadata?.tenant_id;
    if (!tenantId) return;

    await env.DB.prepare(`
        UPDATE tenants 
        SET subscription_status = 'canceled',
            status = 'expired'
        WHERE id = ?
    `).bind(tenantId).run();

    console.log(`[Billing] Tenant ${tenantId} subscription canceled`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice, env: any) {
    // Get tenant from customer
    const customerId = invoice.customer as string;
    const tenant = await env.DB.prepare(
        'SELECT id FROM tenants WHERE stripe_customer_id = ?'
    ).bind(customerId).first();

    if (!tenant) return;

    await env.DB.prepare(`
        UPDATE tenants SET subscription_status = 'past_due' WHERE id = ?
    `).bind(tenant.id).run();

    // TODO: Send email notification about failed payment
    console.log(`[Billing] Payment failed for tenant ${tenant.id}`);
}

function extractTenantId(event: Stripe.Event): string | null {
    const obj = event.data.object as any;
    return obj.metadata?.tenant_id || null;
}
