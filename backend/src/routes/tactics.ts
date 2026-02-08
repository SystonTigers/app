
import { json } from "../services/util";
import { requireJWT } from "../services/auth";
import { z } from "zod";
import { parse } from "../lib/validate";

import { rateLimitWithTenant } from "../middleware/rateLimit";

const TacticsSchema = z.object({
    formation: z.string(),
    playingStyle: z.string(),
    pressingIntensity: z.enum(['low', 'medium', 'high']),
    buildUpPlay: z.enum(['short', 'mixed', 'direct']),
    defensiveLine: z.enum(['deep', 'medium', 'high']),
    width: z.enum(['narrow', 'normal', 'wide']).optional(),
    setPlayFocus: z.array(z.string()).optional(),
    phases: z.object({
        attacking: z.any().optional(),
        defensive: z.any().optional(),
    }).optional(),
});

export async function handleSaveTactics(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const rateLimitResult = await rateLimitWithTenant(req, env, claims, {
            scope: "tactics",
            limit: 20, // 20 updates per minute per tenant
        });
        if (!rateLimitResult.ok) {
            return json({ success: false, error: rateLimitResult.error || "Rate limit exceeded" }, 429, corsHdrs);
        }

        const body = await req.json();
        const tactics = parse(TacticsSchema, body);

        await env.DB.prepare(
            `INSERT INTO team_tactics (tenant_id, formation, config, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(tenant_id) DO UPDATE SET
             formation = excluded.formation,
             config = excluded.config,
             updated_at = excluded.updated_at`
        ).bind(
            claims.tenantId,
            tactics.formation,
            JSON.stringify(tactics),
            Date.now()
        ).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: "Failed to save tactics" }, 500, corsHdrs);
    }
}

export async function handleGetTactics(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            `SELECT * FROM team_tactics WHERE tenant_id = ?`
        ).bind(claims.tenantId).first();

        if (!result) {
            return json({ success: true, data: null }, 200, corsHdrs);
        }

        return json({ success: true, data: JSON.parse(result.config as string) }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: "Failed to get tactics" }, 500, corsHdrs);
    }
}
