import { z } from "zod";
import { json } from "../services/util";
import { requireJWT } from "../services/auth";
import { logJSON } from "../lib/log";

// Zod Schemas
const CreateEventSchema = z.object({
    title: z.string().min(1),
    date: z.string().datetime(),
    location: z.string().optional(),
    description: z.string().optional(),
});

const RsvpSchema = z.object({
    status: z.enum(["yes", "no", "maybe"]),
});

// Helper to get event with RSVP counts
async function getEventWithCounts(env: any, eventId: string) {
    const event = await env.DB.prepare("SELECT * FROM calendar_events WHERE id = ?").bind(eventId).first();
    if (!event) return null;

    const counts = await env.DB.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'yes' THEN 1 ELSE 0 END) as yes_count,
      SUM(CASE WHEN status = 'no' THEN 1 ELSE 0 END) as no_count,
      SUM(CASE WHEN status = 'maybe' THEN 1 ELSE 0 END) as maybe_count
    FROM event_rsvps
    WHERE event_id = ?
  `).bind(eventId).first();

    return {
        ...event,
        date: event.start_time, // Map start_time to date for API compatibility
        rsvp_yes_count: counts?.yes_count || 0,
        rsvp_no_count: counts?.no_count || 0,
        rsvp_maybe_count: counts?.maybe_count || 0,
    };
}

// POST /api/v1/events
export async function createEvent(req: Request, env: any, requestId: string, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json();
        const data = CreateEventSchema.parse(body);

        const id = `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const now = Date.now();

        await env.DB.prepare(`
      INSERT INTO calendar_events (id, tenant_id, title, start_time, location, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
            id,
            claims.tenantId,
            data.title,
            data.date,
            data.location || null,
            data.description || null,
            now
        ).run();

        const event = await getEventWithCounts(env, id);

        logJSON("info", requestId, { message: "EVENT_CREATED", eventId: id, tenantId: claims.tenantId });

        return json({ success: true, data: { event } }, 201, corsHdrs);
    } catch (err: any) {
        if (err instanceof Response) throw err;
        if (err instanceof z.ZodError) {
            return json({ success: false, error: { code: "INVALID_REQUEST", issues: err.issues } }, 400, corsHdrs);
        }
        logJSON("error", requestId, { message: "CREATE_EVENT_ERROR", error: err.message });
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
    }
}

// GET /api/v1/events/:id
export async function getEvent(req: Request, env: any, requestId: string, corsHdrs: Headers, id: string) {
    try {
        await requireJWT(req, env); // Ensure auth

        const event = await getEventWithCounts(env, id);
        if (!event) {
            return json({ success: false, error: { code: "NOT_FOUND", message: "Event not found" } }, 404, corsHdrs);
        }

        return json({ success: true, data: { event } }, 200, corsHdrs);
    } catch (err: any) {
        if (err instanceof Response) throw err;
        logJSON("error", requestId, { message: "GET_EVENT_ERROR", error: err.message });
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
    }
}

// POST /api/v1/events/:id/rsvp
export async function rsvpEvent(req: Request, env: any, requestId: string, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json();
        const data = RsvpSchema.parse(body);

        // Check if event exists
        const event = await env.DB.prepare("SELECT id FROM calendar_events WHERE id = ?").bind(id).first();
        if (!event) {
            return json({ success: false, error: { code: "NOT_FOUND", message: "Event not found" } }, 404, corsHdrs);
        }

        const rsvpId = `rsvp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const now = Date.now();

        // Upsert RSVP
        await env.DB.prepare(`
      INSERT INTO event_rsvps (id, event_id, user_id, status, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(event_id, user_id) DO UPDATE SET
        status = excluded.status,
        created_at = excluded.created_at
    `).bind(
            rsvpId,
            id,
            claims.sub,
            data.status,
            now
        ).run();

        logJSON("info", requestId, { message: "RSVP_UPDATED", eventId: id, userId: claims.sub, status: data.status });

        return json({ success: true }, 200, corsHdrs);
    } catch (err: any) {
        if (err instanceof Response) throw err;
        if (err instanceof z.ZodError) {
            return json({ success: false, error: { code: "INVALID_REQUEST", issues: err.issues } }, 400, corsHdrs);
        }
        logJSON("error", requestId, { message: "RSVP_EVENT_ERROR", error: err.message });
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
    }
}

// GET /api/v1/events/:id/rsvps
export async function getEventRsvps(req: Request, env: any, requestId: string, corsHdrs: Headers, id: string) {
    try {
        await requireJWT(req, env);

        const rsvps = await env.DB.prepare("SELECT * FROM event_rsvps WHERE event_id = ?").bind(id).all();

        return json({ success: true, data: { rsvps: rsvps.results } }, 200, corsHdrs);
    } catch (err: any) {
        if (err instanceof Response) throw err;
        logJSON("error", requestId, { message: "GET_RSVPS_ERROR", error: err.message });
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
    }
}

// DELETE /api/v1/events/:id/rsvp
export async function cancelRsvp(req: Request, env: any, requestId: string, corsHdrs: Headers, id: string) {
    try {
        const claims = await requireJWT(req, env);

        await env.DB.prepare("DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?").bind(id, claims.sub).run();

        logJSON("info", requestId, { message: "RSVP_CANCELLED", eventId: id, userId: claims.sub });

        return json({ success: true }, 200, corsHdrs);
    } catch (err: any) {
        if (err instanceof Response) throw err;
        logJSON("error", requestId, { message: "CANCEL_RSVP_ERROR", error: err.message });
        return json({ success: false, error: { code: "SERVER_ERROR", message: err.message } }, 500, corsHdrs);
    }
}
