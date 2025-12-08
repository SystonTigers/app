import { json } from "../services/util";
import { requireJWT } from "../services/auth";

/**
 * CSV Import endpoints for historical data
 * Supports: fixtures, results, players, match_events
 */

// Parse CSV string to array of objects
function parseCSV(csvText: string): any[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));

    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row: any = {};
            headers.forEach((header, index) => {
                row[header] = values[index].trim();
            });
            data.push(row);
        }
    }

    return data;
}

// Parse a single CSV line (handles quoted values with commas)
function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);

    return values.map(v => v.replace(/^"|"$/g, ''));
}

// POST /api/v1/import/fixtures - Import fixtures from CSV
export async function handleImportFixtures(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return json({ success: false, error: "No file provided" }, 400, corsHdrs);
        }

        const csvText = await file.text();
        const rows = parseCSV(csvText);

        if (rows.length === 0) {
            return json({ success: false, error: "No valid data rows found" }, 400, corsHdrs);
        }

        // Expected columns: date, time, opponent, venue, competition, home_away, status
        let imported = 0;
        let errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                if (!row.date || !row.opponent) {
                    errors.push(`Row ${i + 2}: Missing required fields (date, opponent)`);
                    continue;
                }

                const id = crypto.randomUUID();
                await env.DB.prepare(`
                    INSERT INTO fixtures (id, tenant_id, fixture_date, kick_off_time, opponent, venue, competition, is_home, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id,
                    tenant,
                    row.date,
                    row.time || row.kick_off_time || 'TBC',
                    row.opponent,
                    row.venue || 'TBC',
                    row.competition || 'League',
                    (row.home_away || row.is_home || 'home').toLowerCase() === 'home' ? 1 : 0,
                    row.status || 'scheduled'
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
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
            message: `Imported ${imported} of ${rows.length} fixtures`
        }, 200, corsHdrs);

    } catch (err) {
        console.error('Import fixtures error:', err);
        return json({ success: false, error: "Failed to import fixtures" }, 500, corsHdrs);
    }
}

// POST /api/v1/import/results - Import results from CSV
export async function handleImportResults(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return json({ success: false, error: "No file provided" }, 400, corsHdrs);
        }

        const csvText = await file.text();
        const rows = parseCSV(csvText);

        if (rows.length === 0) {
            return json({ success: false, error: "No valid data rows found" }, 400, corsHdrs);
        }

        // Expected columns: date, opponent, our_score, their_score, venue, competition, scorers
        let imported = 0;
        let errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                if (!row.date || !row.opponent) {
                    errors.push(`Row ${i + 2}: Missing required fields (date, opponent)`);
                    continue;
                }

                const id = crypto.randomUUID();
                await env.DB.prepare(`
                    INSERT INTO team_results (id, tenant_id, match_date, opponent, our_score, their_score, venue, competition, scorers)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id,
                    tenant,
                    row.date,
                    row.opponent,
                    parseInt(row.our_score || row.score_for || '0') || 0,
                    parseInt(row.their_score || row.score_against || '0') || 0,
                    row.venue || 'Unknown',
                    row.competition || 'League',
                    row.scorers || ''
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
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
            message: `Imported ${imported} of ${rows.length} results`
        }, 200, corsHdrs);

    } catch (err) {
        console.error('Import results error:', err);
        return json({ success: false, error: "Failed to import results" }, 500, corsHdrs);
    }
}

