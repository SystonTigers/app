import { json } from "../services/util";
import { requireJWT } from "../services/auth";

export async function handleCreatePost(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;
        const postId = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO social_posts (id, tenant_id, content, platforms, media_urls, scheduled_for, status, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)`
        ).bind(
            postId, claims.tenantId, body.content,
            JSON.stringify(body.platforms || ['twitter', 'facebook', 'instagram']),
            JSON.stringify(body.mediaUrls || []),
            body.scheduledFor || null, claims.userId, Date.now()
        ).run();

        return json({ success: true, id: postId }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: "Failed to create post" }, 500, corsHdrs);
    }
}

export async function handleListPosts(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            `SELECT * FROM social_posts WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50`
        ).bind(claims.tenantId).all();

        const posts = result.results.map((post: any) => ({
            ...post,
            platforms: JSON.parse(post.platforms || '[]'),
            media_urls: JSON.parse(post.media_urls || '[]'),
        }));

        return json({ success: true, data: posts }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: "Failed to list posts" }, 500, corsHdrs);
    }
}

export async function handleDeletePost(req: Request, env: any, corsHdrs: Headers, postId: string) {
    try {
        const claims = await requireJWT(req, env);

        await env.DB.prepare(
            `DELETE FROM social_posts WHERE id = ? AND tenant_id = ?`
        ).bind(postId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: "Failed to delete post" }, 500, corsHdrs);
    }
}

export async function handleUpdateSocialConfig(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        // Store social media configuration in KV
        const configKey = `tenants:${claims.tenantId}:social:config`;
        await env.KV_IDEMP.put(configKey, JSON.stringify({
            twitter: body.twitter || {},
            facebook: body.facebook || {},
            instagram: body.instagram || {},
            updatedAt: Date.now(),
        }));

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: "Failed to update config" }, 500, corsHdrs);
    }
}

export async function handleGetSocialConfig(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const configKey = `tenants:${claims.tenantId}:social:config`;
        const config = await env.KV_IDEMP.get(configKey, "json") as any;

        return json({
            success: true,
            data: config || {
                twitter: {},
                facebook: {},
                instagram: {},
            }
        }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: "Failed to get config" }, 500, corsHdrs);
    }
}
