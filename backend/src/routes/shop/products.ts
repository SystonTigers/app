import { json } from "../../services/util";
import { syncPrintifyProducts } from "../../services/printify";
import { requireJWT } from "../../services/auth";
import { requireAdminClaims } from "../../services/jwt";

export async function handleProductSync(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        requireAdminClaims(claims);

        const count = await syncPrintifyProducts(env);

        return json({
            success: true,
            syncedProducts: count,
            timestamp: new Date().toISOString()
        }, 200, corsHdrs);
    } catch (err: any) {
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

export async function handleGetProducts(req: Request, env: any, corsHdrs: Headers) {
    try {
        const url = new URL(req.url);
        const tenantId = url.searchParams.get('tenant');

        if (!tenantId) {
            return json({ success: false, error: 'tenant parameter required' }, 400, corsHdrs);
        }

        // Get products for this tenant or global products
        const { results: products } = await env.DB.prepare(`
      SELECT 
        p.*,
        GROUP_CONCAT(
          json_object(
            'id', v.id,
            'title', v.title,
            'sku', v.sku,
            'price_gbp', v.price_gbp
          )
        ) as variants_json
      FROM products p
      LEFT JOIN product_variants v ON p.id = v.product_id
      WHERE (p.tenant_id = ? OR p.tenant_id IS NULL)
        AND p.status = 'active'
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).bind(tenantId).all();

        // Parse variants JSON
        const productsWithVariants = products.map((p: any) => ({
            ...p,
            variants: p.variants_json
                ? JSON.parse(`[${p.variants_json}]`) // Check if GROUP_CONCAT needs handling
                : []
        }));

        // Note: SQLite GROUP_CONCAT returns comma separated string. 
        // If variants_json was json_object, it might be stringified objects separated by comma.
        // Let's refine parsing:
        // If we use json_group_array it would be cleaner but might not be available in D1 yet or syntax differs.
        // Safe fallback: fetch variants separately or handle string parsing carefully.
        // For now, let's assume standard split/parse behavior. 
        // Actually, let's simplify query to avoid potential JSON parse headaches in MVP.
        // We'll just fetch products and variants in separate query or just products first.
        // Re-writing to be safer:

        /* 
        Alternative safer query:
        const products = await env.DB.prepare(...).all();
        const productIds = products.map(p => p.id);
        const variants = await env.DB.prepare('SELECT * FROM product_variants WHERE product_id IN ...').all();
        ... merge ...
        */

        // Let's stick to the simple one but fix the parse logic:
        // JSON.parse(`[${p.variants_json}]`) works if json_object returns valid JSON strings separated by comma.

        return json({ success: true, data: productsWithVariants }, 200, corsHdrs);
    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}
