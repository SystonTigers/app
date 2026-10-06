import { json } from "../services/util";
import { requireJWT } from "../services/auth";
import { resolveSeason } from "../services/seasons/range";
import { readAwards, seasonReview } from "../services/seasons/review";

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

// ============================================
// END SEASON FLOW
// ============================================

// Get end season preview - summary stats before archiving
export async function handleEndSeasonPreview(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);
        const season = await env.DB.prepare("SELECT * FROM seasons WHERE id = ? AND tenant_id = ?").bind(seasonId, claims.tenantId).first();
        if (!season) {
            return json({ success: false, error: "Season not found" }, 404, corsHdrs);
        }
        if (season.status === 'archived') {
            return json({ success: false, error: "That season has already ended." }, 400, corsHdrs);
        }
        const range = await resolveSeason(env, claims.tenantId!, seasonId);
        if (!range) return json({ success: false, error: "Season not found" }, 404, corsHdrs);
        const review = await seasonReview(env, claims.tenantId!, range);
        const { players: _players, ...rest } = review;
        // The fields at the top level too, for the website's End season dialog
        return json({ success: true, data: { season, ...rest }, season, ...rest }, 200, corsHdrs);
    } catch (err) {
        console.error('End season preview error:', err);
        return json({ success: false, error: "We couldn't load this season's stats. Please try again." }, 500, corsHdrs);
    }
}

// End season - archive with snapshots and optional awards
export async function handleEndSeason(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId!;
        const body = (await req.json().catch(() => ({}))) as { awards?: unknown; notes?: unknown; confirmName?: unknown };

        const season = await env.DB.prepare("SELECT * FROM seasons WHERE id = ? AND tenant_id = ?").bind(seasonId, tenantId).first();
        if (!season) {
            return json({ success: false, error: "Season not found" }, 404, corsHdrs);
        }
        if (season.status === 'archived') {
            return json({ success: false, error: "That season has already ended." }, 400, corsHdrs);
        }
        // Optional extra check: if a name is sent it must be this season's
        if (typeof body.confirmName === 'string' && body.confirmName.trim() && body.confirmName.trim() !== season.name) {
            return json({ success: false, error: "That name doesn't match the season." }, 400, corsHdrs);
        }
        const awards = readAwards(body.awards);
        const squad = await env.DB.prepare("SELECT id FROM squad WHERE tenant_id = ?").bind(tenantId).all();
        const squadIds = new Set(((squad.results || []) as Array<{ id: string }>).map((r) => r.id));
        if (awards.some((a) => !squadIds.has(a.playerId))) {
            return json({ success: false, error: "One of the award winners isn't in the squad any more. Pick them again." }, 400, corsHdrs);
        }

        const range = await resolveSeason(env, tenantId, seasonId);
        if (!range) return json({ success: false, error: "Season not found" }, 404, corsHdrs);
        const review = await seasonReview(env, tenantId, range);
        const now = Date.now();
        const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 500) : null;
        const snapshot = (type: string, data: unknown) => env.DB.prepare(
            `INSERT INTO season_snapshots (id, tenant_id, season_id, snapshot_type, data, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(crypto.randomUUID(), tenantId, seasonId, type, JSON.stringify(data), now);
        const award = (type: string, name: string | null, playerId: string, note: string | null) => env.DB.prepare(
            `INSERT INTO season_awards (id, tenant_id, season_id, award_type, award_name, player_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(crypto.randomUUID(), tenantId, seasonId, type, name, playerId, note, now);

        const types = new Set(awards.map((a) => a.awardType));
        const league = await env.DB.prepare(`SELECT * FROM league_standings WHERE tenant_id = ? ORDER BY position ASC`).bind(tenantId).all();
        const statements = [
            env.DB.prepare(`DELETE FROM season_snapshots WHERE season_id = ? AND tenant_id = ?`).bind(seasonId, tenantId),
            snapshot('team_record', review.summary),
            snapshot('player_stats', review.players.map((p) => ({
                player_id: p.id, player_name: p.name, appearances: p.appearances, goals: p.goals, assists: p.assists,
                yellow_cards: p.yellowCards, red_cards: p.redCards, motm_count: p.motmCount,
            }))),
            snapshot('top_performers', { topScorer: review.topScorer, topAssister: review.topAssister, motmLeader: review.motmLeader, mostAppearances: review.mostAppearances }),
            snapshot('league_position', league.results || []),
            ...awards.map((a) => award(a.awardType, a.name, a.playerId, a.notes)),
            // Top scorer and most assists are added automatically unless given
            ...(!types.has('top_scorer') && review.topScorer ? [award('top_scorer', null, review.topScorer.playerId, `${review.topScorer.goals} goals`)] : []),
            ...(!types.has('most_assists') && review.topAssister ? [award('most_assists', null, review.topAssister.playerId, `${review.topAssister.assists} assists`)] : []),
            env.DB.prepare(
                `UPDATE seasons SET status = 'archived', is_current = 0, archived_at = ?, notes = ?, end_date = COALESCE(end_date, ?) WHERE id = ? AND tenant_id = ?`,
            ).bind(now, notes, new Date().toISOString().slice(0, 10), seasonId, tenantId),
        ];
        await env.DB.batch(statements);

        return json({ success: true, message: "Season ended", summary: review.summary }, 200, corsHdrs);
    } catch (err) {
        console.error('End season error:', err);
        return json({ success: false, error: "The season wasn't ended. Please try again." }, 500, corsHdrs);
    }
}

