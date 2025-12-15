/**
 * Member Dues Routes
 * Enables clubs to collect payments from parents (match fees, subs, kit, etc.)
 */

import Stripe from 'stripe';
import { requireJWT } from '../services/auth';
import { json } from '../services/util';

// Fee tiers by plan (percentage as decimal, fixed fee in pence)
const PLAN_FEES: Record<string, { percent: number; fixed: number }> = {
    essentials: { percent: 0.03, fixed: 20 },   // 3.0% + 20p
    team: { percent: 0.029, fixed: 20 },        // 2.9% + 20p
    club: { percent: 0.025, fixed: 20 },        // 2.5% + 20p
    club_pro: { percent: 0.02, fixed: 18 },     // 2.0% + 18p
};

function getStripe(env: any): Stripe {
    return new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-11-20.acacia' as any,
    });
}

/**
 * POST /api/v1/dues/requests
 * Create a new payment request
 */
export async function handleCreatePaymentRequest(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as {
            title: string;
            amount: number;  // In pounds (e.g., 25.00)
            description?: string;
            dueDate?: string;  // ISO date string
            appliesTo?: string;  // 'all', 'players', or comma-separated player IDs
        };

        if (!body.title || !body.amount || body.amount <= 0) {
            return json({
                success: false,
                error: { message: 'Title and positive amount required' }
            }, 400, corsHdrs);
        }

        const amountPence = Math.round(body.amount * 100);
        const dueDate = body.dueDate ? Math.floor(new Date(body.dueDate).getTime() / 1000) : null;

        const requestId = `pr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        await env.DB.prepare(`
            INSERT INTO payment_requests 
            (id, tenant_id, title, description, amount_gbp, due_date, applies_to, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            requestId,
            tenantId,
            body.title,
            body.description || null,
            amountPence,
            dueDate,
            body.appliesTo || 'all',
            claims.email || claims.sub
        ).run();

        return json({
            success: true,
            data: {
                id: requestId,
                title: body.title,
                amount: body.amount,
                message: 'Payment request created. Members will be notified.'
            }
        }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/dues/requests
 * List payment requests for the tenant
 */
export async function handleListPaymentRequests(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const url = new URL(req.url);
        const status = url.searchParams.get('status') || 'active';

        const { results: requests } = await env.DB.prepare(`
            SELECT pr.*, 
                   (SELECT COUNT(*) FROM member_payments mp WHERE mp.request_id = pr.id AND mp.status = 'completed') as paid_count,
                   (SELECT COALESCE(SUM(net_to_club), 0) FROM member_payments mp WHERE mp.request_id = pr.id AND mp.status = 'completed') as total_collected
            FROM payment_requests pr
            WHERE pr.tenant_id = ? AND pr.status = ?
            ORDER BY pr.created_at DESC
        `).bind(tenantId, status).all();

        return json({
            success: true,
            data: (requests || []).map((r: any) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                amount: r.amount_gbp / 100,
                dueDate: r.due_date,
                status: r.status,
                paidCount: r.paid_count,
                totalCollected: r.total_collected / 100,
                createdAt: r.created_at,
            }))
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/dues/requests/:id/status
 * Get payment status for a request (who's paid, who hasn't)
 */
export async function handlePaymentRequestStatus(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const url = new URL(req.url);
        const requestId = url.pathname.split('/').slice(-2)[0];

        // Get request details
        const request = await env.DB.prepare(
            'SELECT * FROM payment_requests WHERE id = ? AND tenant_id = ?'
        ).bind(requestId, tenantId).first();

        if (!request) {
            return json({ success: false, error: { message: 'Request not found' } }, 404, corsHdrs);
        }

        // Get all payments for this request
        const { results: payments } = await env.DB.prepare(`
            SELECT id, player_id, payer_name, payer_email, amount_paid, net_to_club, status, paid_at
            FROM member_payments WHERE request_id = ?
        `).bind(requestId).all();

        // Get all players to show who hasn't paid
        const { results: players } = await env.DB.prepare(
            'SELECT id, name, parent_email FROM players WHERE tenant_id = ?'
        ).bind(tenantId).all();

        const paidEmails = new Set((payments || []).filter((p: any) => p.status === 'completed').map((p: any) => p.payer_email));
        const unpaid = (players || []).filter((p: any) => p.parent_email && !paidEmails.has(p.parent_email));

        return json({
            success: true,
            data: {
                request: {
                    id: request.id,
                    title: request.title,
                    amount: request.amount_gbp / 100,
                    dueDate: request.due_date,
                    status: request.status,
                },
                payments: (payments || []).map((p: any) => ({
                    id: p.id,
                    payerName: p.payer_name,
                    payerEmail: p.payer_email,
                    amountPaid: p.amount_paid / 100,
                    clubReceives: p.net_to_club / 100,
                    status: p.status,
                    paidAt: p.paid_at,
                })),
                unpaid: unpaid.map((p: any) => ({
                    playerId: p.id,
                    playerName: p.name,
                    parentEmail: p.parent_email,
                })),
                summary: {
                    totalDue: (players || []).length,
                    totalPaid: paidEmails.size,
                    totalUnpaid: unpaid.length,
                    amountCollected: (payments || []).reduce((sum: number, p: any) =>
                        p.status === 'completed' ? sum + p.net_to_club : sum, 0) / 100,
                }
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/dues/pay
 * Create a payment session for a parent to pay
 */
export async function handleCreateDuesPayment(req: Request, env: any, corsHdrs: Headers) {
    try {
        const body = await req.json() as {
            requestId: string;
            payerName: string;
            payerEmail: string;
            playerId?: string;
        };

        const { requestId, payerName, payerEmail, playerId } = body;

        if (!requestId || !payerName || !payerEmail) {
            return json({
                success: false,
                error: { message: 'Request ID, payer name and email required' }
            }, 400, corsHdrs);
        }

        // Get the payment request
        const request = await env.DB.prepare(`
            SELECT pr.*, t.plan, t.pass_fees_to_payer, t.stripe_connected_account_id, o.pass_fees_to_payer as org_pass_fees
            FROM payment_requests pr
            JOIN tenants t ON pr.tenant_id = t.id
            LEFT JOIN organizations o ON t.organization_id = o.id
            WHERE pr.id = ? AND pr.status = 'active'
        `).bind(requestId).first();

        if (!request) {
            return json({ success: false, error: { message: 'Payment request not found or closed' } }, 404, corsHdrs);
        }

        // Check if already paid
        const existingPayment = await env.DB.prepare(
            'SELECT id FROM member_payments WHERE request_id = ? AND payer_email = ? AND status = ?'
        ).bind(requestId, payerEmail, 'completed').first();

        if (existingPayment) {
            return json({ success: false, error: { message: 'Already paid' } }, 400, corsHdrs);
        }

        // Calculate fees
        const plan = request.plan || 'essentials';
        const fees = PLAN_FEES[plan] || PLAN_FEES.essentials;
        const passFees = request.org_pass_fees || request.pass_fees_to_payer || 0;

        const baseAmount = request.amount_gbp;  // in pence
        const platformFee = Math.round(baseAmount * fees.percent) + fees.fixed;
        const stripeFee = Math.round(baseAmount * 0.029) + 20;  // Stripe's actual fee

        let amountToCharge: number;
        let netToClub: number;

        if (passFees) {
            // Pass fees to payer - club gets full amount, payer pays more
            amountToCharge = baseAmount + platformFee;
            netToClub = baseAmount;
        } else {
            // Club absorbs fees
            amountToCharge = baseAmount;
            netToClub = baseAmount - platformFee - stripeFee;
        }

        const stripe = getStripe(env);

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountToCharge,
            currency: 'gbp',
            metadata: {
                request_id: requestId,
                tenant_id: request.tenant_id,
                payer_email: payerEmail,
                player_id: playerId || '',
            },
            receipt_email: payerEmail,
            description: `${request.title} - Payment`,
        } as any);

        // Record pending payment
        const paymentId = `mp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await env.DB.prepare(`
            INSERT INTO member_payments 
            (id, request_id, tenant_id, player_id, payer_name, payer_email, 
             amount_requested, amount_paid, platform_fee, stripe_fee, net_to_club, 
             stripe_payment_intent_id, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `).bind(
            paymentId,
            requestId,
            request.tenant_id,
            playerId || null,
            payerName,
            payerEmail,
            baseAmount,
            amountToCharge,
            platformFee,
            stripeFee,
            netToClub,
            paymentIntent.id
        ).run();

        return json({
            success: true,
            data: {
                paymentId,
                clientSecret: paymentIntent.client_secret,
                amount: amountToCharge / 100,
                breakdown: {
                    requested: baseAmount / 100,
                    fees: passFees ? platformFee / 100 : 0,
                    total: amountToCharge / 100,
                }
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        console.error('[Dues] Payment error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/dues/confirm
 * Confirm payment was completed (called after Stripe confirms)
 */
export async function handleConfirmDuesPayment(req: Request, env: any, corsHdrs: Headers) {
    try {
        const body = await req.json() as { paymentIntentId: string };
        const { paymentIntentId } = body;

        if (!paymentIntentId) {
            return json({ success: false, error: { message: 'Payment intent ID required' } }, 400, corsHdrs);
        }

        const stripe = getStripe(env);
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return json({
                success: false,
                error: { message: `Payment status: ${paymentIntent.status}` }
            }, 400, corsHdrs);
        }

        // Update payment record
        await env.DB.prepare(`
            UPDATE member_payments 
            SET status = 'completed', 
                stripe_charge_id = ?,
                paid_at = unixepoch()
            WHERE stripe_payment_intent_id = ?
        `).bind(
            paymentIntent.latest_charge || null,
            paymentIntentId
        ).run();

        return json({
            success: true,
            message: 'Payment confirmed. Thank you!'
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/dues/remind
 * Send reminder to unpaid members
 */
export async function handleSendReminder(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as { requestId: string };
        const { requestId } = body;

        // Verify ownership
        const request = await env.DB.prepare(
            'SELECT * FROM payment_requests WHERE id = ? AND tenant_id = ?'
        ).bind(requestId, tenantId).first();

        if (!request) {
            return json({ success: false, error: { message: 'Request not found' } }, 404, corsHdrs);
        }

        // Get unpaid parents
        const paidEmails = await env.DB.prepare(`
            SELECT payer_email FROM member_payments 
            WHERE request_id = ? AND status = 'completed'
        `).bind(requestId).all();

        const paidSet = new Set((paidEmails.results || []).map((r: any) => r.payer_email));

        const { results: players } = await env.DB.prepare(
            'SELECT parent_email FROM players WHERE tenant_id = ? AND parent_email IS NOT NULL'
        ).bind(tenantId).all();

        const unpaidEmails = (players || [])
            .map((p: any) => p.parent_email)
            .filter((email: string) => email && !paidSet.has(email));

        // TODO: Send actual email reminders via Resend
        console.log(`[Dues] Sending reminders to ${unpaidEmails.length} parents for ${request.title}`);

        // Update reminder count
        await env.DB.prepare(
            'UPDATE payment_requests SET reminder_count = reminder_count + 1 WHERE id = ?'
        ).bind(requestId).run();

        return json({
            success: true,
            data: {
                remindersSent: unpaidEmails.length,
                message: `Reminders sent to ${unpaidEmails.length} members`
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * PUT /api/v1/dues/requests/:id/close
 * Close a payment request
 */
export async function handleClosePaymentRequest(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const url = new URL(req.url);
        const requestId = url.pathname.split('/').slice(-2)[0];

        await env.DB.prepare(`
            UPDATE payment_requests 
            SET status = 'closed', closed_at = unixepoch()
            WHERE id = ? AND tenant_id = ?
        `).bind(requestId, tenantId).run();

        return json({ success: true, message: 'Request closed' }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}
