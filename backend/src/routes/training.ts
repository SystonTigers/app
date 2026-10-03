import { json } from "../services/util";
import { requireJWT } from "../services/auth";

export async function handleAddDrillToSession(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        // SECURITY: Verify session belongs to tenant
        const session = await env.DB.prepare(
            `SELECT id FROM training_plans WHERE id = ? AND tenant_id = ?`
        ).bind(body.sessionId, claims.tenantId).first();

        if (!session) {
            return json({ success: false, error: "Session not found" }, 404, corsHdrs);
        }

        // SECURITY: Verify drill belongs to tenant
        const drill = await env.DB.prepare(
            `SELECT id FROM training_drills WHERE id = ? AND tenant_id = ?`
        ).bind(body.drillId, claims.tenantId).first();

        if (!drill) {
            return json({ success: false, error: "Drill not found" }, 404, corsHdrs);
        }

        // Check max order index
        const orderRes = await env.DB.prepare(
            `SELECT MAX(order_index) as max_idx FROM training_plan_drills WHERE plan_id = ?`
        ).bind(body.sessionId).first();

        const nextIdx = (orderRes?.max_idx as number || 0) + 1;
        await env.DB.prepare(
            `INSERT INTO training_plan_drills (plan_id, drill_id, order_index)
             VALUES (?, ?, ?)`
        ).bind(
            body.sessionId, // plan_id
            body.drillId,
            nextIdx
        ).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        console.error("Add drill to session error:", err);
        return json({ success: false, error: "Failed to add drill to session" }, 500, corsHdrs);
    }
}

// SECURITY: Validates session belongs to tenant
export async function handleGetSessionDrills(req: Request, env: any, corsHdrs: Headers, sessionId: string) {
    try {
        const claims = await requireJWT(req, env);

        // SECURITY: Verify session belongs to tenant before returning drills
        const session = await env.DB.prepare(
            `SELECT id FROM training_plans WHERE id = ? AND tenant_id = ?`
        ).bind(sessionId, claims.tenantId).first();

        if (!session) {
            return json({ success: false, error: "Session not found" }, 404, corsHdrs);
        }

        // Join training_plan_drills with training_drills
        const result = await env.DB.prepare(
            `SELECT pd.order_index, d.*
             FROM training_plan_drills pd
             JOIN training_drills d ON pd.drill_id = d.id AND d.tenant_id = ?
             WHERE pd.plan_id = ?
             ORDER BY pd.order_index ASC`
        ).bind(claims.tenantId, sessionId).all();

        const drills = result.results.map((d: any) => ({
            id: d.id,
            name: d.title,
            category: d.category,
            duration: `${d.duration_minutes} min`,
            description: d.description,
            order: d.order_index
        }));

        return json({ success: true, data: drills }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) {throw err;}
        return json({ success: false, error: "Failed to get session drills" }, 500, corsHdrs);
    }
}