// Reopen a recently archived season (within 24 hours)
export async function handleReopenSeason(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);

        // Get season details
        const season = await env.DB.prepare(
            "SELECT * FROM seasons WHERE id = ? AND tenant_id = ?"
        ).bind(seasonId, claims.tenantId).first();

        if (!season) {
            return json({ success: false, error: "Season not found" }, 404, corsHdrs);
        }

        if (season.status !== 'archived') {
            return json({ success: false, error: "That season is still open." }, 400, corsHdrs);
        }

        // Check 24-hour window
        const now = Date.now();
        const archivedAt = season.archived_at || 0;
        const hoursSinceArchive = (now - archivedAt) / (1000 * 60 * 60);

        if (hoursSinceArchive > 24) {
            return json({
                success: false,
                error: "A season can only be reopened within a day of ending it."
            }, 400, corsHdrs);
        }

        // Delete snapshots
        await env.DB.prepare(
            "DELETE FROM season_snapshots WHERE season_id = ? AND tenant_id = ?"
        ).bind(seasonId, claims.tenantId).run();

        // Delete auto-generated awards (keep manually added ones? For now delete all)
        await env.DB.prepare(
            "DELETE FROM season_awards WHERE season_id = ? AND tenant_id = ?"
        ).bind(seasonId, claims.tenantId).run();

        // Reopen season
        await env.DB.prepare(
            `UPDATE seasons SET
                status = 'active',
                archived_at = NULL,
                end_date = NULL
             WHERE id = ? AND tenant_id = ?`
        ).bind(seasonId, claims.tenantId).run();

        return json({
            success: true,
            message: "Season reopened successfully"
        }, 200, corsHdrs);
    } catch (err) {
        console.error('Reopen season error:', err);
        return json({ success: false, error: "Failed to reopen season" }, 500, corsHdrs);
    }
}

// ============================================
// START NEW SEASON FLOW
// ============================================

