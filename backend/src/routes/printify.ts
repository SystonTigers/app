/**
 * Printify Integration Routes
 * Print-on-demand product management and order fulfillment
 */

import { requireJWT } from '../services/auth';

/** Printify isn't connected yet (no PRINTIFY_API_TOKEN). Shown to staff as "not set up". */
export class PrintifyNotSetUp extends Error {
    constructor() {
        super('Merchandise printing is not set up yet.');
    }
}
import { json } from '../services/util';

const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

/**
 * Call the Printify API. Throws with the status and message on non-2xx so callers
 * don't try to .map()/.filter() an error body.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Printify payloads are untyped upstream
async function printifyFetch<T = any>(env: any, endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!env.PRINTIFY_API_TOKEN) {
        throw new PrintifyNotSetUp();
    }
    const response = await fetch(`${PRINTIFY_API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${env.PRINTIFY_API_TOKEN}`,
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    const body = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    if (!response.ok) {
        throw new Error(`Printify ${response.status}: ${body?.message || body?.error || response.statusText}`);
    }
    return body as T;
}

// ============================================
// SHOP MANAGEMENT
// ============================================

/**
 * GET /api/v1/printify/shops
 * List all Printify shops (your connected stores)
 */
export async function handleListPrintifyShops(req: Request, env: any, corsHdrs: Headers) {
    try {
        const data = await printifyFetch(env, '/shops.json');
        return json({ success: true, data }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { code: error instanceof PrintifyNotSetUp ? 'NOT_SET_UP' : 'PRINTIFY_ERROR', message: error.message } }, error instanceof PrintifyNotSetUp ? 503 : 500, corsHdrs);
    }
}

// ============================================
// CATALOG (Available Products)
// ============================================

/**
 * GET /api/v1/printify/catalog
 * Get available print providers and their products
 */
export async function handleGetPrintifyCatalog(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        const category = url.searchParams.get('category');

        // Get list of blueprints (product types)
        const blueprints = await printifyFetch(env, '/catalog/blueprints.json');

        // Filter by category if specified
        let filtered = blueprints;
        if (category) {
            filtered = blueprints.filter((b: any) =>
                b.title.toLowerCase().includes(category.toLowerCase())
            );
        }

        return json({
            success: true,
            data: filtered.map((b: any) => ({
                id: b.id,
                title: b.title,
                description: b.description,
                images: b.images,
            }))
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { code: error instanceof PrintifyNotSetUp ? 'NOT_SET_UP' : 'PRINTIFY_ERROR', message: error.message } }, error instanceof PrintifyNotSetUp ? 503 : 500, corsHdrs);
    }
}

/**
 * GET /api/v1/printify/catalog/:blueprintId/providers
 * Get print providers for a specific product type
 */
export async function handleGetPrintProviders(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        const blueprintId = url.pathname.split('/').slice(-2)[0];

        const providers = await printifyFetch(env, `/catalog/blueprints/${blueprintId}/print_providers.json`);

        return json({
            success: true,
            data: providers.map((p: any) => ({
                id: p.id,
                title: p.title,
                location: p.location,
            }))
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { code: error instanceof PrintifyNotSetUp ? 'NOT_SET_UP' : 'PRINTIFY_ERROR', message: error.message } }, error instanceof PrintifyNotSetUp ? 503 : 500, corsHdrs);
    }
}

/**
 * GET /api/v1/printify/catalog/:blueprintId/providers/:providerId/variants
 * Get variants (sizes, colors) for a product from a specific provider
 */
export async function handleGetVariants(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        const parts = url.pathname.split('/');
        const providerId = parts.pop();
        parts.pop(); // skip 'providers'
        const blueprintId = parts.pop();

        const variants = await printifyFetch(
            env,
            `/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`
        );

        return json({
            success: true,
            data: variants.variants?.map((v: any) => ({
                id: v.id,
                title: v.title,
                options: v.options,
                placeholders: v.placeholders,
            })) || []
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { code: error instanceof PrintifyNotSetUp ? 'NOT_SET_UP' : 'PRINTIFY_ERROR', message: error.message } }, error instanceof PrintifyNotSetUp ? 503 : 500, corsHdrs);
    }
}

// ============================================
// PRODUCT MANAGEMENT
// ============================================

/**
 * POST /api/v1/printify/products
 * Create a new product on Printify
 */
