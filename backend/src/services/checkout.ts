import Stripe from 'stripe';
import { getCart, calculateCartTotal } from './cart';
import { PrintifyService } from './printify';

export async function createCheckoutSession(
    cartId: string,
    customerEmail: string,
    env: any
): Promise<{ sessionId: string; url: string }> {
    const cart = await getCart(cartId, env);
    if (!cart) {
        throw new Error('Cart not found or expired');
    }

    if (cart.items.length === 0) {
        throw new Error('Cart is empty');
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-11-20.acacia' as any // Use latest or matching api version
    });

    const total = calculateCartTotal(cart);
    const commissionRate = 0.10; // 10% to club
    const commission = Math.floor(total * commissionRate);

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: customerEmail,
        line_items: cart.items.map(item => ({
            price_data: {
                currency: 'gbp',
                product_data: {
                    name: item.title,
                    metadata: {
                        productId: item.productId,
                        variantId: item.variantId
                    }
                },
                unit_amount: item.priceGbp
            },
            quantity: item.quantity
        })),
        // Update success/cancel URLs to match your frontend/app scheme
        // If mobile app, might need deep link. For now using web fallback or app scheme if env var set.
        success_url: `${env.APP_BASE_URL || 'https://systontigers.com'}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.APP_BASE_URL || 'https://systontigers.com'}/shop/cart`,
        metadata: {
            cart_id: cartId,
            tenant_id: cart.tenantId,
            commission_gbp: commission.toString()
        },
        shipping_address_collection: {
            allowed_countries: ['GB', 'US', 'CA', 'AU', 'NZ', 'IE']
        },
        phone_number_collection: {
            enabled: true
        }
    });

    return {
        sessionId: session.id,
        url: session.url!
    };
}

export async function handleStripeWebhook(
    request: Request,
    env: any
): Promise<Response> {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-11-20.acacia' as any
    });

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
        return new Response('No signature', { status: 400 });
    }

    const body = await request.text();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return new Response('Invalid signature', { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        await handlePaymentSuccess(session, env);
    }

    return new Response('OK', { status: 200 });
}

async function handlePaymentSuccess(
    session: Stripe.Checkout.Session,
    env: any
): Promise<void> {
    const cartId = session.metadata!.cart_id;
    const tenantId = session.metadata!.tenant_id;
    const commissionGbp = parseInt(session.metadata!.commission_gbp);

    // Retrieve cart - if expired/missing, we might have issues reconstituting order items
    // ideally we should perserve cart or metadata has basic info.
    // But for full detail (variants etc) we need the cart or to inspect session line items if expanded.
    // Let's rely on KV Cart being present (TTL 1 hour, session usually faster).

    const cart = await getCart(cartId, env);
    if (!cart) {
        console.error('Cart not found for completed session:', session.id);
        // Fallback: could fetch line_items from Stripe API to reconstruct order
        return;
    }

    const orderId = `order_${crypto.randomUUID()}`;
    const timestamp = Date.now();

    // Note: shipping is available on Session after successful checkout but not typed in Stripe's TS defs
    // We access it with type assertion for runtime availability
    const shippingDetails = (session as any).shipping ?? (session as any).shipping_details ?? null;

    // Create order in D1
    await env.DB.prepare(`
    INSERT INTO orders (
      id, tenant_id, stripe_session_id, stripe_payment_intent,
      customer_email, customer_name, shipping_address_json,
      total_gbp, commission_gbp, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)
  `).bind(
        orderId,
        tenantId,
        session.id,
        session.payment_intent as string,
        session.customer_details!.email,
        session.customer_details!.name,
        JSON.stringify(shippingDetails),
        session.amount_total!, // Already in pence
        commissionGbp,
        timestamp,
        timestamp
    ).run();

    // Insert line items
    for (const item of cart.items) {
        const itemId = `item_${crypto.randomUUID()}`;

        await env.DB.prepare(`
      INSERT INTO order_items (id, order_id, product_id, variant_id, quantity, price_gbp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
            itemId,
            orderId,
            item.productId,
            item.variantId,
            item.quantity,
            item.priceGbp,
            timestamp
        ).run();
    }

    // Trigger Printify fulfillment
    await fulfillOrder(orderId, env);

    // Clean up cart
    await env.KV_CARTS.delete(cartId);
}

async function fulfillOrder(orderId: string, env: any): Promise<void> {
    // Get order with items
    const { results } = await env.DB.prepare(`
    SELECT o.*, oi.*, p.printify_id, v.printify_variant_id
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    JOIN product_variants v ON oi.variant_id = v.id
    WHERE o.id = ? AND p.vendor = 'printify'
  `).bind(orderId).all();

    if (!results || results.length === 0) {
        return; // No Printify items
    }

    const orderFirstRow = results[0] as any;
    const shippingAddress = JSON.parse(orderFirstRow.shipping_address_json);

    const printify = new PrintifyService(
        env.PRINTIFY_API_KEY,
        env.PRINTIFY_SHOP_ID
    );

    const printifyItems = results.map((row: any) => ({
        printifyProductId: row.printify_id,
        printifyVariantId: parseInt(row.printify_variant_id),
        quantity: row.quantity
    }));

    try {
        const printifyOrder = await printify.createOrder({
            external_id: orderId,
            line_items: printifyItems,
            shipping_method: 1, // Standard shipping - should be configured per shop
            send_shipping_notification: true,
            address_to: {
                first_name: orderFirstRow.customer_name.split(' ')[0] || 'Customer',
                last_name: orderFirstRow.customer_name.split(' ').slice(1).join(' ') || '.',
                email: orderFirstRow.customer_email,
                phone: shippingAddress.phone || '',
                country: shippingAddress.address?.country || 'GB',
                region: shippingAddress.address?.state || '',
                address1: shippingAddress.address?.line1 || '',
                address2: shippingAddress.address?.line2 || '',
                city: shippingAddress.address?.city || '',
                zip: shippingAddress.address?.postal_code || ''
            }
        });

        // Update order items with Printify order ID
        for (const row of results as any[]) {
            await env.DB.prepare(`
        UPDATE order_items
        SET printify_order_id = ?
        WHERE id = ?
      `).bind((printifyOrder as any).id, row.id).run();
        }

        // Update order status
        await env.DB.prepare(`
      UPDATE orders
      SET status = 'fulfilled', updated_at = ?
      WHERE id = ?
    `).bind(Date.now(), orderId).run();

    } catch (error) {
        console.error('Printify fulfillment failed:', error);
        // Order stays in 'paid' status, admin can retry manually
    }
}
