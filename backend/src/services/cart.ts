
export interface CartItem {
    variantId: string;
    productId: string;
    quantity: number;
    priceGbp: number; // Cached at time of add
    title: string;
}

export interface Cart {
    id: string;
    tenantId: string;
    items: CartItem[];
    createdAt: number;
    expiresAt: number;
}

// Generate a random ID for the cart
function generateCartId(): string {
    return `cart_${crypto.randomUUID()}`;
}

export async function createCart(tenantId: string, env: any): Promise<Cart> {
    const cartId = generateCartId();
    const now = Date.now();
    const expiresAt = now + (60 * 60 * 1000); // 1 hour

    const cart: Cart = {
        id: cartId,
        tenantId,
        items: [],
        createdAt: now,
        expiresAt
    };

    await env.KV_CARTS.put(
        cartId,
        JSON.stringify(cart),
        { expirationTtl: 3600 } // 1 hour auto-expire
    );

    return cart;
}

export async function getCart(cartId: string, env: any): Promise<Cart | null> {
    const data = await env.KV_CARTS.get(cartId);
    return data ? JSON.parse(data) : null;
}

export async function addToCart(
    cartId: string,
    variantId: string,
    quantity: number,
    env: any
): Promise<Cart> {
    const cart = await getCart(cartId, env);
    if (!cart) {
        throw new Error('Cart not found or expired');
    }

    // Fetch variant details from D1 to ensure validity and get price
    const variant = await env.DB.prepare(`
    SELECT v.*, p.title as product_title
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    WHERE v.id = ?
  `).bind(variantId).first();

    if (!variant) {
        throw new Error('Variant not found');
    }

    // Check if item already in cart
    const existingIndex = cart.items.findIndex(item => item.variantId === variantId);

    if (existingIndex >= 0) {
        cart.items[existingIndex].quantity += quantity;
    } else {
        cart.items.push({
            variantId: variant.id,
            productId: variant.product_id,
            quantity,
            priceGbp: variant.price_gbp,
            title: `${variant.product_title} - ${variant.title}`
        });
    }

    await env.KV_CARTS.put(
        cartId,
        JSON.stringify(cart),
        { expirationTtl: 3600 }
    );

    return cart;
}

export async function removeFromCart(
    cartId: string,
    variantId: string,
    env: any
): Promise<Cart> {
    const cart = await getCart(cartId, env);
    if (!cart) {
        throw new Error('Cart not found');
    }

    cart.items = cart.items.filter((item: CartItem) => item.variantId !== variantId);

    await env.KV_CARTS.put(
        cartId,
        JSON.stringify(cart),
        { expirationTtl: 3600 }
    );

    return cart;
}

export function calculateCartTotal(cart: Cart): number {
    return cart.items.reduce((sum, item) =>
        sum + (item.priceGbp * item.quantity), 0
    );
}
