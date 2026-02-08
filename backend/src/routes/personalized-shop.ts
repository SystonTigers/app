/**
 * Personalized Shop Routes
 * Player-specific merchandise, manager phrases, Printify integration
 */

import Stripe from 'stripe';
import { requireJWT } from '../services/auth';
import { json } from '../services/util';
import { getCart } from '../services/cart';
import { generatePersonalizedSVG } from './personalization';

const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

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
        const playerId = (claims as any).playerId;

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
            variants: t.variants_json ? JSON.parse(t.variants_json).map((v: any) => ({
                id: `v_${t.id}_${v.id}`, // Create unique ID composite
                title: v.title || 'Standard',
                price_gbp: v.price, // Already in pence/cents
                provider_variant_id: v.id // Keep original for reference
            })) : [],
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
 * POST /api/v1/shop/checkout
 * Create a Stripe Checkout Session for the cart
 */
export async function handleCreateCheckoutSession(req: Request, env: any, corsHdrs: Headers) {
    try {
        const body = await req.json() as {
            cartId: string;
            customerEmail: string;
        };

        if (!body.cartId || !body.customerEmail) {
            return json({ success: false, error: 'Missing cartId or email' }, 400, corsHdrs);
        }

        // 1. Get Cart
        const cart = await getCart(body.cartId, env);
        if (!cart || cart.items.length === 0) {
            return json({ success: false, error: 'Cart empty or expired' }, 400, corsHdrs);
        }

        // 2. Prepare Items for Order (Snapshot)
        const items = cart.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            productType: 'printify',
            quantity: item.quantity,
            price: item.priceGbp,
            title: item.title,
            personalization: item.personalization // { name, number, clubLogo }
        }));

        // 3. Create Pending Shop Order
        const tenantId = cart.tenantId;
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Get tenant plan/rate
        const tenant = await env.DB.prepare(
            'SELECT plan FROM tenants WHERE id = ?'
        ).bind(tenantId).first();
        const commissionRate = COMMISSION_RATES[tenant?.plan || 'essentials'] || 10;
        const platformFee = Math.round(subtotal * (commissionRate / 100));

        const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        await env.DB.prepare(`
            INSERT INTO shop_orders 
            (id, tenant_id, customer_email, items_json, subtotal_gbp, platform_fee_gbp, total_gbp, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `).bind(
            orderId,
            tenantId,
            body.customerEmail,
            JSON.stringify(items),
            subtotal,
            platformFee,
            subtotal // Total matches subtotal (no tax/shipping calc yet)
        ).run();

        // 4. Create Stripe Checkout Session
        const stripe = getStripe(env);
        const protocol = req.headers.get('x-forwarded-proto') || 'https';
        const host = req.headers.get('host');
        const baseUrl = `${protocol}://${host}`;
        // Note: For dev, this might point to localhost. Frontend usually knows better? 
        // Best to use ENV var for FRONTEND_URL or infer.
        // Assuming the referer or standard frontend URL.
        const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/[tenant]/shop/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`.replace('[tenant]', tenantId);
        const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/[tenant]/shop/cart`.replace('[tenant]', tenantId);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: items.map(item => ({
                price_data: {
                    currency: 'gbp',
                    product_data: {
                        name: item.title,
                        metadata: {
                            productId: item.productId,
                            variantId: item.variantId
                        }
                    },
                    unit_amount: item.price, // pence
                },
                quantity: item.quantity,
            })),
            customer_email: body.customerEmail,
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                order_id: orderId,
                tenant_id: tenantId
            },
            shipping_address_collection: {
                allowed_countries: ['GB', 'US'],
            }
        });

        return json({
            success: true,
            sessionId: session.id,
            url: session.url
        }, 200, corsHdrs);

    } catch (error: any) {
        console.error('Checkout failed', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}


export async function handleConfirmShopOrder(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        const orderId = url.pathname.split('/').slice(-2)[0];

        let paymentId = '';

        // Check query param for session_id (standard Stripe Checkout flow)
        // Or body for manual confirm?
        const body = await req.json().catch(() => ({})) as { paymentIntentId?: string, sessionId?: string };

        const stripe = getStripe(env);

        let shippingAddress = null;
        if (body.sessionId) {
            const session = await stripe.checkout.sessions.retrieve(body.sessionId);
            if (session.payment_status !== 'paid') {
                return json({ success: false, error: 'Not paid' }, 400, corsHdrs);
            }
            paymentId = session.payment_intent as string;
            if (session.customer_details?.address) {
                shippingAddress = session.customer_details.address;
            }
        } else if (body.paymentIntentId) {
            // ...
            // PaymentIntent usually doesn't have shipping address unless attached. 
            // We'll focus on Session flow for now.
            const pi = await stripe.paymentIntents.retrieve(body.paymentIntentId);
            if (pi.status !== 'succeeded') {
                return json({ success: false, error: 'Not succeeded' }, 400, corsHdrs);
            }
            paymentId = pi.id;
        }

        // Get order
        const order = await env.DB.prepare(
            'SELECT * FROM shop_orders WHERE id = ?'
        ).bind(orderId).first();

        if (!order) {
            return json({ success: false, error: { message: 'Order not found' } }, 404, corsHdrs);
        }

        if (order.status === 'paid') {
            return json({ success: true, message: 'Already confirmed' }, 200, corsHdrs);
        }

        // Update order status AND address
        await env.DB.prepare(`
            UPDATE shop_orders 
            SET status = 'paid', stripe_payment_id = ?, shipping_address_json = ? 
            WHERE id = ?
        `).bind(paymentId, shippingAddress ? JSON.stringify(shippingAddress) : null, orderId).run();

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

        // Start FULFILLMENT with fresh order data (or pass address)
        // We'll re-fetch order or manually attach address
        order.shipping_address_json = shippingAddress ? JSON.stringify(shippingAddress) : null;
        await fulfillOrder(order, env);

        return json({ success: true, message: 'Order confirmed and fulfillment started' }, 200, corsHdrs);
    } catch (error: any) {
        console.error('Confirm failed', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

async function fulfillOrder(order: any, env: any) {
    // 1. Parse items
    const items = JSON.parse(order.items_json);
    const tenant = await env.DB.prepare('SELECT name, logo_url FROM tenants WHERE id = ?').bind(order.tenant_id).first();

    const lineItems: any[] = [];

    for (const item of items) {
        try {
            // Check if it's a Printify Template Item (has variantId starting with v_)
            // Or use logic: if type='printify'

            // Get personalization data
            const pers = item.personalization || {};
            const hasPers = pers.name || pers.number || pers.clubLogo; // Basic check

            let finalProductId = '';
            let finalVariantId = 0;

            // Logic to find Provider/Blueprint
            // We need to look up the Template in DB to get the blueprint/provider IDs.
            // variantId format: v_{templateId}_{providerVariantId}
            let templateId = '';
            let providerVariantId = 0;

            if (item.variantId && item.variantId.startsWith('v_')) {
                const parts = item.variantId.split('_');
                providerVariantId = parseInt(parts.pop() || '0');
                templateId = parts.slice(1).join('_');
            }

            const template = await env.DB.prepare('SELECT * FROM printify_templates WHERE id = ?').bind(templateId).first();

            if (!template) {
                console.error('Template not found for item', item);
                continue;
            }

            if (hasPers) {
                // Generate Dynamic Product
                const svg = generatePersonalizedSVG({
                    clubName: tenant?.name || 'Club',
                    clubBadgeUrl: tenant?.logo_url,
                    playerName: pers.name,
                    playerNumber: pers.number,
                    position: 'front'
                });

                // Upload
                const base64 = btoa(unescape(encodeURIComponent(svg)));
                const uploadRes = await fetch(`${PRINTIFY_API_BASE}/uploads/images.json`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${env.PRINTIFY_API_TOKEN}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ file_name: `ord_${order.id}_${item.productId}.svg`, contents: base64 })
                });
                const uploadData = await uploadRes.json() as any;

                // Create Product
                if (uploadData?.id && template.blueprint_id && template.print_provider_id) {
                    const productRes = await fetch(`${PRINTIFY_API_BASE}/shops/${env.PRINTIFY_SHOP_ID}/products.json`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${env.PRINTIFY_API_TOKEN}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: `Custom Order: ${order.id}`,
                            description: 'Personalized Item',
                            blueprint_id: template.blueprint_id,
                            print_provider_id: template.print_provider_id,
                            variants: [{ id: providerVariantId, price: 0, is_enabled: true }],
                            print_areas: [{
                                variant_ids: [providerVariantId],
                                placeholders: [{ position: 'front', images: [{ id: uploadData.id, x: 0.5, y: 0.5, scale: 1, angle: 0 }] }]
                            }]
                        })
                    });
                    const productData = await productRes.json() as any;
                    if (productData.id) {
                        finalProductId = productData.id;
                        finalVariantId = providerVariantId;
                    }
                }
            } else {
                // Not personalized - use the mock template's REAL product ID?
                // Step 190 (printify.ts) says we store `printify_product_id` in templates.
                // If it's a real active product on Printify, we can order it directly!
                if (template.printify_product_id) {
                    finalProductId = template.printify_product_id;
                    finalVariantId = providerVariantId;
                }
            }

            if (finalProductId && finalVariantId) {
                lineItems.push({
                    product_id: finalProductId,
                    variant_id: finalVariantId,
                    quantity: item.quantity
                });
            }

        } catch (e) {
            console.error('Failed to process line item', e);
        }
    }

    if (lineItems.length > 0) {
        // Send Order to Printify
        await fetch(`${PRINTIFY_API_BASE}/shops/${env.PRINTIFY_SHOP_ID}/orders.json`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${env.PRINTIFY_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                external_id: order.id,
                line_items: lineItems,
                shipping_method: 1, // Standard
                address_to: (() => {
                    const addr = {
                        first_name: order.customer_name.split(' ')[0] || 'Fan',
                        last_name: order.customer_name.split(' ').slice(1).join(' ') || 'Customer',
                        email: order.customer_email,
                        phone: '',
                        address1: '123 Main St',
                        city: 'London',
                        country: 'GB',
                        zip: 'SW1A 1AA'
                    };
                    if (order.shipping_address_json) {
                        try {
                            const sa = JSON.parse(order.shipping_address_json);
                            addr.address1 = sa.line1 || addr.address1;
                            (addr as any).address2 = sa.line2 || '';
                            addr.city = sa.city || addr.city;
                            addr.country = sa.country || addr.country;
                            addr.zip = sa.postal_code || addr.zip;
                            if (sa.state) {(addr as any).region = sa.state;}
                        } catch (e) { console.error('Address parse error', e); }
                    }
                    return addr;
                })()
            })
        });
    }
}
// ============================================
// SHOP ORDERS
// ============================================

/**
 * GET /api/v1/shop/orders
 * List orders for the tenant
 */
export async function handleListShopOrders(req: Request, env: any, corsHdrs: Headers) {
    const tenantId = req.headers.get('x-tenant');
    if (!tenantId) {return json({ success: false, error: 'Tenant ID required' }, 400, corsHdrs);}

    try {
        const { results } = await env.DB.prepare(
            `SELECT * FROM shop_orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50`
        ).bind(tenantId).all();

        const orders = results.map((o: any) => ({
            ...o,
            items: JSON.parse(o.items_json),
            shippingAddress: o.shipping_address_json ? JSON.parse(o.shipping_address_json) : null
        }));

        return json({ success: true, data: orders }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}
