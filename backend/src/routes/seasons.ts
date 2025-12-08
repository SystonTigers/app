import { json } from "../services/util";
import { requireJWT } from "../services/auth";

// List all seasons for tenant
export async function handleListSeasons(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            "SELECT * FROM seasons WHERE tenant_id = ? ORDER BY start_date DESC"
        ).bind(claims.tenantId).all();

        return json({ success: true, data: result.results || [] }, 200, corsHdrs);
    } catch (err) {
        console.error('List seasons error:', err);
        return json({ success: false, error: "Failed to list seasons" }, 500, corsHdrs);
    }
}

// Create new season
export async function handleCreateSeason(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { name: string; startDate: string; endDate?: string; setCurrent?: boolean };

        const seasonId = crypto.randomUUID();
        const now = Date.now();

        // If setting as current, unset others first
        if (body.setCurrent) {
            await env.DB.prepare(
                "UPDATE seasons SET is_current = 0 WHERE tenant_id = ?"
            ).bind(claims.tenantId).run();
        }

        await env.DB.prepare(
            `INSERT INTO seasons (id, tenant_id, name, start_date, end_date, is_current, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`
        ).bind(
            seasonId,
            claims.tenantId,
            body.name,
            body.startDate,
            body.endDate || null,
            body.setCurrent ? 1 : 0,
            now
        ).run();

        return json({ success: true, id: seasonId }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Create season error:', err);
        if (err.message?.includes('UNIQUE')) {
            return json({ success: false, error: "Season with this name already exists" }, 400, corsHdrs);
        }
        return json({ success: false, error: "Failed to create season" }, 500, corsHdrs);
    }
}

// Set season as current
export async function handleSetCurrentSeason(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { seasonId: string };

        // Unset all others
        await env.DB.prepare(
            "UPDATE seasons SET is_current = 0 WHERE tenant_id = ?"
        ).bind(claims.tenantId).run();

        // Set requested season as current
        await env.DB.prepare(
            "UPDATE seasons SET is_current = 1 WHERE id = ? AND tenant_id = ?"
        ).bind(body.seasonId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Set current season error:', err);
        return json({ success: false, error: "Failed to set current season" }, 500, corsHdrs);
    }
}

// Archive a season
export async function handleArchiveSeason(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as { seasonId: string };

        await env.DB.prepare(
            "UPDATE seasons SET status = 'archived', is_current = 0 WHERE id = ? AND tenant_id = ?"
        ).bind(body.seasonId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Archive season error:', err);
        return json({ success: false, error: "Failed to archive season" }, 500, corsHdrs);
    }
}

// Get current season
export async function handleGetCurrentSeason(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        const season = await env.DB.prepare(
            "SELECT * FROM seasons WHERE tenant_id = ? AND is_current = 1"
        ).bind(claims.tenantId).first();

        return json({ success: true, data: season || null }, 200, corsHdrs);
    } catch (err) {
        console.error('Get current season error:', err);
        return json({ success: false, error: "Failed to get current season" }, 500, corsHdrs);
    }
}

// Add player to season roster
export async function handleAddPlayerToSeason(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as {
            seasonId: string;
            playerId: string;
            squadNumber?: number;
            position?: string;
            joinedDate?: string;
        };

        const id = crypto.randomUUID();

        await env.DB.prepare(
            `INSERT INTO player_seasons (id, tenant_id, season_id, player_id, squad_number, position, joined_date, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
             ON CONFLICT(season_id, player_id) DO UPDATE SET 
                squad_number = excluded.squad_number,
                position = excluded.position`
        ).bind(
            id,
            claims.tenantId,
            body.seasonId,
            body.playerId,
            body.squadNumber || null,
            body.position || null,
            body.joinedDate || null,
            Date.now()
        ).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Add player to season error:', err);
        return json({ success: false, error: "Failed to add player to season" }, 500, corsHdrs);
    }
}

// Get season roster
export async function handleGetSeasonRoster(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);

        const result = await env.DB.prepare(
            `SELECT ps.*, p.name, p.photo_url 
             FROM player_seasons ps
             LEFT JOIN squad p ON ps.player_id = p.id
             WHERE ps.season_id = ? AND ps.tenant_id = ?
             ORDER BY ps.squad_number ASC`
        ).bind(seasonId, claims.tenantId).all();

        return json({ success: true, data: result.results || [] }, 200, corsHdrs);
    } catch (err) {
        console.error('Get season roster error:', err);
        return json({ success: false, error: "Failed to get roster" }, 500, corsHdrs);
    }
}

// --- Season Lifecycle Management ---

