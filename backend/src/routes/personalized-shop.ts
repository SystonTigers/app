/**
 * Personalized Shop Routes
 * Player-specific merchandise, manager phrases, Printify integration
 */

import Stripe from 'stripe';
import { requireJWT } from '../services/auth';
import { json } from '../services/util';

function getStripe(env: any): Stripe {
    return new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-11-20.acacia' as any,
    });
}

// Commission rates by plan
const COMMISSION_RATES: Record<string, number> = {
    essentials: 10,  // 10%
    team: 7,         // 7%
    club: 5,         // 5%
    club_pro: 3,     // 3%
};

// ============================================
// PERSONALIZED PRODUCTS
// ============================================

/**
 * GET /api/v1/shop/personalized
 * Get products personalized for the current player
 */
export async function handleGetPersonalizedProducts(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;
        const playerId = claims.playerId;

        // Get player info for personalization
        let playerName = '';
        let playerNumber = '';

        if (playerId) {
            const player = await env.DB.prepare(
                'SELECT name, squad_number FROM players WHERE id = ?'
            ).bind(playerId).first();

            if (player) {
                playerName = player.name || '';
                playerNumber = player.squad_number?.toString() || '';
            }
        }

        // Get tenant/club info
        const tenant = await env.DB.prepare(
            'SELECT name, logo_url FROM tenants WHERE id = ?'
        ).bind(tenantId).first();

        // Get Printify templates
        const { results: templates } = await env.DB.prepare(`
            SELECT * FROM printify_templates 
            WHERE (tenant_id = ? OR tenant_id IS NULL) AND status = 'active'
            ORDER BY created_at DESC
        `).bind(tenantId).all();

        // Get club custom products
        const { results: clubProducts } = await env.DB.prepare(
            'SELECT * FROM club_products WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC'
        ).bind(tenantId, 'active').all();

        // Get manager phrases
        const { results: phrases } = await env.DB.prepare(
            'SELECT * FROM shop_phrases WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC'
        ).bind(tenantId, 'active').all();

        // Build personalized product list
        const personalizedProducts = (templates || []).map((t: any) => ({
            id: t.id,
            type: 'printify',
            name: t.name,
            category: t.category,
            price: t.base_price_gbp / 100,
            imageUrl: t.image_url,
            personalization: {
                clubName: tenant?.name || 'Your Club',
                clubLogo: tenant?.logo_url || null,
                playerName: playerName,
                playerNumber: playerNumber,
                supportsName: !!t.supports_name,
                supportsNumber: !!t.supports_number,
                supportsPhrase: !!t.supports_phrase,
            },
        }));

        const customProducts = (clubProducts || []).map((p: any) => ({
            id: p.id,
            type: 'club',
            name: p.name,
            description: p.description,
            category: p.category,
            price: p.price_gbp / 100,
            imageUrl: p.image_url,
            inStock: p.stock_quantity === -1 || p.stock_quantity > 0,
        }));

        return json({
            success: true,
            data: {
                player: {
                    name: playerName,
                    number: playerNumber,
                },
                club: {
                    name: tenant?.name || 'Your Club',
                    logo: tenant?.logo_url,
                },
                phrases: (phrases || []).map((p: any) => ({
                    id: p.id,
                    text: p.phrase,
                    type: p.phrase_type,
                })),
                products: {
                    personalized: personalizedProducts,
                    club: customProducts,
                },
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ============================================
// MANAGER PHRASES
// ============================================

/**
 * POST /api/v1/shop/phrases
 * Add a custom phrase/slogan
 */
export async function handleAddPhrase(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as {
            phrase: string;
            type?: 'slogan' | 'funny' | 'season' | 'custom';
            isDefault?: boolean;
        };

        if (!body.phrase) {
            return json({ success: false, error: { message: 'Phrase required' } }, 400, corsHdrs);
        }

        const phraseId = `phrase_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        await env.DB.prepare(`
            INSERT INTO shop_phrases (id, tenant_id, phrase, phrase_type, is_default)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            phraseId,
            tenantId,
            body.phrase,
            body.type || 'custom',
            body.isDefault ? 1 : 0
        ).run();

        return json({ success: true, data: { id: phraseId } }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/shop/phrases
 * List phrases for the team
 */
export async function handleListPhrases(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const { results: phrases } = await env.DB.prepare(
            'SELECT * FROM shop_phrases WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC'
        ).bind(tenantId, 'active').all();

        return json({
            success: true,
            data: (phrases || []).map((p: any) => ({
                id: p.id,
                phrase: p.phrase,
                type: p.phrase_type,
                isDefault: !!p.is_default,
            }))
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * DELETE /api/v1/shop/phrases/:id
 * Remove a phrase
 */
export async function handleDeletePhrase(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;
        const url = new URL(req.url);
        const phraseId = url.pathname.split('/').pop();

        await env.DB.prepare(
            'UPDATE shop_phrases SET status = ? WHERE id = ? AND tenant_id = ?'
        ).bind('deleted', phraseId, tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ============================================
// CLUB PRODUCTS
// ============================================

/**
 * POST /api/v1/shop/club-products
 * Add a club's own product
 */
export async function handleAddClubProduct(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as {
            name: string;
            description?: string;
            price: number;
            cost?: number;
            category?: string;
            imageUrl?: string;
            stockQuantity?: number;
        };

        if (!body.name || !body.price) {
            return json({ success: false, error: { message: 'Name and price required' } }, 400, corsHdrs);
        }

        const productId = `cp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        await env.DB.prepare(`
            INSERT INTO club_products (id, tenant_id, name, description, price_gbp, cost_gbp, category, image_url, stock_quantity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            productId,
            tenantId,
            body.name,
            body.description || null,
            Math.round(body.price * 100),
            body.cost ? Math.round(body.cost * 100) : 0,
            body.category || null,
            body.imageUrl || null,
            body.stockQuantity ?? -1
        ).run();

        return json({ success: true, data: { id: productId } }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/shop/club-products
 * List club's own products
 */
export async function handleListClubProducts(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const { results: products } = await env.DB.prepare(
            'SELECT * FROM club_products WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC'
        ).bind(tenantId, 'active').all();

        return json({
            success: true,
            data: (products || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price: p.price_gbp / 100,
                cost: p.cost_gbp / 100,
                category: p.category,
                imageUrl: p.image_url,
                stockQuantity: p.stock_quantity,
            }))
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ============================================
// SHOP ORDERS
// ============================================

/**
 * POST /api/v1/shop/orders
 * Create a shop order with personalization
 */
export async function handleCreateShopOrder(req: Request, env: any, corsHdrs: Headers) {
    try {
        const body = await req.json() as {
            tenantId: string;
            playerId?: string;
            customerEmail: string;
            customerName: string;
            items: Array<{
                productId: string;
                productType: 'printify' | 'club';
                quantity: number;
                price: number;
                personalization?: {
                    name?: string;
                    number?: string;
                    phrase?: string;
                };
            }>;
        };

        if (!body.tenantId || !body.customerEmail || !body.items?.length) {
            return json({ success: false, error: { message: 'Missing required fields' } }, 400, corsHdrs);
        }

        // Get tenant plan for commission rate
        const tenant = await env.DB.prepare(
            'SELECT plan FROM tenants WHERE id = ?'
        ).bind(body.tenantId).first();

        const commissionRate = COMMISSION_RATES[tenant?.plan || 'essentials'] || 10;

        // Calculate totals
        const subtotal = body.items.reduce((sum, item) => sum + (item.price * item.quantity * 100), 0);
        const platformFee = Math.round(subtotal * (commissionRate / 100));
        const total = subtotal;

        const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        await env.DB.prepare(`
            INSERT INTO shop_orders 
            (id, tenant_id, player_id, customer_email, customer_name, items_json, subtotal_gbp, platform_fee_gbp, total_gbp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            orderId,
            body.tenantId,
            body.playerId || null,
            body.customerEmail,
            body.customerName,
            JSON.stringify(body.items),
            subtotal,
            platformFee,
            total
        ).run();

        // Create Stripe payment
        const stripe = getStripe(env);
        const paymentIntent = await stripe.paymentIntents.create({
            amount: total,
            currency: 'gbp',
            metadata: {
                order_id: orderId,
                tenant_id: body.tenantId,
            },
            receipt_email: body.customerEmail,
        } as any);

        return json({
            success: true,
            data: {
                orderId,
                clientSecret: paymentIntent.client_secret,
                subtotal: subtotal / 100,
                platformFee: platformFee / 100,
                total: total / 100,
            }
        }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/shop/orders/:id/confirm
 * Confirm order payment and record revenue
 */
export async function handleConfirmShopOrder(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        const orderId = url.pathname.split('/').slice(-2)[0];

        const body = await req.json() as { paymentIntentId: string };

        const stripe = getStripe(env);
        const paymentIntent = await stripe.paymentIntents.retrieve(body.paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return json({ success: false, error: { message: 'Payment not successful' } }, 400, corsHdrs);
        }

        // Get order
        const order = await env.DB.prepare(
            'SELECT * FROM shop_orders WHERE id = ?'
        ).bind(orderId).first();

        if (!order) {
            return json({ success: false, error: { message: 'Order not found' } }, 404, corsHdrs);
        }

        // Update order status
        await env.DB.prepare(`
            UPDATE shop_orders SET status = 'paid', stripe_payment_id = ? WHERE id = ?
        `).bind(body.paymentIntentId, orderId).run();

        // Record platform revenue
        await env.DB.prepare(`
            INSERT INTO platform_revenue (id, tenant_id, revenue_type, amount_gbp, source_id, description)
            VALUES (?, ?, 'shop_commission', ?, ?, ?)
        `).bind(
            `rev_${Date.now()}`,
            order.tenant_id,
            order.platform_fee_gbp,
            orderId,
            'Shop order commission'
        ).run();

        return json({ success: true, message: 'Order confirmed' }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}
