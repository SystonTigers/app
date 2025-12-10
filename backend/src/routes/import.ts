import { json } from "../services/util";
import { requireJWT } from "../services/auth";

/**
 * CSV Import API endpoints
 * Supports importing: fixtures, results, players, match_events
 */

// Parse CSV string into array of objects
function parseCSV(csvText: string): any[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h =>
        h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '')
    );

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0) continue;

        const row: any = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = values[j]?.trim() || '';
        }
        data.push(row);
    }

    return data;
}

// Parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}

// POST /api/v1/import/fixtures
export async function handleImportFixtures(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const body = await req.text();
        const rows = parseCSV(body);

        if (rows.length === 0) {
            return json({ success: false, error: "No data found in CSV" }, 400, corsHdrs);
        }

        let imported = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const id = crypto.randomUUID();
                const fixtureDate = row.date || row.fixture_date;

                await env.DB.prepare(`
                    INSERT INTO fixtures (id, tenant_id, fixture_date, opponent, venue, competition, kick_off_time, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id,
                    tenant,
                    fixtureDate,
                    row.opponent || row.team,
                    row.venue || 'TBC',
                    row.competition || 'League',
                    row.time || row.kick_off_time || row.kick_off || '15:00',
                    Date.now()
                ).run();

                imported++;
            } catch (err: any) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }

        return json({
            success: true,
            imported,
            total: rows.length,
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined
        }, 200, corsHdrs);

    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// POST /api/v1/import/results
export async function handleImportResults(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const body = await req.text();
        const rows = parseCSV(body);

        if (rows.length === 0) {
            return json({ success: false, error: "No data found in CSV" }, 400, corsHdrs);
        }

        let imported = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const id = crypto.randomUUID();
                const matchDate = row.date || row.match_date;

                let homeScore = parseInt(row.home_score || row.score_home || row.our_goals || '0');
                let awayScore = parseInt(row.away_score || row.score_away || row.their_goals || '0');

                if (row.score && row.score.includes('-')) {
                    const [h, a] = row.score.split('-').map((s: string) => parseInt(s.trim()));
                    homeScore = h;
                    awayScore = a;
                }

                await env.DB.prepare(`
                    INSERT INTO matches (id, team_id, opponent, date_utc, home_score, away_score, competition, venue, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
                `).bind(
                    id,
                    tenant,
                    row.opponent || row.team,
                    Math.floor(new Date(matchDate).getTime() / 1000),
                    homeScore,
                    awayScore,
                    row.competition || 'League',
                    row.venue || 'Home',
                    Date.now()
                ).run();

                imported++;
            } catch (err: any) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }

        return json({
            success: true,
            imported,
            total: rows.length,
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined
        }, 200, corsHdrs);

    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// POST /api/v1/import/players
export async function handleImportPlayers(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const body = await req.text();
        const rows = parseCSV(body);

        if (rows.length === 0) {
            return json({ success: false, error: "No data found in CSV" }, 400, corsHdrs);
        }

        let imported = 0;
        const errors: string[] = [];
        const players = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const id = crypto.randomUUID();
                const player = {
                    id,
                    name: row.name || row.player_name,
                    number: parseInt(row.number || row.squad_number || '0') || null,
                    position: row.position || null,
                    dob: row.dob || row.date_of_birth || row.birthday || null,
                    bio: row.bio || null,
                    photo_url: row.photo || row.photo_url || null,
                    role: row.role || 'Player',
                    previous_club: row.previous_club || null,
                };

                await env.DB.prepare(`
                    INSERT INTO squad (id, tenant_id, name, number, position, photo_url, dob, bio, role, previous_club, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id,
                    tenant,
                    player.name,
                    player.number,
                    player.position,
                    player.photo_url,
                    player.dob,
                    player.bio,
                    player.role,
                    player.previous_club,
                    Date.now()
                ).run();

                players.push(player);
                imported++;
            } catch (err: any) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }

        // Also update KV list
        if (players.length > 0) {
            const listStr = await env.KV_IDEMP.get(`squad:${tenant}:list`);
            const existingList = listStr ? JSON.parse(listStr) : [];
            await env.KV_IDEMP.put(`squad:${tenant}:list`, JSON.stringify([...existingList, ...players]));
        }

        return json({
            success: true,
            imported,
            total: rows.length,
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined
        }, 200, corsHdrs);

    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// POST /api/v1/import/match-events
export async function handleImportMatchEvents(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const body = await req.text();
        const rows = parseCSV(body);

        if (rows.length === 0) {
            return json({ success: false, error: "No data found in CSV" }, 400, corsHdrs);
        }

        // Get player name-to-id mapping
        const players = await env.DB.prepare(`SELECT id, name FROM squad WHERE tenant_id = ?`).bind(tenant).all();
        const playerMap: { [name: string]: string } = {};
        for (const p of (players.results || []) as any[]) {
            playerMap[p.name.toLowerCase()] = p.id;
        }

        // Get fixture date-to-id mapping
        const fixtures = await env.DB.prepare(`SELECT id, fixture_date FROM fixtures WHERE tenant_id = ?`).bind(tenant).all();
        const fixtureMap: { [date: string]: string } = {};
        for (const f of (fixtures.results || []) as any[]) {
            fixtureMap[f.fixture_date] = f.id;
        }

        let imported = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                const playerName = (row.player || row.player_name || '').toLowerCase();
                const playerId = row.player_id || playerMap[playerName];

                if (!playerId) {
                    errors.push(`Row ${i + 2}: Unknown player "${row.player || row.player_name}"`);
                    continue;
                }

                const matchDate = row.date || row.match_date;
                const fixtureId = row.fixture_id || fixtureMap[matchDate];

                if (!fixtureId) {
                    errors.push(`Row ${i + 2}: No fixture found for date "${matchDate}"`);
                    continue;
                }

                const eventType = (row.event_type || row.type || 'goal').toLowerCase();
                const minute = parseInt(row.minute || '0') || null;

                const id = crypto.randomUUID();
                await env.DB.prepare(`
                    INSERT INTO match_events (id, tenant_id, fixture_id, player_id, event_type, minute, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id,
                    tenant,
                    fixtureId,
                    playerId,
                    eventType,
                    minute,
                    Date.now()
                ).run();

                imported++;
            } catch (err: any) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }

        return json({
            success: true,
            imported,
            total: rows.length,
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined
        }, 200, corsHdrs);

    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// GET /api/v1/import/template/:type
export async function handleGetImportTemplate(req: Request, env: any, corsHdrs: Headers, type: string) {
    const templates: { [key: string]: string } = {
        fixtures: 'date,opponent,venue,competition,time\n2024-01-15,Rovers FC,Home,League,14:00\n2024-01-22,United,Away,Cup,15:00',
        results: 'date,opponent,home_score,away_score,venue,competition\n2024-01-08,City FC,3,1,Home,League\n2024-01-01,Town,2,2,Away,League',
        players: 'name,number,position,dob,previous_club\nJohn Smith,9,Forward,1998-05-15,Academy FC\nDave Jones,4,Defender,1995-08-22,United Reserves',
        'match-events': 'date,player,event_type,minute\n2024-01-08,John Smith,goal,23\n2024-01-08,Dave Jones,assist,23\n2024-01-08,John Smith,goal,67',
    };

    const template = templates[type];
    if (!template) {
        return json({ success: false, error: `Unknown template type: ${type}` }, 400, corsHdrs);
    }

    const headers = new Headers(corsHdrs);
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="${type}_template.csv"`);

    return new Response(template, { status: 200, headers });
}

// GET /api/v1/import/status
export async function handleGetImportStatus(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const [fixturesCount, matchesCount, playersCount, eventsCount] = await Promise.all([
            env.DB.prepare(`SELECT COUNT(*) as count FROM fixtures WHERE tenant_id = ?`).bind(tenant).first(),
            env.DB.prepare(`SELECT COUNT(*) as count FROM matches WHERE team_id = ?`).bind(tenant).first(),
            env.DB.prepare(`SELECT COUNT(*) as count FROM squad WHERE tenant_id = ?`).bind(tenant).first(),
            env.DB.prepare(`SELECT COUNT(*) as count FROM match_events WHERE tenant_id = ?`).bind(tenant).first(),
        ]);

        return json({
            success: true,
            counts: {
                fixtures: (fixturesCount as any)?.count || 0,
                matches: (matchesCount as any)?.count || 0,
                players: (playersCount as any)?.count || 0,
                match_events: (eventsCount as any)?.count || 0,
            }
        }, 200, corsHdrs);

    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}
