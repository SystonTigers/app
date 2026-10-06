/**
 * Friendly Matchmaking Marketplace Routes
 * Cross-tenant feature for teams to find friendly match opponents
 * 
 * SECURITY: Uses requireJWT for auth, cross-tenant reads allowed for browsing
 */

import { json } from '../services/util';
import { requireJWT } from '../services/auth';
import { notifyTenantAdmins, createInAppNotification, NotificationTemplates } from '../services/notifications';

// ===========================================
// GET /api/v1/friendlies - Browse all open requests
// SECURITY: Authenticated users can see all open requests (cross-tenant feature)
// ===========================================
export async function handleListFriendlyRequests(req: Request, env: any, corsHdrs: Headers) {
    try {
        await requireJWT(req, env);

        const url = new URL(req.url);
        const ageGroup = url.searchParams.get('age_group');
        const location = url.searchParams.get('location');

        let query = `
            SELECT fr.id, fr.tenant_id, fr.team_name, fr.location_pref, fr.age_group, fr.kit_colors,
                fr.max_travel_miles, fr.pitch_type, fr.notes, fr.status, fr.created_at,
                t.name as team_display_name, tb.badge_url, tb.primary_color
            FROM friendly_requests fr
            LEFT JOIN tenants t ON fr.tenant_id = t.id
            LEFT JOIN tenant_brand tb ON fr.tenant_id = tb.tenant_id
            WHERE fr.status = 'open'
            AND (fr.expires_at IS NULL OR fr.expires_at > unixepoch())
        `;
        const params: any[] = [];

        if (ageGroup) {
            query += ` AND fr.age_group = ?`;
            params.push(ageGroup);
        }
        if (location) {
            query += ` AND (fr.location_pref = ? OR fr.location_pref = 'any')`;
            params.push(location);
        }

        query += ` ORDER BY fr.created_at DESC LIMIT 50`;

        const result = await env.DB.prepare(query).bind(...params).all();

        return json({
            success: true,
            data: result.results || []
        }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) {throw error;}
        console.error('[Friendlies] List error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// POST /api/v1/friendlies - Post new friendly request
// ===========================================
export async function handleCreateFriendlyRequest(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        if (!tenantId) {
            return json({ success: false, error: { message: 'Tenant not found' } }, 401, corsHdrs);
        }

        const body = await req.json() as any;
        const id = crypto.randomUUID();

        // Get team name from tenant
        const tenant = await env.DB.prepare(
            'SELECT name FROM tenants WHERE id = ?'
        ).bind(tenantId).first();

        const teamName = tenant?.name || body.team_name || 'Unknown Team';

        // Calculate expiry (default 30 days)
        const expiresAt = body.expires_in_days
            ? Math.floor(Date.now() / 1000) + (body.expires_in_days * 24 * 60 * 60)
            : Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

        await env.DB.prepare(`
            INSERT INTO friendly_requests (
                id, tenant_id, team_name, preferred_dates, location_pref,
                age_group, skill_level, kit_colors, max_travel_miles,
                pitch_type, notes, contact_info, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            tenantId,
            teamName,
            JSON.stringify(body.preferred_dates || []),
            body.location_pref || 'any',
            body.age_group || null,
            body.skill_level || null,
            body.kit_colors || null,
            body.max_travel_miles || null,
            body.pitch_type || 'any',
            body.notes || null,
            body.contact_info || null,
            expiresAt
        ).run();

        return json({
            success: true,
            data: { id, message: 'Friendly request posted!' }
        }, 201, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) {throw error;}
        console.error('[Friendlies] Create error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// GET /api/v1/friendlies/mine - My team's requests
// ===========================================
export async function handleGetMyFriendlyRequests(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const result = await env.DB.prepare(`
            SELECT fr.*,
                (SELECT COUNT(*) FROM friendly_matches fm WHERE fm.request_id = fr.id AND fm.status = 'pending') as pending_count
            FROM friendly_requests fr
            WHERE fr.tenant_id = ?
            ORDER BY fr.created_at DESC
        `).bind(tenantId).all();

        return json({ success: true, data: result.results || [] }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) {throw error;}
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// DELETE /api/v1/friendlies/:id - Remove my request
// ===========================================
export async function handleDeleteFriendlyRequest(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;
        const url = new URL(req.url);
        const requestId = url.pathname.split('/').pop();

        // Only allow deleting own requests
        const result = await env.DB.prepare(
            `DELETE FROM friendly_requests WHERE id = ? AND tenant_id = ?`
        ).bind(requestId, tenantId).run();

        if (result.meta?.changes === 0) {
            return json({ success: false, error: { message: 'Request not found' } }, 404, corsHdrs);
        }

        return json({ success: true }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) {throw error;}
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// POST /api/v1/friendlies/:id/request - Request to play
// ===========================================
export async function handleRequestMatch(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const requesterTenantId = claims.tenantId;

        if (!requesterTenantId) {
            return json({ success: false, error: { message: 'Tenant not found' } }, 401, corsHdrs);
        }

        const url = new URL(req.url);
        const requestId = url.pathname.split('/').slice(-2)[0];
        const body = await req.json() as any;

        // Get the friendly request. Deliberately not filtered by the caller's
        // club: the listing belongs to another club (the host), whose id is
        // read here and used for the match, fixtures and notifications.
        const friendlyRequest = await env.DB.prepare(
            `SELECT id, tenant_id FROM friendly_requests WHERE id = ? AND status = 'open'`
        ).bind(requestId).first();

        if (!friendlyRequest) {
            return json({ success: false, error: { message: 'Request not found or no longer available' } }, 404, corsHdrs);
        }

        // Can't request your own listing
        if (friendlyRequest.tenant_id === requesterTenantId) {
            return json({ success: false, error: { message: 'Cannot request your own listing' } }, 400, corsHdrs);
        }

        const proposedDate = typeof body.proposed_date === 'string' && body.proposed_date ? body.proposed_date.slice(0, 10) : null;
        if (proposedDate && !isDay(proposedDate)) {
            return json({ success: false, error: { message: 'Pick a date for the game.' } }, 400, corsHdrs);
        }
        // One waiting offer per club per post (a second tap doesn't send another)
        const already = await env.DB.prepare(
            `SELECT id FROM friendly_matches WHERE request_id = ? AND requester_tenant_id = ? AND status = 'pending' LIMIT 1`
        ).bind(requestId, requesterTenantId).first();
        if (already) {
            return json({ success: true, data: { id: already.id, message: 'You have already offered them a game.' } }, 200, corsHdrs);
        }

        // Get requester team name
        const requesterTenant = await env.DB.prepare(
            'SELECT name FROM tenants WHERE id = ?'
        ).bind(requesterTenantId).first();

        const matchId = crypto.randomUUID();

        await env.DB.prepare(`
            INSERT INTO friendly_matches (
                id, request_id, requester_tenant_id, requester_team_name,
                host_tenant_id, proposed_date, proposed_venue, proposed_kickoff, message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            matchId,
            requestId,
            requesterTenantId,
            requesterTenant?.name || 'Unknown Team',
            friendlyRequest.tenant_id,
            proposedDate,
            typeof body.proposed_venue === 'string' ? body.proposed_venue.slice(0, 120) : null,
            typeof body.proposed_kickoff === 'string' && /^\d{1,2}:\d{2}$/.test(body.proposed_kickoff) ? body.proposed_kickoff : null,
            typeof body.message === 'string' ? body.message.slice(0, 500) : null
        ).run();

        // Send notification to host team
        const notification = NotificationTemplates.friendlyMatchRequest(requesterTenant?.name || 'A team');
        // Telling them is a bonus: the offer is saved either way
        await notifyTenantAdmins(env, friendlyRequest.tenant_id, notification).catch(() => undefined);
        await createInAppNotification(
            env,
            friendlyRequest.tenant_id,
            null,
            'friendly_request',
            notification.title,
            notification.body,
            { matchId, requestId, requesterTeam: requesterTenant?.name }
        ).catch((err: unknown) => console.error('[Friendlies] notify failed', err));

        return json({
            success: true,
            data: { id: matchId, message: 'Match request sent!' }
        }, 201, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) {throw error;}
        console.error('[Friendlies] Request match error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// GET /api/v1/friendlies/inbox - Requests I've received
// ===========================================
export async function handleGetFriendlyInbox(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const result = await env.DB.prepare(`
            SELECT fm.*, fr.preferred_dates, fr.age_group,
                t.name as requester_display_name,
                tb.badge_url as requester_badge_url,
                tb.primary_color as requester_color
            FROM friendly_matches fm
            JOIN friendly_requests fr ON fm.request_id = fr.id
            LEFT JOIN tenants t ON fm.requester_tenant_id = t.id
            LEFT JOIN tenant_brand tb ON fm.requester_tenant_id = tb.tenant_id
            WHERE fm.host_tenant_id = ?
            ORDER BY fm.created_at DESC
        `).bind(tenantId).all();

        return json({ success: true, data: result.results || [] }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) {throw error;}
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

// ===========================================
// POST /api/v1/friendlies/match/:id/respond - Accept/decline
// ===========================================
export async function handleRespondToMatch(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const url = new URL(req.url);
        const matchId = url.pathname.split('/').slice(-2)[0];
        const body = await req.json().catch(() => ({})) as any;
        const { action, confirmed_date, confirmed_venue, confirmed_kickoff } = body;

        if (!['accept', 'decline'].includes(action)) {
            return json({ success: false, error: { message: 'Action must be accept or decline' } }, 400, corsHdrs);
        }

        // Only the club that posted can answer, and only a waiting offer
        const match = await env.DB.prepare(`
            SELECT fm.*, fr.tenant_id as host_tenant_id, fr.team_name as host_team_name, fr.location_pref
            FROM friendly_matches fm
            JOIN friendly_requests fr ON fm.request_id = fr.id
            WHERE fm.id = ? AND fr.tenant_id = ?
        `).bind(matchId, tenantId).first();

        if (!match) {
            return json({ success: false, error: { message: 'Match not found' } }, 404, corsHdrs);
        }
        if (match.status !== 'pending') {
            // Answering twice (a double tap or a retry) changes nothing
            return json({ success: true, message: `Already ${match.status}.`, data: { status: match.status } }, 200, corsHdrs);
        }

        if (action === 'decline') {
            await env.DB.prepare(`
                UPDATE friendly_matches SET status = 'declined', updated_at = unixepoch()
                WHERE id = ? AND host_tenant_id = ? AND status = 'pending'
            `).bind(matchId, tenantId).run();
            return json({ success: true, message: 'Match declined' }, 200, corsHdrs);
        }

        const fixtureDate = String(confirmed_date || match.proposed_date || '').slice(0, 10);
        if (!isDay(fixtureDate)) {
            return json({ success: false, error: { code: 'DATE_NEEDED', message: 'They didn\'t suggest a date. Agree one with them, then pick it here.' } }, 400, corsHdrs);
        }
        const kickoff = typeof confirmed_kickoff === 'string' && /^\d{1,2}:\d{2}$/.test(confirmed_kickoff) ? confirmed_kickoff : (match.proposed_kickoff || '15:00');
        const venue = (typeof confirmed_venue === 'string' && confirmed_venue.trim() ? confirmed_venue.trim().slice(0, 120) : null) || match.proposed_venue || 'TBC';

        const hostTenant = await env.DB.prepare('SELECT name FROM tenants WHERE id = ?').bind(tenantId).first() as { name?: string } | null;
        const hostName = hostTenant?.name || match.host_team_name;
        const requesterName = match.requester_team_name;
        // The club that posted plays at home unless it asked to play away
        const hostAway = match.location_pref === 'away';
        const home = hostAway ? requesterName : hostName;
        const away = hostAway ? hostName : requesterName;

        // Claim the offer first, so a second accept can't make the fixtures twice
        const claimed = await env.DB.prepare(`
            UPDATE friendly_matches SET status = 'accepted', proposed_date = ?, updated_at = unixepoch()
            WHERE id = ? AND host_tenant_id = ? AND status = 'pending'
        `).bind(fixtureDate, matchId, tenantId).run();
        if (!claimed.meta?.changes) {
            return json({ success: true, message: 'Already answered.' }, 200, corsHdrs);
        }

        const hostFixtureId = crypto.randomUUID();
        const requesterFixtureId = crypto.randomUUID();
        const insert = (id: string, club: string, opponent: string) => env.DB.prepare(`
            INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, venue, competition, status, home_team, away_team, source)
            VALUES (?, ?, ?, ?, ?, ?, 'Friendly', 'scheduled', ?, ?, 'friendly')
            ON CONFLICT(tenant_id, fixture_date, home_team, away_team) DO NOTHING
        `).bind(id, club, fixtureDate, kickoff, opponent, venue, home, away);
        await env.DB.batch([
            env.DB.prepare(`UPDATE friendly_requests SET status = 'matched', updated_at = unixepoch() WHERE id = ? AND tenant_id = ?`)
                .bind(match.request_id, tenantId),
            // Other clubs' offers for the same post are answered too
            env.DB.prepare(`UPDATE friendly_matches SET status = 'declined', updated_at = unixepoch() WHERE request_id = ? AND host_tenant_id = ? AND id != ? AND status = 'pending'`)
                .bind(match.request_id, tenantId, matchId),
            insert(hostFixtureId, String(tenantId), requesterName),
            insert(requesterFixtureId, match.requester_tenant_id, hostName),
        ]);

        const notification = NotificationTemplates.friendlyMatchAccepted(hostName, fixtureDate);
        await notifyTenantAdmins(env, match.requester_tenant_id, notification).catch(() => undefined);
        await createInAppNotification(
            env,
            match.requester_tenant_id,
            null,
            'friendly_accepted',
            notification.title,
            notification.body,
            { matchId, fixtureId: requesterFixtureId, hostTeam: hostName }
        ).catch(() => undefined);

        console.log(JSON.stringify({ event: 'friendly_accepted', tenant: tenantId, matchId, date: fixtureDate }));
        return json({
            success: true,
            message: 'Match accepted! Fixture created for both teams.',
            data: { fixture_id: hostFixtureId }
        }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) {throw error;}
        console.error('[Friendlies] Respond error:', error);
        return json({ success: false, error: { message: "That reply didn't save. Please try again." } }, 500, corsHdrs);
    }
}

/** A real calendar day as YYYY-MM-DD. */
function isDay(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// ===========================================
// GET /api/v1/friendlies/sent - Requests I've sent to others
// ===========================================
export async function handleGetSentRequests(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const result = await env.DB.prepare(`
            SELECT fm.*, fr.team_name as host_team_name, fr.age_group,
                tb.badge_url as host_badge_url,
                tb.primary_color as host_color
            FROM friendly_matches fm
            JOIN friendly_requests fr ON fm.request_id = fr.id
            LEFT JOIN tenant_brand tb ON fr.tenant_id = tb.tenant_id
            WHERE fm.requester_tenant_id = ?
            ORDER BY fm.created_at DESC
        `).bind(tenantId).all();

        return json({ success: true, data: result.results || [] }, 200, corsHdrs);
    } catch (error: any) {
        if (error instanceof Response) {throw error;}
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}
