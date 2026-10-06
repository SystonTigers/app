import { json } from "../services/util";
import { requireTenantJWT } from "../services/auth";
import { buildCalendar, type CalendarFixture } from "../services/calendarIcs";
import { calendarToken, readCalendarToken } from "../services/calendarToken";

/** The fixtures a calendar shows: from four months back onwards. */
export async function calendarFixtures(env: any, tenantId: string): Promise<CalendarFixture[]> {
    const from = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10);
    const { results } = await env.DB.prepare(
        `SELECT id, fixture_date, kick_off_time, opponent, home_team, away_team, venue, competition, status
         FROM fixtures WHERE tenant_id = ? AND substr(fixture_date, 1, 10) >= ? ORDER BY fixture_date ASC LIMIT 500`
    ).bind(tenantId, from).all();
    return (results ?? []) as CalendarFixture[];
}

export function calendarResponse(clubName: string, fixtures: CalendarFixture[], host: string, corsHdrs: Headers, download: boolean): Response {
    const headers = new Headers(corsHdrs);
    headers.set('Content-Type', 'text/calendar; charset=utf-8');
    headers.set('Cache-Control', 'public, max-age=900');
    if (download) headers.set('Content-Disposition', `attachment; filename="${clubName.replace(/[^a-z0-9]+/gi, '_')}_fixtures.ics"`);
    return new Response(buildCalendar(clubName, fixtures, { host }), { status: 200, headers });
}

/** GET /api/v1/calendar/export (members): the club's fixtures as a calendar file to download. */
export async function handleExportCalendarICS(req: Request, env: any, corsHdrs: Headers) {
    let tenantId: string;
    try {
        tenantId = (await requireTenantJWT(req, env)).tenantId;
    } catch {
        return json({ success: false, error: "Please log in again." }, 401, corsHdrs);
    }
    try {
        const tenant = await env.DB.prepare("SELECT name FROM tenants WHERE id = ?").bind(tenantId).first() as { name?: string } | null;
        return calendarResponse(tenant?.name || 'Club', await calendarFixtures(env, tenantId), new URL(req.url).host, corsHdrs, true);
    } catch (err) {
        console.error('Export ICS error:', err);
        return json({ success: false, error: "Failed to export calendar" }, 500, corsHdrs);
    }
}

/** GET /api/v1/calendar/link (members): this person's private calendar address to subscribe to. */
export async function handleCalendarLink(req: Request, env: any, corsHdrs: Headers) {
    let claims;
    try {
        claims = await requireTenantJWT(req, env);
    } catch {
        return json({ success: false, error: "Please log in again." }, 401, corsHdrs);
    }
    if (!claims.userId || !env.JWT_SECRET) return json({ success: false, error: "Calendar links aren't available for this account." }, 400, corsHdrs);
    const token = await calendarToken(env.JWT_SECRET, claims.tenantId, claims.userId);
    return json({ success: true, data: { url: `${new URL(req.url).origin}/api/v1/calendar/feed/${token}.ics` } }, 200, corsHdrs);
}

/**
 * GET /api/v1/calendar/feed/<token>.ics: the fixtures for a calendar app.
 * Works only while the account is still a member of the club.
 */
export async function handleCalendarFeed(req: Request, env: any, corsHdrs: Headers, rawToken: string) {
    const token = decodeURIComponent(rawToken || "").replace(/\.ics$/, "");
    const who = env.JWT_SECRET ? await readCalendarToken(env.JWT_SECRET, token) : null;
    const member = who
        ? await env.DB.prepare(`SELECT u.id, t.name FROM auth_users u JOIN tenants t ON t.id = u.tenant_id WHERE u.id = ? AND u.tenant_id = ? AND COALESCE(t.status, 'active') != 'suspended'`)
            .bind(who.userId, who.tenantId).first() as { id: string; name: string | null } | null
        : null;
    if (!who || !member) return new Response("This calendar link no longer works. Get a new one in the club app: Fixtures, Add fixtures to my calendar.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
    const res = calendarResponse(member.name || "Club", await calendarFixtures(env, who.tenantId), new URL(req.url).host, corsHdrs, false);
    res.headers.set("Cache-Control", "private, max-age=900");
    res.headers.set("X-Robots-Tag", "noindex");
    return res;
}
