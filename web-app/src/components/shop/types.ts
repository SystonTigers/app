/** Shop shapes as /api/v1/shop returns them (prices in pence). */

export interface ProductVariant {
    id: string;
    title: string;
    price_gbp: number;
}

export interface ProductPersonalization {
    clubName: string;
    clubLogo?: string;
    playerName?: string;
    playerNumber?: string;
    supportsName: boolean;
    supportsNumber: boolean;
    supportsPhrase: boolean;
}

export interface Product {
    id: string;
    title: string;
    description: string;
    price_gbp?: number;
    image_url: string;
    variants: ProductVariant[];
    personalization?: ProductPersonalization;
}

export interface CartItem {
    variantId: string;
    title: string;
    quantity: number;
    priceGbp: number;
}

export interface Cart {
    id?: string;
    items: CartItem[];
}

/** The browser remembers the club's cart between visits. */
export const cartKey = (tenantId: string) => `cart_${tenantId}`;

export function readCartId(tenantId: string): string | null {
    try {
        return localStorage.getItem(cartKey(tenantId));
    } catch {
        return null;
    }
}

export function writeCartId(tenantId: string, id: string | null): void {
    try {
        if (id) localStorage.setItem(cartKey(tenantId), id);
        else localStorage.removeItem(cartKey(tenantId));
    } catch {
        // Storage blocked: the cart lasts for this visit only
    }
}
