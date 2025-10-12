import type { Env } from '../env';

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

  // TODO: Call Printify API to create customized product
  // For now, return mock response

  const custom_product_id = crypto.randomUUID();

  return new Response(
    JSON.stringify({
      custom_product_id,
      product_id,
      customization,
      preview_url: `https://printify.com/preview/${custom_product_id}`,
      message: 'Product customization pending (stub)',
    }),
    { headers: { 'content-type': 'application/json' } }
  );
};

// Get shop products for tenant
export const getProducts = async (req: any, env: Env) => {
  const products = await env.KV.get(
    `shop:${req.tenant}:products`,
    'json'
  );

  return new Response(
    JSON.stringify({
      products: products || [],
    }),
    { headers: { 'content-type': 'application/json' } }
  );
};

// Create order
export const createOrder = async (req: any, env: Env) => {
  const {
    product_id,
    variant_id,
    quantity,
    shipping_address,
  } = req.json || {};

  if (!product_id || !variant_id || !quantity) {
    return new Response(
      JSON.stringify({ error: 'product_id, variant_id, and quantity required' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  // TODO: Create order via Printify API

  const order_id = crypto.randomUUID();

  // Store order in KV
  await env.KV.put(
    `order:${req.tenant}:${order_id}`,
    JSON.stringify({
      order_id,
      product_id,
      variant_id,
      quantity,
      shipping_address,
      status: 'pending',
      created_at: Date.now(),
    })
  );

  return new Response(
    JSON.stringify({
      order_id,
      status: 'pending',
      message: 'Order created (stub)',
    }),
    { headers: { 'content-type': 'application/json' } }
  );
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