export async function handleCreatePrintifyProduct(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as {
            shopId: string;
            title: string;
            description: string;
            blueprintId: number;
            printProviderId: number;
            variants: Array<{
                id: number;
                price: number;  // In pence
                isEnabled: boolean;
            }>;
            printAreas: Array<{
                variant_ids: number[];
                placeholders: Array<{
                    position: string;
                    images: Array<{
                        id: string;
                        x: number;
                        y: number;
                        scale: number;
                        angle: number;
                    }>;
                }>;
            }>;
        };

        // Create product on Printify
        const product = await printifyFetch(env, `/shops/${body.shopId}/products.json`, {
            method: 'POST',
            body: JSON.stringify({
                title: body.title,
                description: body.description,
                blueprint_id: body.blueprintId,
                print_provider_id: body.printProviderId,
                variants: body.variants.map(v => ({
                    id: v.id,
                    price: v.price, // Printify expects cents/pence
                    is_enabled: v.isEnabled,
                })),
                print_areas: body.printAreas,
            }),
        });

        // Store reference in our database
        if (product.id) {
            await env.DB.prepare(`
                INSERT INTO printify_templates 
                (id, tenant_id, printify_product_id, name, base_price_gbp, printify_cost_gbp, status, blueprint_id, print_provider_id, variants_json)
                VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
            `).bind(
                `pt_${Date.now()}`,
                tenantId,
                product.id,
                body.title,
                body.variants[0]?.price || 0,
                0, // Will be updated from Printify
                'active',
                body.blueprintId,
                body.printProviderId,
                JSON.stringify(body.variants)
            ).run();
        }

        return json({ success: true, data: product }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { code: error instanceof PrintifyNotSetUp ? 'NOT_SET_UP' : 'PRINTIFY_ERROR', message: error.message } }, error instanceof PrintifyNotSetUp ? 503 : 500, corsHdrs);
    }
}

/**
 * GET /api/v1/printify/products/:shopId
 * List products in a Printify shop
 */
export async function handleListPrintifyProducts(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        const shopId = url.pathname.split('/').pop();

        const products = await printifyFetch(env, `/shops/${shopId}/products.json`);

        return json({
            success: true,
            data: products.data?.map((p: any) => ({
                id: p.id,
                title: p.title,
                description: p.description,
                images: p.images,
                variants: p.variants,
                isLocked: p.is_locked,
            })) || []
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { code: error instanceof PrintifyNotSetUp ? 'NOT_SET_UP' : 'PRINTIFY_ERROR', message: error.message } }, error instanceof PrintifyNotSetUp ? 503 : 500, corsHdrs);
    }
}

// ============================================
// IMAGE UPLOADS
// ============================================

/**
 * POST /api/v1/printify/uploads
 * Upload an image to Printify for use in products
 */
export async function handleUploadToPrintify(req: Request, env: any, corsHdrs: Headers) {
    try {
        const body = await req.json() as {
            fileName: string;
            url?: string;
            base64?: string;
        };

        const uploadData: any = { file_name: body.fileName };

        if (body.url) {
            uploadData.url = body.url;
        } else if (body.base64) {
            uploadData.contents = body.base64;
        }

        const upload = await printifyFetch(env, '/uploads/images.json', {
            method: 'POST',
            body: JSON.stringify(uploadData),
        });

        return json({ success: true, data: upload }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { code: error instanceof PrintifyNotSetUp ? 'NOT_SET_UP' : 'PRINTIFY_ERROR', message: error.message } }, error instanceof PrintifyNotSetUp ? 503 : 500, corsHdrs);
    }
}

// ============================================
// ORDER MANAGEMENT
// ============================================

/**
 * POST /api/v1/printify/orders
 * Create an order on Printify (after customer payment)
 */
export async function handleCreatePrintifyOrder(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as {
            shopId: string;
            externalId: string;  // Our order ID
            lineItems: Array<{
                productId: string;
                variantId: number;
                quantity: number;
            }>;
            shippingAddress: {
                firstName: string;
                lastName: string;
                email: string;
                phone?: string;
                address1: string;
                address2?: string;
                city: string;
                region?: string;
                country: string;
                zip: string;
            };
        };

        const order = await printifyFetch(env, `/shops/${body.shopId}/orders.json`, {
            method: 'POST',
            body: JSON.stringify({
                external_id: body.externalId,
                line_items: body.lineItems.map(item => ({
                    product_id: item.productId,
                    variant_id: item.variantId,
                    quantity: item.quantity,
                })),
                shipping_method: 1, // Standard shipping
                address_to: {
                    first_name: body.shippingAddress.firstName,
                    last_name: body.shippingAddress.lastName,
                    email: body.shippingAddress.email,
                    phone: body.shippingAddress.phone || '',
                    address1: body.shippingAddress.address1,
                    address2: body.shippingAddress.address2 || '',
                    city: body.shippingAddress.city,
                    region: body.shippingAddress.region || '',
                    country: body.shippingAddress.country,
                    zip: body.shippingAddress.zip,
                },
            }),
        });

        // Update our order with Printify order ID (only this club's orders)
        if (order.id && body.externalId) {
            await env.DB.prepare(
                'UPDATE shop_orders SET printify_order_id = ?, status = ? WHERE id = ? AND tenant_id = ?'
            ).bind(order.id, 'processing', body.externalId, claims.tenantId).run();
        }

        return json({ success: true, data: order }, 201, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { code: error instanceof PrintifyNotSetUp ? 'NOT_SET_UP' : 'PRINTIFY_ERROR', message: error.message } }, error instanceof PrintifyNotSetUp ? 503 : 500, corsHdrs);
    }
}