// Start a new season with squad options
export async function handleStartNewSeason(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as {
            name: string;
            startDate: string;
            competition?: string;
            ageGroup?: string;
            squadOption: 'carryover' | 'fresh' | 'selective';
            selectedPlayerIds?: string[];
        };

        // Validate required fields
        if (!body.name || !body.startDate) {
            return json({ success: false, error: "Name and start date are required" }, 400, corsHdrs);
        }

        // Check for existing season with same name
        const existing = await env.DB.prepare(
            "SELECT id FROM seasons WHERE tenant_id = ? AND name = ?"
        ).bind(claims.tenantId, body.name).first();

        if (existing) {
            return json({ success: false, error: "A season with this name already exists" }, 400, corsHdrs);
        }

        // Get current season for squad carryover
        const currentSeason = await env.DB.prepare(
            "SELECT id FROM seasons WHERE tenant_id = ? AND is_current = 1"
        ).bind(claims.tenantId).first();

        const now = Date.now();
        const newSeasonId = crypto.randomUUID();

        // Unset current season
        await env.DB.prepare(
            "UPDATE seasons SET is_current = 0 WHERE tenant_id = ?"
        ).bind(claims.tenantId).run();

        // Create new season
        await env.DB.prepare(
            `INSERT INTO seasons (id, tenant_id, name, start_date, is_current, status, competition, age_group, created_at)
             VALUES (?, ?, ?, ?, 1, 'active', ?, ?, ?)`
        ).bind(
            newSeasonId,
            claims.tenantId,
            body.name,
            body.startDate,
            body.competition || null,
            body.ageGroup || null,
            now
        ).run();

        // Handle squad based on option
        let playersAdded = 0;

        if (body.squadOption === 'carryover' && currentSeason) {
            // Get all active players from previous season
            const previousPlayers = await env.DB.prepare(
                `SELECT player_id, squad_number, position
                 FROM player_seasons
                 WHERE season_id = ? AND tenant_id = ? AND status = 'active'`
            ).bind(currentSeason.id, claims.tenantId).all();

            for (const player of (previousPlayers.results || []) as any[]) {
                await env.DB.prepare(
                    `INSERT INTO player_seasons (id, tenant_id, season_id, player_id, squad_number, position, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`
                ).bind(
                    crypto.randomUUID(),
                    claims.tenantId,
                    newSeasonId,
                    player.player_id,
                    player.squad_number,
                    player.position,
                    now
                ).run();
                playersAdded++;
            }
        } else if (body.squadOption === 'selective' && body.selectedPlayerIds && body.selectedPlayerIds.length > 0) {
            // Get details of selected players from current squad
            for (const playerId of body.selectedPlayerIds) {
                const player = await env.DB.prepare(
                    `SELECT ps.squad_number, ps.position
                     FROM player_seasons ps
                     WHERE ps.player_id = ? AND ps.tenant_id = ? AND ps.status = 'active'
                     ORDER BY ps.created_at DESC LIMIT 1`
                ).bind(playerId, claims.tenantId).first();

                await env.DB.prepare(
                    `INSERT INTO player_seasons (id, tenant_id, season_id, player_id, squad_number, position, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`
                ).bind(
                    crypto.randomUUID(),
                    claims.tenantId,
                    newSeasonId,
                    playerId,
                    player?.squad_number || null,
                    player?.position || null,
                    now
                ).run();
                playersAdded++;
            }
        }
        // 'fresh' option = don't add any players

        return json({
            success: true,
            seasonId: newSeasonId,
            playersAdded,
            message: `New season "${body.name}" created with ${playersAdded} players`
        }, 200, corsHdrs);
    } catch (err: any) {
        console.error('Start new season error:', err);
        if (err.message?.includes('UNIQUE')) {
            return json({ success: false, error: "Season with this name already exists" }, 400, corsHdrs);
        }
        return json({ success: false, error: "Failed to start new season" }, 500, corsHdrs);
    }
}

// Get available players for selective squad setup
export async function handleGetAvailablePlayers(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        // Get current season
        const currentSeason = await env.DB.prepare(
            "SELECT id FROM seasons WHERE tenant_id = ? AND is_current = 1"
        ).bind(claims.tenantId).first();

        if (!currentSeason) {
            // No current season, get all squad players
            const players = await env.DB.prepare(
                `SELECT id, name, photo_url, position FROM squad WHERE tenant_id = ?`
            ).bind(claims.tenantId).all();

            return json({ success: true, data: players.results || [] }, 200, corsHdrs);
        }

        // Get players from current season
        const players = await env.DB.prepare(
            `SELECT s.id, s.name, s.photo_url, ps.position, ps.squad_number, ps.status
             FROM squad s
             LEFT JOIN player_seasons ps ON s.id = ps.player_id AND ps.season_id = ?
             WHERE s.tenant_id = ?`
        ).bind(currentSeason.id, claims.tenantId).all();

        return json({ success: true, data: players.results || [] }, 200, corsHdrs);
    } catch (err) {
        console.error('Get available players error:', err);
        return json({ success: false, error: "Failed to get players" }, 500, corsHdrs);
    }
}

// ============================================
// SEASON AWARDS
// ============================================

// Get awards for a season
export async function handleGetSeasonAwards(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);

        const awards = await env.DB.prepare(
            `SELECT sa.*, s.name as player_name
             FROM season_awards sa
             LEFT JOIN squad s ON sa.player_id = s.id AND s.tenant_id = sa.tenant_id
             WHERE sa.season_id = ? AND sa.tenant_id = ?
             ORDER BY sa.created_at ASC`
        ).bind(seasonId, claims.tenantId).all();

        return json({ success: true, data: awards.results || [] }, 200, corsHdrs);
    } catch (err) {
        console.error('Get season awards error:', err);
        return json({ success: false, error: "Failed to get awards" }, 500, corsHdrs);
    }
}

