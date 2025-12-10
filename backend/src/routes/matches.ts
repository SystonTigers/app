import { json } from "../services/util";
import { logJSON } from "../lib/log";
import { requireJWT } from "../services/auth";

export async function handleMatchUpdates(
    req: Request,
    env: any,
    corsHdrs: Headers,
    matchId: string
): Promise<Response> {
    const claims = await requireJWT(req, env);

    // 1. Fetch match details - SECURITY: Filter by tenant_id to prevent cross-tenant access
    const match = await env.DB.prepare(
        "SELECT * FROM matches WHERE id = ? AND tenant_id = ?"
    ).bind(matchId, claims.tenantId).first();

    if (!match) {
        return json({ success: false, error: "Match not found" }, 404, corsHdrs);
    }

    // 2. Fetch all events for this match (safe since we verified match ownership above)
    const { results: events } = await env.DB.prepare(
        "SELECT * FROM events WHERE match_id = ? ORDER BY minute ASC, ts ASC"
    ).bind(matchId).all();

    // 3. Format events and determine team from payload if missing
    const formattedEvents = events.map((e: any) => {
        let payload = {};
        try { payload = JSON.parse(e.payload_json || "{}"); } catch { }

        return {
            id: e.id,
            type: e.type,
            minute: e.minute,
            player: e.player_id,
            team: (payload as any).team || 'home',
            ...payload
        };
    });

    // 4. Calculate score from events
    const homeScore = formattedEvents.filter((e: any) => e.type === 'goal' && e.team === 'home').length;
    const awayScore = formattedEvents.filter((e: any) => e.type === 'goal' && e.team === 'away').length;

    return json({
        success: true,
        data: {
            id: match.id,
            status: match.status,
            score: {
                home: homeScore,
                away: awayScore
            },
            time: match.status === 'live' ? "45'" : "0'",
            events: formattedEvents
        }
    }, 200, corsHdrs);
}

// POST /api/v1/matches/:id/events
// SECURITY: Validates match belongs to tenant before creating event
export async function handleCreateMatchEvent(
    req: Request,
    env: any,
    corsHdrs: Headers,
    matchId: string
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        // SECURITY: Verify match belongs to tenant before creating event
        const match = await env.DB.prepare(
            "SELECT id FROM matches WHERE id = ? AND tenant_id = ?"
        ).bind(matchId, claims.tenantId).first();
        if (!match) {
            return json({ success: false, error: "Match not found" }, 404, corsHdrs);
        }

        // Body: { type: 'goal', minute: 45, player_id: '...', home_score: 2, away_score: 1, text: '...', image: 'base64...' }

        const eventId = crypto.randomUUID();
        const now = Date.now();

        // 1. Insert Event into Match Log
        // Note: Using payload_json to store extra fields like 'team', 'text', 'assister'
        await env.DB.prepare(`
            INSERT INTO events (id, match_id, type, minute, player_id, payload_json, ts)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            eventId,
            matchId,
            body.type,
            body.minute,
            body.player_id || null,
            JSON.stringify({
                team: body.team, // 'home' or 'away'
                text: body.text,
                assister: body.assister,
                ...body.extra
            }),
            now
        ).run();

        // 2. Create Social Post / News Feed
        if (body.image) {
            // NOTE: In production, upload body.image (base64) to R2 and get a URL.
            // For now, we store the base64 string directly in media_urls JSON.
            const fakeUrl = body.image;

            const postId = crypto.randomUUID();
            await env.DB.prepare(
                `INSERT INTO social_posts (id, tenant_id, content, platforms, media_urls, status, created_by, created_at)
                 VALUES (?, ?, ?, ?, ?, 'published', ?, ?)`
            ).bind(
                postId,
                claims.tenantId,
                body.text || `Match Event: ${body.type}`,
                JSON.stringify(['app_feed']), // Internal feed
                JSON.stringify([fakeUrl]),
                claims.userId,
                now
            ).run();
        }

        return json({ success: true, eventId }, 201, corsHdrs);

    } catch (err: any) {
        console.error("Create Event Error", err);
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}
