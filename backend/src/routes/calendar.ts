import { json } from "../services/util";
import { requireTenantJWT } from "../services/auth";
import { buildCalendar, type CalendarFixture } from "../services/calendarIcs";

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
