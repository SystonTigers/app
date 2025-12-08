import { json } from "../services/util";
import { requireJWT } from "../services/auth";

import { rateLimitWithTenant } from "../middleware/rateLimit";

export async function handleCreateSession(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const rateLimitResult = await rateLimitWithTenant(req, env, claims, {
            scope: "training_session",
            limit: 30, // 30 sessions created per minute (generous)
        });
        if (!rateLimitResult.ok) {
            return json({ success: false, error: rateLimitResult.error || "Rate limit exceeded" }, 429, corsHdrs);
        }

        const body = await req.json() as any;
        const sessionId = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO training_sessions (id, tenant_id, session_date, session_time, team, focus, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'planned', ?)`
        ).bind(
            sessionId, claims.tenantId, body.date, body.time, body.team, body.focus, Date.now()
        ).run();

        return json({ success: true, id: sessionId }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to create session" }, 500, corsHdrs);
    }
}

export async function handleListSessions(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            `SELECT * FROM training_sessions WHERE tenant_id = ? ORDER BY session_date DESC`
        ).bind(claims.tenantId).all();

        return json({ success: true, data: result.results }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to list sessions" }, 500, corsHdrs);
    }
}

export async function handleDeleteSession(req: Request, env: any, corsHdrs: Headers, sessionId: string) {
    try {
        const claims = await requireJWT(req, env);

        await env.DB.prepare(
            `DELETE FROM training_sessions WHERE id = ? AND tenant_id = ?`
        ).bind(sessionId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to delete session" }, 500, corsHdrs);
    }
}

export async function handleCreateDrill(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;
        const drillId = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO drills (id, tenant_id, name, category, duration, players, equipment, description, difficulty, focus, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            drillId, claims.tenantId, body.name, body.category, body.duration,
            body.players, JSON.stringify(body.equipment), body.description,
            body.difficulty, JSON.stringify(body.focus), Date.now()
        ).run();

        return json({ success: true, id: drillId }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to create drill" }, 500, corsHdrs);
    }
}

export async function handleListDrills(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const category = url.searchParams.get('category');

        let query = `SELECT * FROM drills WHERE tenant_id = ?`;
        const params = [claims.tenantId];

        if (category) {
            query += ` AND category = ?`;
            params.push(category);
        }

        query += ` ORDER BY name ASC`;

        const result = await env.DB.prepare(query).bind(...params).all();

        // Parse JSON fields
        const drills = result.results.map((drill: any) => ({
            ...drill,
            equipment: JSON.parse(drill.equipment || '[]'),
            focus: JSON.parse(drill.focus || '[]'),
        }));

        return json({ success: true, data: drills }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to list drills" }, 500, corsHdrs);
    }
}

export async function handleDeleteDrill(req: Request, env: any, corsHdrs: Headers, drillId: string) {
    try {
        const claims = await requireJWT(req, env);

        await env.DB.prepare(
            `DELETE FROM drills WHERE id = ? AND tenant_id = ?`
        ).bind(drillId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to delete drill" }, 500, corsHdrs);
    }
}

// SECURITY: Validates session and drill belong to tenant
export async function handleAddDrillToSession(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        // SECURITY: Verify session belongs to tenant
        const session = await env.DB.prepare(
            `SELECT id FROM training_sessions WHERE id = ? AND tenant_id = ?`
        ).bind(body.sessionId, claims.tenantId).first();

        if (!session) {
            return json({ success: false, error: "Session not found" }, 404, corsHdrs);
        }

        // SECURITY: Verify drill belongs to tenant
        const drill = await env.DB.prepare(
            `SELECT id FROM drills WHERE id = ? AND tenant_id = ?`
        ).bind(body.drillId, claims.tenantId).first();

        if (!drill) {
            return json({ success: false, error: "Drill not found" }, 404, corsHdrs);
        }

        const id = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO session_drills (id, session_id, drill_id, duration, notes, drill_order)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
            id, body.sessionId, body.drillId, body.duration, body.notes || '', body.order || 0
        ).run();

        return json({ success: true, id }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to add drill to session" }, 500, corsHdrs);
    }
}

// SECURITY: Validates session belongs to tenant
export async function handleGetSessionDrills(req: Request, env: any, corsHdrs: Headers, sessionId: string) {
    try {
        const claims = await requireJWT(req, env);

        // SECURITY: Verify session belongs to tenant before returning drills
        const session = await env.DB.prepare(
            `SELECT id FROM training_sessions WHERE id = ? AND tenant_id = ?`
        ).bind(sessionId, claims.tenantId).first();

        if (!session) {
            return json({ success: false, error: "Session not found" }, 404, corsHdrs);
        }

        // Safe to query drills since session ownership verified
        const result = await env.DB.prepare(
            `SELECT sd.*, d.name, d.category, d.description, d.difficulty
             FROM session_drills sd
             JOIN drills d ON sd.drill_id = d.id AND d.tenant_id = ?
             WHERE sd.session_id = ?
             ORDER BY sd.drill_order ASC`
        ).bind(claims.tenantId, sessionId).all();

        return json({ success: true, data: result.results }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to get session drills" }, 500, corsHdrs);
    }
}
