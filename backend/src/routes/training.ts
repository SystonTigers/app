import { json } from "../services/util";
import { requireJWT } from "../services/auth";
import { rateLimitWithTenant } from "../middleware/rateLimit";

// Helper to parse duration string "15 min" to integer 15
function parseDuration(d: string | number): number {
    if (typeof d === 'number') return d;
    if (!d) return 0;
    const match = d.toString().match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

export async function handleCreateSession(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const rateLimitResult = await rateLimitWithTenant(req, env, claims, {
            scope: "training_session",
            limit: 30,
        });
        if (!rateLimitResult.ok) {
            return json({ success: false, error: rateLimitResult.error || "Rate limit exceeded" }, 429, corsHdrs);
        }

        const body = await req.json() as any;
        const planId = crypto.randomUUID();

        // Mapping 'Session' to 'Training Plan'
        // Plan: id, tenant_id, title, scheduled_date, description, created_by, created_at, updated_at
        // Body: date, time, team, focus (title)

        const description = JSON.stringify({
            time: body.time,
            team: body.team,
            status: 'planned'
        });

        await env.DB.prepare(
            `INSERT INTO training_plans (id, tenant_id, title, scheduled_date, description, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            planId,
            claims.tenantId,
            body.focus || 'Training Session', // Title
            body.date,
            description,
            claims.sub || 'system',
            Date.now(),
            Date.now()
        ).run();

        return json({ success: true, id: planId }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        console.error("Create session error:", err);
        return json({ success: false, error: "Failed to create session" }, 500, corsHdrs);
    }
}

export async function handleListSessions(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            `SELECT * FROM training_plans WHERE tenant_id = ? ORDER BY scheduled_date DESC`
        ).bind(claims.tenantId).all();

        // Transform back to frontend expected format
        const sessions = result.results.map((plan: any) => {
            let meta: any = {};
            try {
                meta = JSON.parse(plan.description || '{}');
            } catch (e) {
                // description might be plain text
                meta = { note: plan.description };
            }

            return {
                id: plan.id,
                session_date: plan.scheduled_date,
                session_time: meta.time || '',
                team: meta.team || 'First Team',
                focus: plan.title,
                status: meta.status || 'planned',
                is_plan: true
            };
        });

        return json({ success: true, data: sessions }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        console.error("List sessions error:", err);
        return json({ success: false, error: "Failed to list sessions" }, 500, corsHdrs);
    }
}

export async function handleDeleteSession(req: Request, env: any, corsHdrs: Headers, sessionId: string) {
    try {
        const claims = await requireJWT(req, env);
        await env.DB.prepare(
            `DELETE FROM training_plans WHERE id = ? AND tenant_id = ?`
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

        // 016 Schema: id, tenant_id, title, category, duration_minutes, equipment, description, diagram_url, demo_video_url, created_by...
        // Frontend Body: name, category, duration, players, equipment, description, difficulty, focus

        // Store extra fields in description or equipment JSON if needed, or drop them.
        // Let's store compact JSON in description if we really want to keep difficulty etc.
        // But better to stick to schema. We'll map 'name' -> 'title'.

        const durationMin = parseDuration(body.duration);
        const equipmentStr = Array.isArray(body.equipment) ? JSON.stringify(body.equipment) : (body.equipment || '');

        // We append difficulty/players to description for now so we don't lose it entirely, 
        // until we add columns or update frontend to not use them.
        let desc = body.description || '';
        if (body.difficulty) desc += `\n\nDifficulty: ${body.difficulty}`;
        if (body.players) desc += `\nPlayers: ${body.players}`;

        await env.DB.prepare(
            `INSERT INTO training_drills (id, tenant_id, title, category, duration_minutes, equipment, description, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            drillId,
            claims.tenantId,
            body.name, // title
            body.category,
            durationMin,
            equipmentStr,
            desc,
            claims.sub || 'system',
            Date.now(),
            Date.now()
        ).run();

        return json({ success: true, id: drillId }, 200, corsHdrs);
    } catch (err) {
        if (err instanceof Response) throw err;
        console.error("Create drill error:", err);
        return json({ success: false, error: "Failed to create drill" }, 500, corsHdrs);
    }
}

export async function handleListDrills(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const category = url.searchParams.get('category');

        let query = `SELECT * FROM training_drills WHERE tenant_id = ?`;
        const params: any[] = [claims.tenantId];

        if (category && category !== 'All') {
            query += ` AND category = ?`;
            params.push(category);
        }

        query += ` ORDER BY title ASC`;

        const result = await env.DB.prepare(query).bind(...params).all();

        // Map back to frontend Drill interface
        // Frontend expects: id, name, category, duration, difficulty, description
        const drills = result.results.map((d: any) => {
            // Extract difficulty from description if possible, or default
            let difficulty = 'intermediate';
            if (d.description && d.description.includes('Difficulty: ')) {
                const match = d.description.match(/Difficulty: (\w+)/);
                if (match) difficulty = match[1];
            }

            // Parse equipment
            let eq: string[] = [];
            try {
                eq = JSON.parse(d.equipment);
            } catch (e) {
                if (d.equipment) eq = [d.equipment];
            }

            return {
                id: d.id,
                name: d.title,
                category: d.category,
                duration: `${d.duration_minutes} min`,
                difficulty: difficulty,
                description: d.description,
                equipment: eq
            };
        });

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
            `DELETE FROM training_drills WHERE id = ? AND tenant_id = ?`
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

 claude/check-goals-data-storage-016CPokjw18vvoUXDyKapgGj
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
        // table: training_plan_drills (plan_id, drill_id, order_index)
        // body: sessionId, drillId, order...

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
        if (err instanceof Response) throw err;
        console.error("Add drill to session error:", err);
        return json({ success: false, error: "Failed to add drill to session" }, 500, corsHdrs);
    }
}

// SECURITY: Validates session belongs to tenant
export async function handleGetSessionDrills(req: Request, env: any, corsHdrs: Headers, sessionId: string) {
    try {
        const claims = await requireJWT(req, env);

claude/check-goals-data-storage-016CPokjw18vvoUXDyKapgGj
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
        // Join training_plan_drills with training_drills
        const result = await env.DB.prepare(
            `SELECT pd.order_index, d.*
             FROM training_plan_drills pd
             JOIN training_drills d ON pd.drill_id = d.id
             WHERE pd.plan_id = ?
             ORDER BY pd.order_index ASC`
        ).bind(sessionId).all();

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
        if (err instanceof Response) throw err;
        return json({ success: false, error: "Failed to get session drills" }, 500, corsHdrs);
    }
}