// POST /api/v1/import/players - Import players from CSV
export async function handleImportPlayers(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return json({ success: false, error: "No file provided" }, 400, corsHdrs);
        }

        const csvText = await file.text();
        const rows = parseCSV(csvText);

        if (rows.length === 0) {
            return json({ success: false, error: "No valid data rows found" }, 400, corsHdrs);
        }

        // Expected columns: name, number, position, birthday, goals, assists, appearances, yellow_cards, red_cards
        let imported = 0;
        let errors: string[] = [];
        const importedPlayers: any[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                if (!row.name) {
                    errors.push(`Row ${i + 2}: Missing required field (name)`);
                    continue;
                }

                const id = crypto.randomUUID();
                const player = {
                    id,
                    tenant_id: tenant,
                    name: row.name,
                    number: parseInt(row.number || row.squad_number || '0') || null,
                    position: row.position || 'Unknown',
                    birthday: row.birthday || row.dob || null,
                    goals: parseInt(row.goals || '0') || 0,
                    assists: parseInt(row.assists || '0') || 0,
                    appearances: parseInt(row.appearances || row.apps || '0') || 0,
                    yellow_cards: parseInt(row.yellow_cards || row.yellows || '0') || 0,
                    red_cards: parseInt(row.red_cards || row.reds || '0') || 0,
                    created_at: Date.now(),
                };

                await env.DB.prepare(`
                    INSERT INTO squad_players (id, tenant_id, name, number, position, birthday, goals, assists, appearances, yellow_cards, red_cards, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    player.id, player.tenant_id, player.name, player.number, player.position,
                    player.birthday, player.goals, player.assists, player.appearances,
                    player.yellow_cards, player.red_cards, player.created_at
                ).run();

                importedPlayers.push(player);
                imported++;
            } catch (err: any) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }

        // Update KV squad list
        if (importedPlayers.length > 0) {
            const existingSquad = await env.KV_IDEMP.get(`squad:${tenant}:list`, 'json') as any[] || [];
            const updatedSquad = [...existingSquad, ...importedPlayers];
            await env.KV_IDEMP.put(`squad:${tenant}:list`, JSON.stringify(updatedSquad));
        }

        return json({
            success: true,
            imported,
            total: rows.length,
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
            message: `Imported ${imported} of ${rows.length} players`
        }, 200, corsHdrs);

    } catch (err) {
        console.error('Import players error:', err);
        return json({ success: false, error: "Failed to import players" }, 500, corsHdrs);
    }
}

// POST /api/v1/import/match_events - Import match events (goals, assists, cards) from CSV
export async function handleImportMatchEvents(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return json({ success: false, error: "No file provided" }, 400, corsHdrs);
        }

        const csvText = await file.text();
        const rows = parseCSV(csvText);

        if (rows.length === 0) {
            return json({ success: false, error: "No valid data rows found" }, 400, corsHdrs);
        }

        // Expected columns: fixture_id, player_id (or player_name), event_type, minute
        let imported = 0;
        let errors: string[] = [];

        // Get player lookup map if using names
        const playersResult = await env.DB.prepare(
            `SELECT id, name FROM squad_players WHERE tenant_id = ?`
        ).bind(tenant).all();
        const playerByName: Record<string, string> = {};
        for (const p of (playersResult.results || []) as any[]) {
            playerByName[p.name.toLowerCase()] = p.id;
        }

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            try {
                if (!row.event_type) {
                    errors.push(`Row ${i + 2}: Missing required field (event_type)`);
                    continue;
                }

                // Resolve player ID
                let playerId = row.player_id;
                if (!playerId && row.player_name) {
                    playerId = playerByName[row.player_name.toLowerCase()];
                    if (!playerId) {
                        errors.push(`Row ${i + 2}: Player not found: ${row.player_name}`);
                        continue;
                    }
                }

                if (!playerId) {
                    errors.push(`Row ${i + 2}: Missing player_id or player_name`);
                    continue;
                }

                const id = crypto.randomUUID();
                await env.DB.prepare(`
                    INSERT INTO match_events (id, tenant_id, fixture_id, player_id, event_type, minute, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id,
                    tenant,
                    row.fixture_id || row.match_id || null,
                    playerId,
                    row.event_type.toLowerCase(), // goal, assist, yellow_card, red_card, motm
                    parseInt(row.minute || '0') || null,
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
            errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
            message: `Imported ${imported} of ${rows.length} match events`
        }, 200, corsHdrs);

    } catch (err) {
        console.error('Import match events error:', err);
        return json({ success: false, error: "Failed to import match events" }, 500, corsHdrs);
    }
}

// GET /api/v1/import/template/:type - Download CSV template
export async function handleGetImportTemplate(req: Request, env: any, corsHdrs: Headers, type: string) {
    const templates: Record<string, { headers: string; example: string }> = {
        fixtures: {
            headers: 'date,time,opponent,venue,competition,home_away,status',
            example: '2024-01-15,14:00,Rival FC,Home Ground,League,home,scheduled',
        },
        results: {
            headers: 'date,opponent,our_score,their_score,venue,competition,scorers',
            example: '2024-01-08,Old Rivals,3,1,Home Ground,League,John Smith (2); Mike Jones',
        },
        players: {
            headers: 'name,number,position,birthday,goals,assists,appearances,yellow_cards,red_cards',
            example: 'John Smith,10,Midfielder,2010-05-15,5,3,12,1,0',
        },
        match_events: {
            headers: 'fixture_id,player_name,event_type,minute',
            example: 'abc123,John Smith,goal,45',
        },
    };

    const template = templates[type];
    if (!template) {
        return json({ success: false, error: `Unknown template type: ${type}` }, 400, corsHdrs);
    }

    const csv = `${template.headers}\n${template.example}`;

    const headers = new Headers(corsHdrs);
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="${type}_template.csv"`);

    return new Response(csv, { status: 200, headers });
}

// GET /api/v1/import/status - Get import history/status
export async function handleGetImportStatus(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        // Get counts for each type
        const [fixtures, results, players, events] = await Promise.all([
            env.DB.prepare('SELECT COUNT(*) as count FROM fixtures WHERE tenant_id = ?').bind(tenant).first(),
            env.DB.prepare('SELECT COUNT(*) as count FROM team_results WHERE tenant_id = ?').bind(tenant).first(),
            env.DB.prepare('SELECT COUNT(*) as count FROM squad_players WHERE tenant_id = ?').bind(tenant).first(),
            env.DB.prepare('SELECT COUNT(*) as count FROM match_events WHERE tenant_id = ?').bind(tenant).first(),
        ]);

        return json({
            success: true,
            data: {
                fixtures: fixtures?.count || 0,
                results: results?.count || 0,
                players: players?.count || 0,
                match_events: events?.count || 0,
            }
        }, 200, corsHdrs);

    } catch (err) {
        return json({ success: false, error: "Failed to get import status" }, 500, corsHdrs);
    }
}
