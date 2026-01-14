
import { json } from "../../services/util";
import { createCart, getCart, addToCart, removeFromCart } from "../../services/cart";

export async function handleCreateCart(req: Request, env: any, corsHdrs: Headers) {
    try {
        const body = await req.json() as { tenantId: string };
        const { tenantId } = body;

        if (!tenantId) {
            return json({ success: false, error: 'tenantId required' }, 400, corsHdrs);
        }

        const cart = await createCart(tenantId, env);
        return json({ success: true, cart }, 200, corsHdrs);
    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

export async function handleGetCart(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        // Extract cart ID from path pattern /api/v1/shop/cart/:id
        const pathParts = url.pathname.split('/');
        const cartId = pathParts[pathParts.length - 1]; // Assuming ID is last segment

        const cart = await getCart(cartId, env);

        if (!cart) {
            return json({ success: false, error: 'Cart not found or expired' }, 404, corsHdrs);
        }

        return json({ success: true, cart }, 200, corsHdrs);
    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

export async function handleAddToCart(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        // Extract cart ID from path pattern /api/v1/shop/cart/:id/items
        const pathParts = url.pathname.split('/');
        // path is .../cart/ID/items -> ID is index - 2
        const cartId = pathParts[pathParts.length - 2];

        const body = await req.json() as { variantId: string; quantity: number, personalization?: any };
        const { variantId, quantity, personalization } = body;

        if (!variantId || !quantity || quantity < 1) {
            return json({ success: false, error: 'Invalid request' }, 400, corsHdrs);
        }

        const cart = await addToCart(cartId, variantId, quantity, env, personalization);
        return json({ success: true, cart }, 200, corsHdrs);
    } catch (err: any) {
        return json({ success: false, error: err.message }, 400, corsHdrs);
    }
}

export async function handleRemoveFromCart(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        // Extract cart ID from path pattern /api/v1/shop/cart/:id/items
        const pathParts = url.pathname.split('/');
        const cartId = pathParts[pathParts.length - 2];

        const body = await req.json() as { variantId: string };
        const { variantId } = body;

        // Allow variantId in body or query param? RESTful DELETE usually doesn't have body.
        // Let's support body for now as it's easier, or check query param if body fails.
        // In React Native `fetch` with DELETE can have body.

        if (!variantId) {
            return json({ success: false, error: 'variantId required' }, 400, corsHdrs);
        }

        const cart = await removeFromCart(cartId, variantId, env);
        return json({ success: true, cart }, 200, corsHdrs);
    } catch (err: any) {
        return json({ success: false, error: err.message }, 400, corsHdrs);
    }
}
