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
            SELECT fr.*, t.name as team_display_name, tb.badge_url, tb.primary_color
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

        // Get the friendly request
        const friendlyRequest = await env.DB.prepare(
            `SELECT * FROM friendly_requests WHERE id = ? AND status = 'open'`
        ).bind(requestId).first();

        if (!friendlyRequest) {
            return json({ success: false, error: { message: 'Request not found or no longer available' } }, 404, corsHdrs);
        }

        // Can't request your own listing
        if (friendlyRequest.tenant_id === requesterTenantId) {
            return json({ success: false, error: { message: 'Cannot request your own listing' } }, 400, corsHdrs);
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
            body.proposed_date || null,
            body.proposed_venue || null,
            body.proposed_kickoff || null,
            body.message || null
        ).run();

        // Send notification to host team
        const notification = NotificationTemplates.friendlyMatchRequest(requesterTenant?.name || 'A team');
        await notifyTenantAdmins(env, friendlyRequest.tenant_id, notification);
        await createInAppNotification(
            env,
            friendlyRequest.tenant_id,
            null,
            'friendly_request',
            notification.title,
            notification.body,
            { matchId, requestId, requesterTeam: requesterTenant?.name }
        );

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
        const body = await req.json() as any;
        const { action, confirmed_date, confirmed_venue, confirmed_kickoff } = body;

        if (!['accept', 'decline'].includes(action)) {
            return json({ success: false, error: { message: 'Action must be accept or decline' } }, 400, corsHdrs);
        }

        // Get the match and verify ownership
        const match = await env.DB.prepare(`
            SELECT fm.*, fr.tenant_id as host_tenant_id, fr.team_name as host_team_name
            FROM friendly_matches fm
            JOIN friendly_requests fr ON fm.request_id = fr.id
            WHERE fm.id = ? AND fr.tenant_id = ?
        `).bind(matchId, tenantId).first();

        if (!match) {
            return json({ success: false, error: { message: 'Match not found' } }, 404, corsHdrs);
        }

        if (action === 'accept') {
            // Update match status
            await env.DB.prepare(`
                UPDATE friendly_matches 
                SET status = 'accepted', updated_at = unixepoch()
                WHERE id = ?
            `).bind(matchId).run();

            // Update request status to matched
            await env.DB.prepare(`
                UPDATE friendly_requests 
                SET status = 'matched', updated_at = unixepoch()
                WHERE id = ?
            `).bind(match.request_id).run();

            // Auto-create fixture for BOTH teams
            const fixtureDate = confirmed_date || match.proposed_date;
            const fixtureVenue = confirmed_venue || match.proposed_venue || 'TBC';
            const fixtureKickoff = confirmed_kickoff || match.proposed_kickoff || '15:00';

            // Create fixture for host team
            const hostFixtureId = crypto.randomUUID();
            await env.DB.prepare(`
                INSERT INTO fixtures (id, tenant_id, match_date, opponent, venue, kickoff, competition, status)
                VALUES (?, ?, ?, ?, ?, ?, 'Friendly', 'scheduled')
            `).bind(
                hostFixtureId,
                tenantId,
                fixtureDate,
                match.requester_team_name,
                fixtureVenue,
                fixtureKickoff
            ).run();

            // Create fixture for requester team
            const requesterFixtureId = crypto.randomUUID();
            await env.DB.prepare(`
                INSERT INTO fixtures (id, tenant_id, match_date, opponent, venue, kickoff, competition, status)
                VALUES (?, ?, ?, ?, ?, ?, 'Friendly', 'scheduled')
            `).bind(
                requesterFixtureId,
                match.requester_tenant_id,
                fixtureDate,
                match.host_team_name,
                fixtureVenue,
                fixtureKickoff
            ).run();

            // Send notification to requester team
            const notification = NotificationTemplates.friendlyMatchAccepted(match.host_team_name, fixtureDate);
            await notifyTenantAdmins(env, match.requester_tenant_id, notification);
            await createInAppNotification(
                env,
                match.requester_tenant_id,
                null,
                'friendly_accepted',
                notification.title,
                notification.body,
                { matchId, fixtureId: requesterFixtureId, hostTeam: match.host_team_name }
            );

            return json({
                success: true,
                message: 'Match accepted! Fixture created for both teams.',
                data: { fixture_id: hostFixtureId }
            }, 200, corsHdrs);
        } else {
            // Decline
            await env.DB.prepare(`
                UPDATE friendly_matches 
                SET status = 'declined', updated_at = unixepoch()
                WHERE id = ?
            `).bind(matchId).run();

            return json({ success: true, message: 'Match declined' }, 200, corsHdrs);
        }
    } catch (error: any) {
        if (error instanceof Response) {throw error;}
        console.error('[Friendlies] Respond error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
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
