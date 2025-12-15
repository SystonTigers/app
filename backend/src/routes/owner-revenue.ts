/**
 * Owner Revenue Routes
 * Platform-wide revenue tracking and reporting
 */

import { json } from '../services/util';

/**
 * GET /owner-api/revenue/summary
 * Get revenue summary for the platform
 */
export async function handleGetRevenueSummary(req: Request, env: any) {
    try {
        // Verify owner auth (simple API key check)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== env.OWNER_API_KEY) {
            return json({ success: false, error: { message: 'Unauthorized' } }, 401);
        }

        const url = new URL(req.url);
        const period = url.searchParams.get('period') || 'month';  // 'day', 'week', 'month', 'year'

        // Calculate date range
        const now = Math.floor(Date.now() / 1000);
        let startTime = now;
        switch (period) {
            case 'day': startTime = now - 86400; break;
            case 'week': startTime = now - 604800; break;
            case 'month': startTime = now - 2592000; break;
            case 'year': startTime = now - 31536000; break;
        }

        // Get revenue breakdown by type
        const { results: revenueByType } = await env.DB.prepare(`
            SELECT revenue_type, SUM(amount_gbp) as total
            FROM platform_revenue
            WHERE created_at >= ?
            GROUP BY revenue_type
        `).bind(startTime).all();

        // Get total active subscriptions
        const { count: activeSubscriptions } = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM tenants WHERE status = ?'
        ).bind('active').first() as { count: number };

        // Get recent revenue
        const { results: recentRevenue } = await env.DB.prepare(`
            SELECT * FROM platform_revenue
            ORDER BY created_at DESC
            LIMIT 50
        `).all();

        // Get top earning tenants
        const { results: topTenants } = await env.DB.prepare(`
            SELECT t.name, t.slug, SUM(pr.amount_gbp) as total_revenue
            FROM platform_revenue pr
            JOIN tenants t ON pr.tenant_id = t.id
            WHERE pr.created_at >= ?
            GROUP BY pr.tenant_id
            ORDER BY total_revenue DESC
            LIMIT 10
        `).bind(startTime).all();

        // Calculate totals
        const breakdown: Record<string, number> = {};
        let totalRevenue = 0;
        for (const row of (revenueByType || [])) {
            const r = row as any;
            breakdown[r.revenue_type] = r.total / 100;
            totalRevenue += r.total;
        }

        return json({
            success: true,
            data: {
                period,
                totalRevenue: totalRevenue / 100,
                breakdown: {
                    subscriptions: breakdown.subscription || 0,
                    duesFees: breakdown.dues_fee || 0,
                    shopCommission: breakdown.shop_commission || 0,
                    printifyMargin: breakdown.printify_margin || 0,
                },
                activeSubscriptions,
                topTenants: (topTenants || []).map((t: any) => ({
                    name: t.name,
                    slug: t.slug,
                    revenue: t.total_revenue / 100,
                })),
                recentTransactions: (recentRevenue || []).slice(0, 20).map((r: any) => ({
                    id: r.id,
                    type: r.revenue_type,
                    amount: r.amount_gbp / 100,
                    description: r.description,
                    createdAt: r.created_at,
                })),
            }
        }, 200);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500);
    }
}

/**
 * GET /owner-api/revenue/by-tenant
 * Get revenue breakdown by tenant
 */
export async function handleGetRevenueByTenant(req: Request, env: any) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== env.OWNER_API_KEY) {
            return json({ success: false, error: { message: 'Unauthorized' } }, 401);
        }

        const { results: tenantRevenue } = await env.DB.prepare(`
            SELECT 
                t.id,
                t.name,
                t.slug,
                t.plan,
                t.status,
                COALESCE(SUM(CASE WHEN pr.revenue_type = 'subscription' THEN pr.amount_gbp END), 0) as subscription_revenue,
                COALESCE(SUM(CASE WHEN pr.revenue_type = 'dues_fee' THEN pr.amount_gbp END), 0) as dues_revenue,
                COALESCE(SUM(CASE WHEN pr.revenue_type = 'shop_commission' THEN pr.amount_gbp END), 0) as shop_revenue,
                COALESCE(SUM(pr.amount_gbp), 0) as total_revenue
            FROM tenants t
            LEFT JOIN platform_revenue pr ON t.id = pr.tenant_id
            GROUP BY t.id
            ORDER BY total_revenue DESC
        `).all();

        return json({
            success: true,
            data: (tenantRevenue || []).map((t: any) => ({
                id: t.id,
                name: t.name,
                slug: t.slug,
                plan: t.plan,
                status: t.status,
                revenue: {
                    subscriptions: t.subscription_revenue / 100,
                    dues: t.dues_revenue / 100,
                    shop: t.shop_revenue / 100,
                    total: t.total_revenue / 100,
                }
            }))
        }, 200);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500);
    }
}

/**
 * GET /owner-api/revenue/projections
 * Get revenue projections based on MRR
 */
export async function handleGetRevenueProjections(req: Request, env: any) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== env.OWNER_API_KEY) {
            return json({ success: false, error: { message: 'Unauthorized' } }, 401);
        }

        // Count active subscriptions by plan
        const { results: planCounts } = await env.DB.prepare(`
            SELECT plan, COUNT(*) as count
            FROM tenants
            WHERE status = 'active' AND subscription_status IN ('active', 'trialing')
            GROUP BY plan
        `).all();

        // Plan pricing
        const planPrices: Record<string, number> = {
            essentials: 5.99,
            team: 12.99,
            club: 39.99,
            club_pro: 79.99,
        };

        let monthlyRecurring = 0;
        const breakdown: Record<string, { count: number; mrr: number }> = {};

        for (const row of (planCounts || [])) {
            const r = row as any;
            const price = planPrices[r.plan] || 0;
            const mrr = price * r.count;
            breakdown[r.plan] = { count: r.count, mrr };
            monthlyRecurring += mrr;
        }

        return json({
            success: true,
            data: {
                mrr: monthlyRecurring,
                arr: monthlyRecurring * 12,
                byPlan: breakdown,
                projections: {
                    month1: monthlyRecurring,
                    month3: monthlyRecurring * 3,
                    month6: monthlyRecurring * 6,
                    month12: monthlyRecurring * 12,
                }
            }
        }, 200);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500);
    }
}
