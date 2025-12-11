
interface PrintifyProduct {
    id: string;
    title: string;
    description: string;
    images: Array<{ src: string; position: number; is_default?: boolean }>;
    variants: Array<{
        id: number;
        title: string;
        price: number; // In cents
        sku: string;
        is_enabled?: boolean;
    }>;
}

export interface PrintifyOrderPayload {
    external_id: string;
    line_items: Array<{
        product_id: string;
        variant_id: number;
        quantity: number;
    }>;
    shipping_method: number;
    send_shipping_notification: boolean;
    address_to: any;
}

export class PrintifyService {
    constructor(
        private apiKey: string,
        private shopId: string
    ) { }

    async getProducts(): Promise<PrintifyProduct[]> {
        const response = await fetch(
            `https://api.printify.com/v1/shops/${this.shopId}/products.json`,
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'User-Agent': 'SystonTigers/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Printify API error: ${response.status}`);
        }

        const json = await response.json() as any;
        return json.data;
    }

    async createOrder(payload: PrintifyOrderPayload): Promise<{ id: string }> {
        const response = await fetch(
            `https://api.printify.com/v1/shops/${this.shopId}/orders.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Printify order creation failed: ${error}`);
        }

        return response.json() as Promise<{ id: string }>;
    }
}

export async function syncPrintifyProducts(env: any): Promise<number> {
    const printify = new PrintifyService(
        env.PRINTIFY_API_KEY,
        env.PRINTIFY_SHOP_ID
    );

    const products = await printify.getProducts();
    let syncedCount = 0;

    for (const product of products) {
        const productId = `product_${product.id}`;
        const timestamp = Date.now();
        const slug = slugify(product.title);

        // Insert or update product
        await env.DB.prepare(`
      INSERT INTO products (id, title, description, handle, image_url, printify_id, vendor, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'printify', 'active', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        image_url = excluded.image_url,
        updated_at = excluded.updated_at
    `).bind(
            productId,
            product.title,
            product.description,
            slug,
            product.images[0]?.src || null,
            product.id,
            timestamp,
            timestamp
        ).run();

        // Sync variants
        for (const variant of product.variants) {
            const variantId = `variant_${product.id}_${variant.id}`;

            await env.DB.prepare(`
        INSERT INTO product_variants (id, product_id, title, sku, price_gbp, printify_variant_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          price_gbp = excluded.price_gbp
      `).bind(
                variantId,
                productId,
                variant.title,
                variant.sku,
                variant.price, // Already in pence from Printify
                variant.id.toString(),
                timestamp
            ).run();
        }

        syncedCount++;
    }

    return syncedCount;
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