/**
 * POST /api/v1/printify/orders/:orderId/send
 * Send an order to production (trigger printing/shipping)
 */
export async function handleSendOrderToProduction(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        const orderId = url.pathname.split('/').slice(-2)[0];
        const body = await req.json() as { shopId: string };

        await printifyFetch(env, `/shops/${body.shopId}/orders/${orderId}/send_to_production.json`, {
            method: 'POST',
        });

        return json({ success: true, message: 'Order sent to production' }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { code: error instanceof PrintifyNotSetUp ? 'NOT_SET_UP' : 'PRINTIFY_ERROR', message: error.message } }, error instanceof PrintifyNotSetUp ? 503 : 500, corsHdrs);
    }
}

/**
 * GET /api/v1/printify/orders/:shopId/:orderId
 * Get order status
 */
export async function handleGetPrintifyOrder(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        const parts = url.pathname.split('/');
        const orderId = parts.pop();
        const shopId = parts.pop();

        const order = await printifyFetch(env, `/shops/${shopId}/orders/${orderId}.json`);

        return json({ success: true, data: order }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { code: error instanceof PrintifyNotSetUp ? 'NOT_SET_UP' : 'PRINTIFY_ERROR', message: error.message } }, error instanceof PrintifyNotSetUp ? 503 : 500, corsHdrs);
    }
}

// ============================================
// WEBHOOKS
// ============================================

/**
 * A signed Printify webhook names an order only by Printify's own id, which
 * is unique across every club's orders. Find which club it belongs to first,
 * then update it within that club.
 */
async function setStatusByPrintifyOrder(env: any, printifyOrderId: string, status: string): Promise<void> {
    const { results } = await env.DB.prepare(
        'SELECT id, tenant_id FROM shop_orders WHERE printify_order_id = ?'
    ).bind(printifyOrderId).all();
    const rows = (results || []) as Array<{ id: string; tenant_id: string }>;
    if (!rows.length) return;
    await env.DB.batch(rows.map((r) => env.DB.prepare(
        'UPDATE shop_orders SET status = ? WHERE id = ? AND tenant_id = ?'
    ).bind(status, r.id, r.tenant_id)));
    console.log(JSON.stringify({ level: 'info', msg: 'printify_order_status', status, tenants: [...new Set(rows.map((r) => r.tenant_id))] }));
}

/**
 * POST /webhooks/printify
 * Handle Printify webhooks (order updates, shipping notifications)
 */
export async function handlePrintifyWebhook(req: Request, env: any) {
    try {
        // Only Printify can tell us an order changed: the body is signed with our webhook secret
        const raw = await req.text();
        if (!env.PRINTIFY_WEBHOOK_SECRET) return json({ error: 'Printify webhooks are not set up' }, 503);
        if (!(await validPrintifySignature(raw, req.headers.get('x-pf-signature'), env.PRINTIFY_WEBHOOK_SECRET))) {
            return json({ error: 'Invalid signature' }, 401);
        }
        const body = JSON.parse(raw) as {
            type: string;
            resource: any;
        };

        // Never log the resource: it holds customers' names and addresses
        console.log(JSON.stringify({ level: 'info', msg: 'printify_webhook', type: body.type, id: body.resource?.id ?? null }));

        switch (body.type) {
            case 'order:created':
            case 'order:updated':
                // Update our order status
                if (body.resource?.id) {
                    const status = body.resource.status === 'fulfilled' ? 'shipped' :
                        body.resource.status === 'canceled' ? 'cancelled' :
                            'processing';
                    await setStatusByPrintifyOrder(env, String(body.resource.id), status);
                }
                break;

            case 'order:shipped':
                if (body.resource?.id) {
                    await setStatusByPrintifyOrder(env, String(body.resource.id), 'shipped');
                }
                break;
        }

        return json({ received: true }, 200);
    } catch (error: any) {
        console.error('[Printify Webhook] Error:', error);
        return json({ error: error.message }, 500);
    }
}

/** Printify signs webhook bodies: X-Pf-Signature = "sha256=" + hex HMAC-SHA256(secret, body). */
export async function validPrintifySignature(raw: string, header: string | null, secret: string): Promise<boolean> {
    if (!header) return false;
    const given = header.replace(/^sha256=/, '').trim().toLowerCase();
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
    const expected = Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
    if (given.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
}
