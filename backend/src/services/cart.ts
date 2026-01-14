
export interface CartItem {
    variantId: string;
    productId: string;
    quantity: number;
    priceGbp: number; // Cached at time of add
    title: string;
    personalization?: {
        name?: string;
        number?: string;
        clubLogo?: string;
    };
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
    env: any,
    personalization?: any
): Promise<Cart> {
    const cart = await getCart(cartId, env);
    if (!cart) {
        throw new Error('Cart not found or expired');
    }

    let foundVariant: any = null;
    let productTitle = '';
    let productId = '';
    let price = 0;

    // 1. Try Legacy/Synced Product Variants first
    const legacyVariant = await env.DB.prepare(`
    SELECT v.*, p.title as product_title, p.id as product_id
    FROM product_variants v
    JOIN products p ON v.product_id = p.id
    WHERE v.id = ?
  `).bind(variantId).first();

    if (legacyVariant) {
        foundVariant = legacyVariant;
        productTitle = `${legacyVariant.product_title} - ${legacyVariant.title}`;
        productId = legacyVariant.product_id;
        price = legacyVariant.price_gbp;
    } else {
        // 2. Try Printify Templates
        // variantId format: v_{template_id}_{printify_variant_id}
        // e.g. v_pt_12345_98765
        const parts = variantId.split('_');
        if (parts[0] === 'v' && parts[1] === 'pt') {
            // Reconstruct template ID: pt_... (might contain underscores so careful)
            // Actually template ID is pt_{timestamp}_{random}
            // So parts: v, pt, timestamp, random, printifyVarId
            // This is brittle. Better to scan all templates? No, slow.
            // Start from index 1.
            // ID is unique.
            // Let's assume we can find the template by querying templates where variants_json LIKE %variantId%? No.

            // Let's rely on the ID format we just generated in personalized-shop.ts: `v_${t.id}_${v.id}`
            // t.id is like `pt_...`
            // So `v_pt_123_456`.
            // The last segment is the printify variant ID.
            // Everything between `v_` and the last `_` is the template ID.
            const printifyVarId = parts.pop();
            const templateId = parts.slice(1).join('_'); // Rejoin the middle

            const template = await env.DB.prepare(`
                SELECT * FROM printify_templates WHERE id = ?
            `).bind(templateId).first();

            if (template && template.variants_json) {
                const variants = JSON.parse(template.variants_json);
                const v = variants.find((x: any) => x.id.toString() === printifyVarId);
                if (v) {
                    foundVariant = v;
                    productTitle = `${template.name} - ${v.title || 'Standard'}`;
                    productId = template.id;
                    price = v.price; // cents = pence
                }
            }
        }
    }

    if (!foundVariant) {
        throw new Error('Variant not found');
    }

    // Check if item already in cart
    // We treat personalized items as unique items if personalization differs?
    // For now, simple check on variantId.
    // Ideally if personalization differs, we shouldn't merge.

    // Create a key for uniqueness: variantId + JSON.stringify(personalization)
    const existingIndex = cart.items.findIndex(item =>
        item.variantId === variantId &&
        JSON.stringify(item.personalization) === JSON.stringify(personalization)
    );

    if (existingIndex >= 0) {
        cart.items[existingIndex].quantity += quantity;
    } else {
        cart.items.push({
            variantId,
            productId,
            quantity,
            priceGbp: price,
            title: productTitle,
            personalization
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

    // This removes ALL items with that variant ID, regardless of personalization.
    // For MVP this is acceptable but ideally should remove specific index/ID.
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
