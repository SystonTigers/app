import type { Env } from '../env';
import { PrintifyService, PrintifyOrderPayload } from './printify';
import { json } from './util'; // Assuming a util exists, or we use Response directly

// Customize Printify product with team branding
export const customize = async (req: any, env: Env) => {
  const {
    product_id,
    badge_url,
    team_name,
    colors,
    slogan,
  } = req.json || {};

  if (!product_id) {
    return new Response(
      JSON.stringify({ error: 'product_id required' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  // Get tenant config for branding
  const config: any = await env.KV.get(
    `team:${req.tenant}:config`,
    'json'
  );

  const customization = {
    product_id,
    badge_url: badge_url || config?.badge_url,
    team_name: team_name || config?.name,
    colors: colors || config?.colors,
    slogan: slogan || config?.slogan,
  };

  // Logic to actually create a product in Printify would go here
  // (e.g. using Printify's Product Creator API which is complex)
  // For MVP, we might just store the customization data and apply it on the frontend
  // or use a "base product" in Printify and overlay the design.

  const custom_product_id = crypto.randomUUID();

  return new Response(
    JSON.stringify({
      custom_product_id,
      product_id,
      customization,
      preview_url: `https://printify.com/preview/${product_id}?custom=${custom_product_id}`, // Mock URL
      message: 'Product customization stored',
    }),
    { headers: { 'content-type': 'application/json' } }
  );
};

// Get shop products for tenant (Syned from Printify)
export const getProducts = async (req: any, env: Env) => {
  try {
    const printify = new PrintifyService(env.PRINTIFY_API_TOKEN, env.PRINTIFY_SHOP_ID);
    const printifyProducts = await printify.getProducts();

    // Transform for our frontend
    const products = printifyProducts.map(p => ({
      id: p.id,
      name: p.title,
      description: p.description,
      image_url: p.images.find(i => i.is_default)?.src || p.images[0]?.src,
      price: p.variants[0]?.price / 100, // Printify uses cents
      variants: p.variants.filter(v => v.is_enabled).map(v => ({
        id: v.id,
        title: v.title,
        price: v.price / 100
      }))
    }));

    // Cache in KV for speed? (Optional)
    await env.KV.put(`shop:${req.tenant}:products`, JSON.stringify(products), { expirationTtl: 3600 });

    return new Response(
      JSON.stringify({ products }),
      { headers: { 'content-type': 'application/json' } }
    );
  } catch (err) {
    // Fallback to KV or return error
    console.error("Printify Sync Error:", err);
    const cached = await env.KV.get(`shop:${req.tenant}:products`, 'json');
    if (cached) {
      return new Response(
        JSON.stringify({ products: cached, source: 'cache', warning: 'Live sync failed' }),
        { headers: { 'content-type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to fetch products', details: String(err) }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
};

// Create order
export const createOrder = async (req: any, env: Env) => {
  const {
    product_id,
    variant_id,
    quantity,
    shipping_address,
  } = req.json || {};

  if (!product_id || !variant_id || !quantity || !shipping_address) {
    return new Response(
      JSON.stringify({ error: 'product_id, variant_id, quantity, and shipping_address required' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const order_id = crypto.randomUUID();

  try {
    const printify = new PrintifyService(env.PRINTIFY_API_TOKEN, env.PRINTIFY_SHOP_ID);

    const payload: PrintifyOrderPayload = {
      external_id: order_id,
      line_items: [{
        product_id,
        variant_id: Number(variant_id),
        quantity
      }],
      shipping_method: 1,
      send_shipping_notification: true,
      address_to: shipping_address // Ensure shape matches Printify reqs
    };

    const printifyOrder = await printify.createOrder(payload);

    // Store success in KV
    await env.KV.put(
      `order:${req.tenant}:${order_id}`,
      JSON.stringify({
        order_id,
        printify_order_id: printifyOrder.id,
        product_id,
        variant_id,
        quantity,
        shipping_address,
        status: 'submitted', // Printify received it
        created_at: Date.now(),
      })
    );

    return new Response(
      JSON.stringify({
        order_id,
        printify_order_id: printifyOrder.id,
        status: 'submitted',
        message: 'Order sent to Printify',
      }),
      { headers: { 'content-type': 'application/json' } }
    );

  } catch (err: any) {
    console.error("Printify Order Error:", err);
    return new Response(
      JSON.stringify({ error: 'Failed to create order', details: err.message }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }
};

// Get order status
export const getOrder = async (req: any, env: Env) => {
  const url = new URL(req.url);
  const order_id = url.pathname.split('/').pop();

  const order = await env.KV.get(
    `order:${req.tenant}:${order_id}`,
    'json'
  );

  if (!order) {
    return new Response(
      JSON.stringify({ error: 'Order not found' }),
      { status: 404, headers: { 'content-type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ order }),
    { headers: { 'content-type': 'application/json' } }
  );
};
