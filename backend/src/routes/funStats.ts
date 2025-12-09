import { json } from "../services/util";
import { requireJWT } from "../services/auth";
import { computeFunStats, cacheFunStats, getCachedFunStats } from "../services/funStats";

// GET /api/v1/stats/fun - Get fun stats (with optional season filter)
export async function handleGetFunStats(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const seasonId = url.searchParams.get('seasonId');

        // Try to get cached stats first
        let stats = await getCachedFunStats(env.DB, claims.tenantId || '', seasonId ?? null);

        // If no cache or cache is old (> 1 hour), recompute
        if (stats.length === 0) {
            stats = await computeFunStats(env.DB, claims.tenantId || '', seasonId ?? null);
            await cacheFunStats(env.DB, claims.tenantId || '', seasonId ?? null, stats);
        }

        return json({ success: true, data: stats }, 200, corsHdrs);
    } catch (err) {
        console.error('Get fun stats error:', err);
        return json({ success: false, error: "Failed to get fun stats" }, 500, corsHdrs);
    }
}

// POST /api/v1/stats/fun/compute - Force recomputation of fun stats (admin only)
export async function handleComputeFunStats(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { seasonId?: string };

        const stats = await computeFunStats(env.DB, claims.tenantId || '', body.seasonId ?? null);
        await cacheFunStats(env.DB, claims.tenantId || '', body.seasonId ?? null, stats);

        return json({ success: true, data: stats, message: "Fun stats computed and cached" }, 200, corsHdrs);
    } catch (err) {
        console.error('Compute fun stats error:', err);
        return json({ success: false, error: "Failed to compute fun stats" }, 500, corsHdrs);
    }
}