// Add award to season
export async function handleAddSeasonAward(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);
        const [award] = readAwards([await req.json().catch(() => null)]);
        if (!award) return json({ success: false, error: "Name the award and pick who won it." }, 400, corsHdrs);
        const owned = await env.DB.prepare(
            `SELECT (SELECT 1 FROM seasons WHERE id = ? AND tenant_id = ?) AS season, (SELECT 1 FROM squad WHERE id = ? AND tenant_id = ?) AS player`,
        ).bind(seasonId, claims.tenantId, award.playerId, claims.tenantId).first();
        if (!owned?.season) return json({ success: false, error: "Season not found" }, 404, corsHdrs);
        if (!owned?.player) return json({ success: false, error: "That player isn't in the squad." }, 400, corsHdrs);

        const id = crypto.randomUUID();
        await env.DB.prepare(
            `INSERT INTO season_awards (id, tenant_id, season_id, award_type, award_name, player_id, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(id, claims.tenantId, seasonId, award.awardType, award.name, award.playerId, award.notes, Date.now()).run();

        return json({ success: true, id }, 200, corsHdrs);
    } catch (err) {
        console.error('Add season award error:', err);
        return json({ success: false, error: "Failed to add award" }, 500, corsHdrs);
    }
}

// Delete award from season
export async function handleDeleteSeasonAward(req: Request, env: any, corsHdrs: Headers, seasonId: string, awardId: string) {
    try {
        const claims = await requireJWT(req, env);

        await env.DB.prepare(
            "DELETE FROM season_awards WHERE id = ? AND season_id = ? AND tenant_id = ?"
        ).bind(awardId, seasonId, claims.tenantId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Delete season award error:', err);
        return json({ success: false, error: "Failed to delete award" }, 500, corsHdrs);
    }
}

// ============================================
// SEASON SNAPSHOTS
// ============================================

// Get snapshots for a season
export async function handleGetSeasonSnapshots(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);

        const snapshots = await env.DB.prepare(
            `SELECT * FROM season_snapshots WHERE season_id = ? AND tenant_id = ?`
        ).bind(seasonId, claims.tenantId).all();

        // Parse JSON data in snapshots
        const parsed = (snapshots.results || []).map((s: any) => ({
            ...s,
            data: JSON.parse(s.data)
        }));

        return json({ success: true, data: parsed }, 200, corsHdrs);
    } catch (err) {
        console.error('Get season snapshots error:', err);
        return json({ success: false, error: "Failed to get snapshots" }, 500, corsHdrs);
    }
}

// ============================================
// PLAYER DEPARTURES
// ============================================

// Mark player as departed from current season
export async function handleMarkPlayerDeparted(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as {
            playerId: string;
            departedDate?: string;
            reason?: string;
        };

        // Get current season
        const currentSeason = await env.DB.prepare(
            "SELECT id FROM seasons WHERE tenant_id = ? AND is_current = 1"
        ).bind(claims.tenantId).first();

        if (!currentSeason) {
            return json({ success: false, error: "No active season" }, 400, corsHdrs);
        }

        await env.DB.prepare(
            `UPDATE player_seasons
             SET status = 'departed', departed_date = ?, departure_reason = ?
             WHERE player_id = ? AND season_id = ? AND tenant_id = ?`
        ).bind(
            body.departedDate || new Date().toISOString().split('T')[0],
            body.reason || 'left_club',
            body.playerId,
            currentSeason.id,
            claims.tenantId
        ).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (err) {
        console.error('Mark player departed error:', err);
        return json({ success: false, error: "Failed to mark player as departed" }, 500, corsHdrs);
    }
}


/** A live season's numbers: results and stats by its dates, as everywhere else. */
async function calculateSeasonStats(env: any, seasonId: string, tenantId: string) {
    const range = await resolveSeason(env, tenantId, seasonId);
    if (!range) return { summary: null, topScorer: null, topAssister: null, matchCount: 0 };
    const { summary, topScorer, topAssister } = await seasonReview(env, tenantId, range);
    return { summary, topScorer, topAssister, matchCount: summary.played };
}

export async function handleGetSeasonStats(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        // The club comes from the login, never from the URL
        let tenantId: string | null;
        try {
            tenantId = (await requireJWT(req, env)).tenantId ?? null;
        } catch {
            return json({ success: false, error: "Please log in." }, 401, corsHdrs);
        }

        const season = await env.DB.prepare("SELECT * FROM seasons WHERE id = ? AND tenant_id = ?").bind(seasonId, tenantId).first();
        if (!season) { return json({ success: false, error: "Season not found" }, 404, corsHdrs); }

        if (season.status === 'archived') {
            const snapshot = await env.DB.prepare("SELECT data FROM season_snapshots WHERE season_id = ? AND tenant_id = ? AND snapshot_type = 'stats'").bind(seasonId, tenantId).first();
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

        const stats = await calculateSeasonStats(env, seasonId, tenantId || '');
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
