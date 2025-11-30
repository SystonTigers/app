import { json } from "../services/util";
import { requireJWT } from "../services/auth";

export async function handleCreateProduct(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;
        const productId = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO products (id, tenant_id, name, description, price, category, sizes, colors, in_stock, printify_id, image_url, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            productId, claims.tenantId, body.name, body.description, body.price,
            body.category, JSON.stringify(body.sizes || []), JSON.stringify(body.colors || []),
            body.inStock !== false ? 1 : 0, body.printifyId || null, body.imageUrl, Date.now()
        ).run();

        return json({ success: true, id: productId }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to create product" }, 500, corsHdrs);
    }
}

export async function handleListProducts(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const category = url.searchParams.get('category');

        let query = `SELECT * FROM products WHERE tenant_id = ?`;
        const params = [claims.tenantId];

        if (category && category !== 'all') {
            query += ` AND category = ?`;
            params.push(category);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await env.DB.prepare(query).bind(...params).all();

        // Parse JSON fields
        const products = result.results.map((product: any) => ({
            ...product,
            sizes: JSON.parse(product.sizes || '[]'),
            colors: JSON.parse(product.colors || '[]'),
            in_stock: Boolean(product.in_stock),
        }));

        return json({ success: true, data: products }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to list products" }, 500, corsHdrs);
    }
}

export async function handleGetProduct(req: Request, env: any, corsHdrs: Headers, productId: string) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            `SELECT * FROM products WHERE id = ? AND tenant_id = ?`
        ).bind(productId, claims.tenantId).first();

        if (!result) {
            return json({ success: false, error: "Product not found" }, 404, corsHdrs);
        }

        return json({
            success: true,
            data: {
                ...result,
                sizes: JSON.parse(result.sizes || '[]'),
                colors: JSON.parse(result.colors || '[]'),
                in_stock: Boolean(result.in_stock),
            }
        }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to get product" }, 500, corsHdrs);
    }
}

export async function handleUpdateProduct(req: Request, env: any, corsHdrs: Headers, productId: string) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        await env.DB.prepare(
            `UPDATE products SET
             name = ?, description = ?, price = ?, category = ?,
             sizes = ?, colors = ?, in_stock = ?, image_url = ?
             WHERE id = ? AND tenant_id = ?`
        ).bind(
            body.name, body.description, body.price, body.category,
            JSON.stringify(body.sizes || []), JSON.stringify(body.colors || []),
            body.inStock !== false ? 1 : 0, body.imageUrl,
            productId, claims.tenantId
        ).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to update product" }, 500, corsHdrs);
    }
}

export async function handleDeleteProduct(req: Request, env: any, corsHdrs: Headers, productId: string) {
    try {
        const claims = await requireJWT(req, env);

        await env.DB.prepare(
            `DELETE FROM products WHERE id = ? AND tenant_id = ?`
        ).bind(productId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to delete product" }, 500, corsHdrs);
    }
}

// Printify integration placeholder
export async function handlePrintifySync(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        // This would integrate with Printify API
        // For now, return success with placeholder
        return json({
            success: true,
            message: "Printify sync not yet implemented. Configure Printify API keys in environment."
        }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to sync with Printify" }, 500, corsHdrs);
    }
}

// Public route for shop (no auth required)
export async function handlePublicListProducts(req: Request, env: any, corsHdrs: Headers, tenantId: string) {
    try {
        const url = new URL(req.url);
        const category = url.searchParams.get('category');

        let query = `SELECT id, name, description, price, category, image_url, in_stock FROM products WHERE tenant_id = ?`;
        const params = [tenantId];

        if (category && category !== 'all') {
            query += ` AND category = ?`;
            params.push(category);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await env.DB.prepare(query).bind(...params).all();

        const products = result.results.map((product: any) => ({
            ...product,
            in_stock: Boolean(product.in_stock),
        }));

        return json({ success: true, data: products }, 200, corsHdrs);
    } catch (err) {
        return json({ success: false, error: "Failed to list products" }, 500, corsHdrs);
    }
}
