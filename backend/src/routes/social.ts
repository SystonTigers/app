import { json } from "../services/util";
import { requireJWT } from "../services/auth";
import {
    createSocialAgent,
    canPost,
    incrementUsage,
    SOCIAL_LIMITS,
    type TenantSocialConfig,
    type SocialPost,
} from "../services/socialAgent";

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
        if (err instanceof Response) throw err;
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
        if (err instanceof Response) throw err;
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
        if (err instanceof Response) throw err;
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
        if (err instanceof Response) throw err;
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
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to get config" }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/social/usage
 * Get current usage stats for AI social posting
 */
export async function handleGetSocialUsage(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        // Get tenant plan from KV
        const tenantKey = `tenant:${tenantId}`;
        const tenantData = await env.KV.get(tenantKey);
        const tenant = tenantData ? JSON.parse(tenantData) : null;
        const plan = tenant?.plan || 'starter';

        // Get usage
        const today = new Date().toISOString().split('T')[0];
        const month = new Date().toISOString().slice(0, 7);

        const dailyKey = `social-usage:${tenantId}:daily:${today}`;
        const monthlyKey = `social-usage:${tenantId}:monthly:${month}`;

        const dailyUsageStr = await env.KV.get(dailyKey);
        const monthlyUsageStr = await env.KV.get(monthlyKey);

        const dailyUsage = dailyUsageStr ? parseInt(dailyUsageStr) : 0;
        const monthlyUsage = monthlyUsageStr ? parseInt(monthlyUsageStr) : 0;

        const limits = SOCIAL_LIMITS[plan] || SOCIAL_LIMITS.starter;

        return json({
            success: true,
            usage: {
                daily: dailyUsage,
                monthly: monthlyUsage,
            },
            limits: {
                daily: limits.daily,
                monthly: limits.monthly,
            },
            plan,
        }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to get usage" }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/social/post-with-ai
 * Post content to social media platforms via AI agent (Gemini)
 */
export async function handlePostWithAI(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;
        const body = await req.json() as any;

        if (!body.content || !body.platforms || body.platforms.length === 0) {
            return json({ success: false, error: 'Content and platforms required' }, 400, corsHdrs);
        }

        // Get tenant plan
        const tenantKey = `tenant:${tenantId}`;
        const tenantData = await env.KV.get(tenantKey);
        const tenant = tenantData ? JSON.parse(tenantData) : null;
        const plan = tenant?.plan || 'starter';

        // Check usage limits
        const usageCheck = await canPost(tenantId, plan, env);
        if (!usageCheck.allowed) {
            return json({
                success: false,
                error: usageCheck.reason,
                usage: usageCheck.usage,
                upgrade: plan === 'starter' ? 'pro' : 'enterprise',
            }, 429, corsHdrs);
        }

        // Get social config
        const configKey = `social-config:${tenantId}`;
        const configData = await env.KV.get(configKey);
        const socialConfig: TenantSocialConfig = configData
            ? JSON.parse(configData)
            : {
                twitter: { enabled: false },
                instagram: { enabled: false },
                facebook: { enabled: false },
                tiktok: { enabled: false },
            };

        // Filter platforms to only enabled ones
        const enabledPlatforms = body.platforms.filter((p: string) => {
            const platform = p as keyof TenantSocialConfig;
            return socialConfig[platform]?.enabled === true;
        });

        if (enabledPlatforms.length === 0) {
            return json({
                success: false,
                error: 'No enabled platforms selected',
            }, 400, corsHdrs);
        }

        // Create AI agent and format post
        const agent = createSocialAgent(env.GEMINI_API_KEY);
        const socialPost: SocialPost = {
            content: body.content,
            media: body.media,
            platforms: enabledPlatforms,
        };

        const formattedContent = await agent.formatPost(socialPost);

        // Post to platforms
        const results = await agent.postToPlatforms(formattedContent, body.media, socialConfig);

        // Increment usage counter
        await incrementUsage(tenantId, env);

        // Get updated usage
        const newUsage = {
            daily: (usageCheck.usage?.daily || 0) + 1,
            monthly: (usageCheck.usage?.monthly || 0) + 1,
        };

        return json({
            success: true,
            results,
            usage: newUsage,
        }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Post with AI error:', err);
        if (err instanceof Response) throw err;
        return json({ success: false, error: err.message || "Failed to post" }, 500, corsHdrs);
    }
}