// Preview End Season Stats
export async function handleEndSeasonPreview(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);

        // 1. Get Season Info
        const season = await env.DB.prepare("SELECT * FROM seasons WHERE id = ? AND tenant_id = ?").bind(seasonId, claims.tenantId).first();
        if (!season) return json({ success: false, error: "Season not found" }, 404, corsHdrs);

        // 2. Calculate Team Stats (Matches)
        // Assuming matches have season_id. If not, filtered by date range of season.
        let matchQuery = "SELECT * FROM matches WHERE team_id = ? AND status IN ('completed', 'final')";
        const params: any[] = [claims.tenantId];

        if (season.start_date) {
            matchQuery += " AND date_utc >= ?";
            params.push(season.start_date);
        }
        if (season.end_date) { // In case it's already got an end date or we assume current date
            // If active, end date is now.
        }
        // Ideally matches have season_id column from Migration 015
        matchQuery += " AND season_id = ?";
        params.push(seasonId);

        // Fallback: If season_id null in matches, use date range. 
        // For now, assume migration worked and season_id is populated. 
        // Using strict season_id for accuracy.

        const matches = await env.DB.prepare(matchQuery).bind(...params).all();
        const matchResults = matches.results || [];

        // Calculate P-W-D-L from match results
        // Matches table might just have ID, we need scores from KV or columns. 
        // Stats service uses specific KV keys. 
        // Ideally we'd have result columns in SQL for aggregation.
        // Assuming we need to fetch KV for scores as per stats.ts logic.

        let stats = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, cleanSheets: 0 };

        for (const match of matchResults as any[]) {
            const matchData: any = await env.KV.get(`match:${claims.tenantId}:${match.id}`, 'json');
            if (matchData && matchData.home_score !== undefined && matchData.away_score !== undefined) {
                stats.played++;
                stats.goalsFor += matchData.home_score;
                stats.goalsAgainst += matchData.away_score;

                if (matchData.home_score > matchData.away_score) {
                    stats.won++;
                    stats.points += 3;
                } else if (matchData.home_score === matchData.away_score) {
                    stats.drawn++;
                    stats.points += 1;
                } else {
                    stats.lost++;
                }

                if (matchData.away_score === 0) stats.cleanSheets++;
            }
        }
        stats.goalDifference = stats.goalsFor - stats.goalsAgainst;

        // 3. Calculate Player Stats (Top Scorer, Assister, Appearances)
        // We query events joined with matches of this season
        const events = await env.DB.prepare(`
            SELECT e.player_id, e.type, p.name
            FROM events e
            JOIN matches m ON e.match_id = m.id
            LEFT JOIN squad p ON e.player_id = p.id
            WHERE m.season_id = ? AND m.team_id = ?
        `).bind(seasonId, claims.tenantId).all();

        const playerStats = new Map<string, { name: string, goals: number, assists: number, appearances: number }>();
        // Note: appearance counting via events is tricky (need lineup data). 
        // Using events 'goal' | 'assist' for now. Lineup might be in KV.

        const eventList = events.results || [];
        for (const ev of eventList as any[]) {
            if (!ev.player_id) continue;
            if (!playerStats.has(ev.player_id)) {
                playerStats.set(ev.player_id, { name: ev.name || 'Unknown', goals: 0, assists: 0, appearances: 0 });
            }
            const ps = playerStats.get(ev.player_id)!;
            if (ev.type === 'goal') ps.goals++;
            if (ev.type === 'assist') ps.assists++;
        }

        // Convert to array and sort
        const players = Array.from(playerStats.values());
        const topScorer = [...players].sort((a, b) => b.goals - a.goals)[0] || null;
        const topAssister = [...players].sort((a, b) => b.assists - a.assists)[0] || null;

        // Return summary
        return json({
            success: true,
            season,
            summary: stats,
            topScorer,
            topAssister,
            matchCount: matchResults.length
        }, 200, corsHdrs);

    } catch (err: any) {
        console.error('End Season Preview Error:', err);
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// End/Archive Season
export async function handleEndSeason(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;
        // body: { awards: [{ type, playerId, notes... }], confirmName: string }

        // 1. Verify Season
        const season = await env.DB.prepare("SELECT * FROM seasons WHERE id = ? AND tenant_id = ?").bind(seasonId, claims.tenantId).first();
        if (!season) return json({ success: false, error: "Season not found" }, 404, corsHdrs);
        // 2. Snapshot Stats
        const stats = await calculateSeasonStats(env, seasonId, claims.tenantId, season);

        await env.DB.prepare(`
            INSERT INTO season_snapshots (id, tenant_id, season_id, snapshot_type, data, created_at)
            VALUES (?, ?, ?, 'stats', ?, ?)
        `).bind(crypto.randomUUID(), claims.tenantId, seasonId, JSON.stringify(stats), Date.now()).run();

        // 3. Store Awards
        if (body.awards && Array.isArray(body.awards)) {
            const stmt = env.DB.prepare(`
                INSERT INTO season_awards (id, tenant_id, season_id, award_type, award_name, player_id, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const batch = body.awards.map((award: any) => stmt.bind(
                crypto.randomUUID(),
                claims.tenantId,
                seasonId,
                award.type,
                award.customName || null,
                award.playerId,
                award.notes || null,
                Date.now()
            ));
            await env.DB.batch(batch);
        }

        // 4. Archive Season
        await env.DB.prepare(`
            UPDATE seasons 
            SET status = 'archived', is_current = 0, end_date = ?, archived_at = ?
            WHERE id = ?
        `).bind(new Date().toISOString().split('T')[0], Date.now(), seasonId).run();

        return json({ success: true }, 200, corsHdrs);

    } catch (err: any) {
        console.error('End Season Error:', err);
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}


// Start New Season Wizard
export async function handleStartNewSeason(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;
        // body: { name, startDate, competition, ageGroup, squadOption: 'carry_all'|'fresh'|'selective', selectedPlayerIds: [] }

        // Start Transaction ideally
        const seasonId = crypto.randomUUID();
        const now = Date.now();

        // 1. Create Season
        await env.DB.prepare(`
            INSERT INTO seasons (id, tenant_id, name, start_date, competition, age_group, is_current, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, 'active', ?)
        `).bind(
            seasonId, claims.tenantId, body.name, body.startDate,
            body.competition || null, body.ageGroup || null,
            now
        ).run();

        // 2. Unset other current seasons
        await env.DB.prepare("UPDATE seasons SET is_current = 0 WHERE tenant_id = ? AND id != ?").bind(claims.tenantId, seasonId).run();

        // 3. Handle Squad Carryover
        if (body.squadOption === 'carry_all') {
            // Copy all from squad table
            const squad = await env.DB.prepare("SELECT id FROM squad WHERE tenant_id = ?").bind(claims.tenantId).all();
            if (squad.results && squad.results.length > 0) {
                const stmt = env.DB.prepare(`
                    INSERT INTO player_seasons (id, tenant_id, season_id, player_id, created_at)
                    VALUES (?, ?, ?, ?, ?)
                 `);
                const batch = squad.results.map((p: any) => stmt.bind(
                    crypto.randomUUID(), claims.tenantId, seasonId, p.id, now
                ));
                await env.DB.batch(batch);
            }
        } else if (body.squadOption === 'selective' && body.selectedPlayerIds?.length) {
            const stmt = env.DB.prepare(`
                INSERT INTO player_seasons (id, tenant_id, season_id, player_id, created_at)
                VALUES (?, ?, ?, ?, ?)
            `);
            const batch = body.selectedPlayerIds.map((pid: string) => stmt.bind(
                crypto.randomUUID(), claims.tenantId, seasonId, pid, now
            ));
            await env.DB.batch(batch);
        }

        return json({ success: true, id: seasonId }, 200, corsHdrs);

    } catch (err: any) {
        console.error('Start Season Error:', err);
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// Reopen Season (Undo Archive)
export async function handleReopenSeason(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);

        // Check 24 hour window
        const season = await env.DB.prepare("SELECT archived_at FROM seasons WHERE id = ?").bind(seasonId).first();
        if (!season) return json({ success: false, error: "Season not found" }, 404, corsHdrs);

        const archivedAt = season.archived_at;
        const limit = 24 * 60 * 60 * 1000;
        if (Date.now() - archivedAt > limit) {
            return json({ success: false, error: "Cannot reopen season after 24 hours" }, 400, corsHdrs);
        }

        await env.DB.prepare("UPDATE seasons SET status = 'active', archived_at = NULL WHERE id = ?").bind(seasonId).run();
        return json({ success: true }, 200, corsHdrs);

    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

// Season Awards CRUD
export async function handleGetSeasonAwards(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);
        const awards = await env.DB.prepare(`
            SELECT sa.*, p.name as player_name, p.photo_url
            FROM season_awards sa
            JOIN squad p ON sa.player_id = p.id
            WHERE sa.season_id = ? AND sa.tenant_id = ?
        `).bind(seasonId, claims.tenantId).all();

        return json({ success: true, data: awards.results || [] }, 200, corsHdrs);
    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

export async function handleAddSeasonAward(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as any;

        const id = crypto.randomUUID();
        await env.DB.prepare(`
            INSERT INTO season_awards (id, tenant_id, season_id, award_type, award_name, player_id, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, claims.tenantId, seasonId, body.type, body.customName || null,
            body.playerId, body.notes || null, Date.now()
        ).run();

        return json({ success: true, id }, 200, corsHdrs);
    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}

export async function handleDeleteSeasonAward(req: Request, env: any, corsHdrs: Headers, awardId: string) {
    try {
        const claims = await requireJWT(req, env);
        await env.DB.prepare("DELETE FROM season_awards WHERE id = ? AND tenant_id = ?").bind(awardId, claims.tenantId).run();
        return json({ success: true }, 200, corsHdrs);
    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}


// Helper for stats calc
async function calculateSeasonStats(env: any, seasonId: string, tenantId: string, season: any) {
    let matchQuery = "SELECT * FROM matches WHERE team_id = ? AND status IN ('completed', 'final')";
    const params: any[] = [tenantId];

    if (season.start_date) {
        matchQuery += " AND date_utc >= ?";
        params.push(season.start_date);
    }
    matchQuery += " AND season_id = ?";
    params.push(seasonId);

    const matches = await env.DB.prepare(matchQuery).bind(...params).all();
    const matchResults = matches.results || [];

    let stats = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, cleanSheets: 0 };

    for (const match of matchResults as any[]) {
        const matchData: any = await env.KV.get(`match:${tenantId}:${match.id}`, 'json');
        if (matchData && matchData.home_score !== undefined && matchData.away_score !== undefined) {
            stats.played++;
            stats.goalsFor += matchData.home_score;
            stats.goalsAgainst += matchData.away_score;

            if (matchData.home_score > matchData.away_score) {
                stats.won++;
                stats.points += 3;
            } else if (matchData.home_score === matchData.away_score) {
                stats.drawn++;
                stats.points += 1;
            } else {
                stats.lost++;
            }

            if (matchData.away_score === 0) stats.cleanSheets++;
        }
    }
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst;

    const events = await env.DB.prepare(`
        SELECT e.player_id, e.type, p.name
        FROM events e
        JOIN matches m ON e.match_id = m.id
        LEFT JOIN squad p ON e.player_id = p.id
        WHERE m.season_id = ? AND m.team_id = ?
    `).bind(seasonId, tenantId).all();

    const playerStats = new Map<string, { name: string, goals: number, assists: number }>();
    const eventList = events.results || [];
    for (const ev of eventList as any[]) {
        if (!ev.player_id) continue;
        if (!playerStats.has(ev.player_id)) {
            playerStats.set(ev.player_id, { name: ev.name || 'Unknown', goals: 0, assists: 0 });
        }
        const ps = playerStats.get(ev.player_id)!;
        if (ev.type === 'goal') ps.goals++;
        if (ev.type === 'assist') ps.assists++;
    }

    const players = Array.from(playerStats.values());
    const topScorer = [...players].sort((a, b) => b.goals - a.goals)[0] || null;
    const topAssister = [...players].sort((a, b) => b.assists - a.assists)[0] || null;

    return {
        summary: stats,
        topScorer,
        topAssister,
        matchCount: matchResults.length
    };
}

export async function handleGetSeasonStats(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const url = new URL(req.url);
        let tenantId = url.searchParams.get('tenant');
        if (!tenantId) {
            try {
                const claims = await requireJWT(req, env);
                tenantId = claims.tenantId;
            } catch (e) {
                return json({ success: false, error: "Missing tenant" }, 401, corsHdrs);
            }
        }

        const season = await env.DB.prepare("SELECT * FROM seasons WHERE id = ? AND tenant_id = ?").bind(seasonId, tenantId).first();
        if (!season) return json({ success: false, error: "Season not found" }, 404, corsHdrs);

        if (season.status === 'archived') {
            const snapshot = await env.DB.prepare("SELECT data FROM season_snapshots WHERE season_id = ? AND snapshot_type = 'stats'").bind(seasonId).first();
            if (snapshot && snapshot.data) {
                const data = JSON.parse(snapshot.data);
                return json({
                    success: true,
                    season,
                    summary: data.summary,
                    topScorer: data.topScorer,
                    topAssister: data.topAssister,
                    matchCount: data.matchCount,
                    isFrozen: true
                }, 200, corsHdrs);
            }
        }

        const stats = await calculateSeasonStats(env, seasonId, tenantId!, season);
        return json({
            success: true,
            season,
            summary: stats.summary,
            topScorer: stats.topScorer,
            topAssister: stats.topAssister,
            matchCount: stats.matchCount,
            isFrozen: false
        }, 200, corsHdrs);

    } catch (err: any) {
        return json({ success: false, error: err.message }, 500, corsHdrs);
    }
}
