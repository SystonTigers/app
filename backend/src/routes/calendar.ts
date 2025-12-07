import { json } from "../services/util";
import { requireJWT } from "../services/auth";

// Generate ICS calendar file from fixtures
export async function handleExportCalendarICS(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        // Get all fixtures for tenant
        const fixtures = await env.DB.prepare(
            "SELECT * FROM fixtures WHERE tenant_id = ? ORDER BY fixture_date ASC"
        ).bind(claims.tenantId).all();

        // Get tenant name for calendar title
        const tenant = await env.DB.prepare(
            "SELECT name FROM tenants WHERE id = ?"
        ).bind(claims.tenantId).first();

        const teamName = tenant?.name || 'Football Club';

        // Build ICS content
        let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Football Club App//Fixtures//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${teamName} Fixtures
X-WR-TIMEZONE:Europe/London
`;

        for (const fixture of (fixtures.results || [])) {
            const uid = `fixture-${fixture.id}@footballclub.app`;
            const startDate = formatDateForICS(fixture.fixture_date, fixture.kick_off_time);
            const endDate = formatDateForICS(fixture.fixture_date, fixture.kick_off_time, 2); // 2 hour duration
            const location = fixture.venue === 'Home' ? 'Home Ground' : `Away - ${fixture.opponent}`;

            icsContent += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDateForICS(new Date().toISOString().split('T')[0], '00:00')}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${fixture.venue === 'Home' ? teamName : fixture.opponent} vs ${fixture.venue === 'Home' ? fixture.opponent : teamName}
DESCRIPTION:${fixture.competition || 'League Match'}
LOCATION:${location}
STATUS:CONFIRMED
END:VEVENT
`;
        }

        icsContent += 'END:VCALENDAR';

        // Return as downloadable file
        const headers = new Headers(corsHdrs);
        headers.set('Content-Type', 'text/calendar; charset=utf-8');
        headers.set('Content-Disposition', `attachment; filename="${teamName.replace(/[^a-z0-9]/gi, '_')}_fixtures.ics"`);

        return new Response(icsContent, { status: 200, headers });
    } catch (err) {
        console.error('Export ICS error:', err);
        return json({ success: false, error: "Failed to export calendar" }, 500, corsHdrs);
    }
}

// Helper to format date for ICS (YYYYMMDDTHHMMSSZ format)
function formatDateForICS(date: string, time: string | null, hoursToAdd = 0): string {
    try {
        // Parse date (could be YYYY-MM-DD or DD/MM/YYYY)
        let year, month, day;
        if (date.includes('-')) {
            [year, month, day] = date.split('-');
        } else if (date.includes('/')) {
            [day, month, year] = date.split('/');
        } else {
            return '';
        }

        // Parse time (HH:MM or HH:MM:SS)
        let hours = 14; // Default 2pm
        let minutes = 0;
        if (time) {
            const timeParts = time.split(':');
            hours = parseInt(timeParts[0]) || 14;
            minutes = parseInt(timeParts[1]) || 0;
        }

        // Add hours if needed
        hours += hoursToAdd;

        // Format as ICS datetime
        return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}T${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00`;
    } catch {
        return '';
    }
}
