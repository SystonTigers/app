// Last Man Standing Game Routes
// Prediction game where users pick match winners - wrong picks eliminate them

import { json } from "../services/util";
import { requireJWT } from "../services/auth";

// Types
interface LMSGame {
    id: string;
    tenant_id: string;
    name: string;
    sport: string;
    competition?: string;
    competition_id?: string;
    status: 'active' | 'completed';
    round_number: number;
    winner_user_id?: string;
    winner_name?: string;
    created_at: number;
    updated_at?: number;
}

interface LMSRound {
    id: string;
    game_id: string;
    tenant_id: string;
    round_number: number;
    name?: string;
    deadline: number;
    status: 'open' | 'locked' | 'processed';
    fixtures_json?: string;
    created_at: number;
    processed_at?: number;
}

interface LMSEntry {
    id: string;
    game_id: string;
    tenant_id: string;
    user_id: string;
    user_name?: string;
    status: 'alive' | 'eliminated' | 'winner';
    eliminated_round?: number;
    teams_used: string; // JSON array
    streak: number;
    created_at: number;
}

interface Fixture {
    id: string;
    home: string;
    away: string;
    kickoff?: number;
    homeScore?: number;
    awayScore?: number;
}

interface CreateGameBody {
    name: string;
    sport?: string;
    competition?: string;
    competition_id?: string;
}

interface CreateRoundBody {
    game_id: string;
    name?: string;
    deadline?: number;
    fixtures: Fixture[];
}

interface SubmitPredictionBody {
    round_id: string;
    team_picked: string;
    fixture_id?: string;
}

interface ProcessRoundBody {
    fixtures: Array<{
        id: string;
        homeScore: number;
        awayScore: number;
    }>;
}

// ============ GAME HANDLERS ============

// Create a new LMS game (admin only)
export async function handleCreateLMSGame(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        // Check admin role
        if (!['admin', 'manager', 'coach'].includes(claims.role || '')) {
            return json({ success: false, error: "Admin access required" }, 403, corsHdrs);
        }

        const body = await req.json() as CreateGameBody;

        if (!body.name) {
            return json({ success: false, error: "Game name is required" }, 400, corsHdrs);
        }

        const gameId = crypto.randomUUID();
        const now = Date.now();

        await env.DB.prepare(`
            INSERT INTO lms_games (id, tenant_id, name, sport, competition, competition_id, status, round_number, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'active', 0, ?)
        `).bind(
            gameId,
            claims.tenantId,
            body.name,
            body.sport || 'football',
            body.competition || null,
            body.competition_id || null,
            now
        ).run();

        return json({
            success: true,
            game: {
                id: gameId,
                name: body.name,
                sport: body.sport || 'football',
                competition: body.competition,
                status: 'active',
                round_number: 0,
                created_at: now
            }
        }, 201, corsHdrs);
    } catch (err) {
        console.error('Create LMS game error:', err);
        return json({ success: false, error: "Failed to create game" }, 500, corsHdrs);
    }
}

// List games for tenant
export async function handleListLMSGames(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const status = url.searchParams.get('status'); // 'active' or 'completed'

        let query = "SELECT * FROM lms_games WHERE tenant_id = ?";
        const params: any[] = [claims.tenantId];

        if (status) {
            query += " AND status = ?";
            params.push(status);
        }

        query += " ORDER BY created_at DESC";

        const games = await env.DB.prepare(query).bind(...params).all();

        // Get entry counts for each game
        const gamesWithCounts = await Promise.all(
            (games.results || []).map(async (game: LMSGame) => {
                const counts = await env.DB.prepare(`
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'alive' THEN 1 ELSE 0 END) as alive
                    FROM lms_entries WHERE game_id = ? AND tenant_id = ?
                `).bind(game.id, claims.tenantId).first();

                return {
                    ...game,
                    total_entries: counts?.total || 0,
                    alive_entries: counts?.alive || 0
                };
            })
        );

        return json({ success: true, games: gamesWithCounts }, 200, corsHdrs);
    } catch (err) {
        console.error('List LMS games error:', err);
        return json({ success: false, error: "Failed to list games" }, 500, corsHdrs);
    }
}

// Get game details with standings
export async function handleGetLMSGame(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const gameId = url.pathname.split('/').pop();

        // Get game
        const game = await env.DB.prepare(
            "SELECT * FROM lms_games WHERE id = ? AND tenant_id = ?"
        ).bind(gameId, claims.tenantId).first();

        if (!game) {
            return json({ success: false, error: "Game not found" }, 404, corsHdrs);
        }

        // Get all entries (standings)
        const entries = await env.DB.prepare(`
            SELECT * FROM lms_entries 
            WHERE game_id = ? AND tenant_id = ?
            ORDER BY status ASC, streak DESC, created_at ASC
        `).bind(gameId, claims.tenantId).all();

        // Get current/latest round
        const currentRound = await env.DB.prepare(`
            SELECT * FROM lms_rounds 
            WHERE game_id = ? AND tenant_id = ?
            ORDER BY round_number DESC LIMIT 1
        `).bind(gameId, claims.tenantId).first();

        // Check if user has joined
        const userEntry = await env.DB.prepare(
            "SELECT * FROM lms_entries WHERE game_id = ? AND user_id = ?"
        ).bind(gameId, claims.sub).first();

        // Get user's prediction for current round if exists
        let userPrediction = null;
        if (userEntry && currentRound) {
            userPrediction = await env.DB.prepare(
                "SELECT * FROM lms_predictions WHERE entry_id = ? AND round_id = ?"
            ).bind(userEntry.id, currentRound.id).first();
        }

        return json({
            success: true,
            game,
            standings: (entries.results || []).map((e: LMSEntry) => ({
                ...e,
                teams_used: JSON.parse(e.teams_used || '[]')
            })),
            currentRound: currentRound ? {
                ...currentRound,
                fixtures: JSON.parse(currentRound.fixtures_json || '[]')
            } : null,
            userEntry: userEntry ? {
                ...userEntry,
                teams_used: JSON.parse(userEntry.teams_used || '[]')
            } : null,
            userPrediction
        }, 200, corsHdrs);
    } catch (err) {
        console.error('Get LMS game error:', err);
        return json({ success: false, error: "Failed to get game" }, 500, corsHdrs);
    }
}

// Join a game
export async function handleJoinLMSGame(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');
        const gameId = pathParts[pathParts.length - 2]; // /games/:id/join

        // Check game exists and is active
        const game = await env.DB.prepare(
            "SELECT * FROM lms_games WHERE id = ? AND tenant_id = ? AND status = 'active'"
        ).bind(gameId, claims.tenantId).first();

        if (!game) {
            return json({ success: false, error: "Game not found or not active" }, 404, corsHdrs);
        }

        // Check if already joined
        const existing = await env.DB.prepare(
            "SELECT id FROM lms_entries WHERE game_id = ? AND user_id = ?"
        ).bind(gameId, claims.sub).first();

        if (existing) {
            return json({ success: false, error: "Already joined this game" }, 400, corsHdrs);
        }

        const entryId = crypto.randomUUID();
        const now = Date.now();

        await env.DB.prepare(`
            INSERT INTO lms_entries (id, game_id, tenant_id, user_id, user_name, status, teams_used, streak, created_at)
            VALUES (?, ?, ?, ?, ?, 'alive', '[]', 0, ?)
        `).bind(
            entryId,
            gameId,
            claims.tenantId,
            claims.sub,
            claims.name || claims.email || 'Anonymous',
            now
        ).run();

        return json({
            success: true,
            entry: {
                id: entryId,
                game_id: gameId,
                status: 'alive',
                teams_used: [],
                streak: 0
            }
        }, 201, corsHdrs);
    } catch (err) {
        console.error('Join LMS game error:', err);
        return json({ success: false, error: "Failed to join game" }, 500, corsHdrs);
    }
}

// Reset game for new season (admin only)
export async function handleResetLMSGame(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        if (!['admin', 'manager', 'coach'].includes(claims.role || '')) {
            return json({ success: false, error: "Admin access required" }, 403, corsHdrs);
        }

        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');
        const gameId = pathParts[pathParts.length - 2]; // /games/:id/reset

        // Verify game belongs to tenant
        const game = await env.DB.prepare(
            "SELECT id FROM lms_games WHERE id = ? AND tenant_id = ?"
        ).bind(gameId, claims.tenantId).first();

        if (!game) {
            return json({ success: false, error: "Game not found" }, 404, corsHdrs);
        }

        // Reset all entries
        await env.DB.prepare(`
            UPDATE lms_entries 
            SET status = 'alive', eliminated_round = NULL, teams_used = '[]', streak = 0
            WHERE game_id = ? AND tenant_id = ?
        `).bind(gameId, claims.tenantId).run();

        // Delete all predictions
        await env.DB.prepare(`
            DELETE FROM lms_predictions 
            WHERE round_id IN (SELECT id FROM lms_rounds WHERE game_id = ?)
            AND tenant_id = ?
        `).bind(gameId, claims.tenantId).run();

        // Delete all rounds
        await env.DB.prepare(
            "DELETE FROM lms_rounds WHERE game_id = ? AND tenant_id = ?"
        ).bind(gameId, claims.tenantId).run();

        // Reset game state
        await env.DB.prepare(`
            UPDATE lms_games 
            SET status = 'active', round_number = 0, winner_user_id = NULL, winner_name = NULL, updated_at = ?
            WHERE id = ? AND tenant_id = ?
        `).bind(Date.now(), gameId, claims.tenantId).run();

        return json({ success: true, message: "Game reset successfully" }, 200, corsHdrs);
    } catch (err) {
        console.error('Reset LMS game error:', err);
        return json({ success: false, error: "Failed to reset game" }, 500, corsHdrs);
    }
}

// ============ ROUND HANDLERS ============

// Create a new round (admin only)
export async function handleCreateLMSRound(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        if (!['admin', 'manager', 'coach'].includes(claims.role || '')) {
            return json({ success: false, error: "Admin access required" }, 403, corsHdrs);
        }

        const body = await req.json() as CreateRoundBody;

        if (!body.game_id || !body.fixtures || body.fixtures.length === 0) {
            return json({ success: false, error: "Game ID and fixtures are required" }, 400, corsHdrs);
        }

        // Verify game exists
        const game = await env.DB.prepare(
            "SELECT * FROM lms_games WHERE id = ? AND tenant_id = ? AND status = 'active'"
        ).bind(body.game_id, claims.tenantId).first();

        if (!game) {
            return json({ success: false, error: "Game not found or completed" }, 404, corsHdrs);
        }

        // Check for open round
        const openRound = await env.DB.prepare(
            "SELECT id FROM lms_rounds WHERE game_id = ? AND status IN ('open', 'locked')"
        ).bind(body.game_id).first();

        if (openRound) {
            return json({ success: false, error: "Close current round before creating new one" }, 400, corsHdrs);
        }

        const roundId = crypto.randomUUID();
        const roundNumber = (game.round_number || 0) + 1;
        const now = Date.now();

        // Auto-set deadline to first kickoff if not provided
        let deadline = body.deadline;
        if (!deadline && body.fixtures.length > 0) {
            const kickoffs = body.fixtures
                .filter(f => f.kickoff)
                .map(f => f.kickoff!);
            if (kickoffs.length > 0) {
                deadline = Math.min(...kickoffs);
            } else {
                // Default: 7 days from now
                deadline = now + (7 * 24 * 60 * 60 * 1000);
            }
        }

        // Add IDs to fixtures if not present
        const fixturesWithIds = body.fixtures.map(f => ({
            ...f,
            id: f.id || crypto.randomUUID()
        }));

        await env.DB.prepare(`
            INSERT INTO lms_rounds (id, game_id, tenant_id, round_number, name, deadline, status, fixtures_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)
        `).bind(
            roundId,
            body.game_id,
            claims.tenantId,
            roundNumber,
            body.name || `Round ${roundNumber}`,
            deadline,
            JSON.stringify(fixturesWithIds),
            now
        ).run();

        // Update game round number
        await env.DB.prepare(
            "UPDATE lms_games SET round_number = ?, updated_at = ? WHERE id = ?"
        ).bind(roundNumber, now, body.game_id).run();

        return json({
            success: true,
            round: {
                id: roundId,
                game_id: body.game_id,
                round_number: roundNumber,
                name: body.name || `Round ${roundNumber}`,
                deadline,
                status: 'open',
                fixtures: fixturesWithIds
            }
        }, 201, corsHdrs);
    } catch (err) {
        console.error('Create LMS round error:', err);
        return json({ success: false, error: "Failed to create round" }, 500, corsHdrs);
    }
}

// Get round details
export async function handleGetLMSRound(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const roundId = url.pathname.split('/').pop();

        const round = await env.DB.prepare(
            "SELECT * FROM lms_rounds WHERE id = ? AND tenant_id = ?"
        ).bind(roundId, claims.tenantId).first();

        if (!round) {
            return json({ success: false, error: "Round not found" }, 404, corsHdrs);
        }

        // Get predictions for this round
        const predictions = await env.DB.prepare(`
            SELECT p.*, e.user_name 
            FROM lms_predictions p
            JOIN lms_entries e ON p.entry_id = e.id
            WHERE p.round_id = ? AND p.tenant_id = ?
        `).bind(roundId, claims.tenantId).all();

        return json({
            success: true,
            round: {
                ...round,
                fixtures: JSON.parse(round.fixtures_json || '[]')
            },
            predictions: predictions.results || []
        }, 200, corsHdrs);
    } catch (err) {
        console.error('Get LMS round error:', err);
        return json({ success: false, error: "Failed to get round" }, 500, corsHdrs);
    }
}

// ============ PREDICTION HANDLERS ============

// Submit prediction
export async function handleSubmitLMSPrediction(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const body = await req.json() as SubmitPredictionBody;

        if (!body.round_id || !body.team_picked) {
            return json({ success: false, error: "Round ID and team are required" }, 400, corsHdrs);
        }

        // Get round
        const round = await env.DB.prepare(
            "SELECT * FROM lms_rounds WHERE id = ? AND tenant_id = ?"
        ).bind(body.round_id, claims.tenantId).first() as LMSRound | null;

        if (!round) {
            return json({ success: false, error: "Round not found" }, 404, corsHdrs);
        }

        // Check deadline
        if (round.status !== 'open') {
            return json({ success: false, error: "Round is closed for predictions" }, 400, corsHdrs);
        }

        if (Date.now() > round.deadline) {
            return json({ success: false, error: "Prediction deadline has passed" }, 400, corsHdrs);
        }

        // Get user's entry
        const entry = await env.DB.prepare(
            "SELECT * FROM lms_entries WHERE game_id = ? AND user_id = ?"
        ).bind(round.game_id, claims.sub).first() as LMSEntry | null;

        if (!entry) {
            return json({ success: false, error: "You haven't joined this game" }, 400, corsHdrs);
        }

        // Check if eliminated
        if (entry.status === 'eliminated') {
            return json({ success: false, error: "You have been eliminated from this game" }, 400, corsHdrs);
        }

        // Check if team already used
        const teamsUsed: string[] = JSON.parse(entry.teams_used || '[]');
        if (teamsUsed.includes(body.team_picked)) {
            return json({
                success: false,
                error: "You have already picked this team in a previous round"
            }, 400, corsHdrs);
        }

        // Check if prediction exists (update) or create new
        const existing = await env.DB.prepare(
            "SELECT id FROM lms_predictions WHERE entry_id = ? AND round_id = ?"
        ).bind(entry.id, body.round_id).first();

        const now = Date.now();

        if (existing) {
            // Get the old prediction to remove from teams_used
            const oldPred = await env.DB.prepare(
                "SELECT team_picked FROM lms_predictions WHERE id = ?"
            ).bind(existing.id).first();

            // Update prediction
            await env.DB.prepare(
                "UPDATE lms_predictions SET team_picked = ?, fixture_id = ?, created_at = ? WHERE id = ?"
            ).bind(body.team_picked, body.fixture_id || null, now, existing.id).run();

            // Update teams_used - remove old, add new
            const updatedTeams = teamsUsed.filter(t => t !== oldPred?.team_picked);
            updatedTeams.push(body.team_picked);
            await env.DB.prepare(
                "UPDATE lms_entries SET teams_used = ? WHERE id = ?"
            ).bind(JSON.stringify(updatedTeams), entry.id).run();
        } else {
            // Create new prediction
            const predictionId = crypto.randomUUID();
            await env.DB.prepare(`
                INSERT INTO lms_predictions (id, entry_id, round_id, tenant_id, team_picked, fixture_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
                predictionId,
                entry.id,
                body.round_id,
                claims.tenantId,
                body.team_picked,
                body.fixture_id || null,
                now
            ).run();

            // Add team to teams_used
            teamsUsed.push(body.team_picked);
            await env.DB.prepare(
                "UPDATE lms_entries SET teams_used = ? WHERE id = ?"
            ).bind(JSON.stringify(teamsUsed), entry.id).run();
        }

        return json({
            success: true,
            message: existing ? "Prediction updated" : "Prediction submitted",
            team_picked: body.team_picked
        }, 200, corsHdrs);
    } catch (err) {
        console.error('Submit LMS prediction error:', err);
        return json({ success: false, error: "Failed to submit prediction" }, 500, corsHdrs);
    }
}

// ============ PROCESSING HANDLERS ============

// Process round results (admin only)
export async function handleProcessLMSRound(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);

        if (!['admin', 'manager', 'coach'].includes(claims.role || '')) {
            return json({ success: false, error: "Admin access required" }, 403, corsHdrs);
        }

        const url = new URL(req.url);
        const pathParts = url.pathname.split('/');
        const roundId = pathParts[pathParts.length - 2]; // /rounds/:id/process

        const body = await req.json() as ProcessRoundBody;

        // Get round
        const round = await env.DB.prepare(
            "SELECT * FROM lms_rounds WHERE id = ? AND tenant_id = ?"
        ).bind(roundId, claims.tenantId).first() as LMSRound | null;

        if (!round) {
            return json({ success: false, error: "Round not found" }, 404, corsHdrs);
        }

        if (round.status === 'processed') {
            return json({ success: false, error: "Round already processed" }, 400, corsHdrs);
        }

        // Parse fixtures and update with results
        const fixtures: Fixture[] = JSON.parse(round.fixtures_json || '[]');
        const resultsMap = new Map(body.fixtures.map(f => [f.id, f]));

        // Determine winners for each fixture
        const fixtureWinners = new Map<string, string | null>();
        for (const fixture of fixtures) {
            const result = resultsMap.get(fixture.id);
            if (result) {
                fixture.homeScore = result.homeScore;
                fixture.awayScore = result.awayScore;

                if (result.homeScore > result.awayScore) {
                    fixtureWinners.set(fixture.home, 'win');
                    fixtureWinners.set(fixture.away, 'lose');
                } else if (result.awayScore > result.homeScore) {
                    fixtureWinners.set(fixture.away, 'win');
                    fixtureWinners.set(fixture.home, 'lose');
                } else {
                    fixtureWinners.set(fixture.home, 'draw');
                    fixtureWinners.set(fixture.away, 'draw');
                }
            }
        }

        // Update fixtures in round
        await env.DB.prepare(
            "UPDATE lms_rounds SET fixtures_json = ?, status = 'processed', processed_at = ? WHERE id = ?"
        ).bind(JSON.stringify(fixtures), Date.now(), roundId).run();

        // Get all predictions for this round
        const predictions = await env.DB.prepare(
            "SELECT * FROM lms_predictions WHERE round_id = ? AND tenant_id = ?"
        ).bind(roundId, claims.tenantId).all();

        let eliminatedCount = 0;
        let survivedCount = 0;

        // Process each prediction
        for (const pred of (predictions.results || [])) {
            const teamResult = fixtureWinners.get(pred.team_picked);
            const isWin = teamResult === 'win';

            // Update prediction result
            await env.DB.prepare(
                "UPDATE lms_predictions SET result = ?, processed_at = ? WHERE id = ?"
            ).bind(teamResult || 'unknown', Date.now(), pred.id).run();

            if (!isWin) {
                // Eliminate the player
                await env.DB.prepare(`
                    UPDATE lms_entries 
                    SET status = 'eliminated', eliminated_round = ?
                    WHERE id = ?
                `).bind(round.round_number, pred.entry_id).run();
                eliminatedCount++;
            } else {
                // Increment streak
                await env.DB.prepare(
                    "UPDATE lms_entries SET streak = streak + 1 WHERE id = ?"
                ).bind(pred.entry_id).run();
                survivedCount++;
            }
        }

        // Check for entries without predictions (auto-eliminate)
        const allEntries = await env.DB.prepare(`
            SELECT e.id FROM lms_entries e
            WHERE e.game_id = ? AND e.status = 'alive'
            AND NOT EXISTS (
                SELECT 1 FROM lms_predictions p 
                WHERE p.entry_id = e.id AND p.round_id = ?
            )
        `).bind(round.game_id, roundId).all();

        for (const entry of (allEntries.results || [])) {
            await env.DB.prepare(`
                UPDATE lms_entries 
                SET status = 'eliminated', eliminated_round = ?
                WHERE id = ?
            `).bind(round.round_number, entry.id).run();
            eliminatedCount++;
        }

        // Check if game is over (0 or 1 survivor)
        const survivors = await env.DB.prepare(
            "SELECT * FROM lms_entries WHERE game_id = ? AND status = 'alive'"
        ).bind(round.game_id).all();

        let gameOver = false;
        let winners: any[] = [];

        if ((survivors.results?.length || 0) <= 1) {
            gameOver = true;
            winners = survivors.results || [];

            if (winners.length === 1) {
                // Update winner
                await env.DB.prepare(`
                    UPDATE lms_entries SET status = 'winner' WHERE id = ?
                `).bind(winners[0].id).run();

                await env.DB.prepare(`
                    UPDATE lms_games 
                    SET status = 'completed', winner_user_id = ?, winner_name = ?, updated_at = ?
                    WHERE id = ?
                `).bind(winners[0].user_id, winners[0].user_name, Date.now(), round.game_id).run();
            } else {
                // No survivors - mark game as completed
                await env.DB.prepare(
                    "UPDATE lms_games SET status = 'completed', updated_at = ? WHERE id = ?"
                ).bind(Date.now(), round.game_id).run();
            }
        }

        return json({
            success: true,
            summary: {
                eliminated: eliminatedCount,
                survived: survivedCount,
                gameOver,
                winners: winners.map(w => ({ id: w.user_id, name: w.user_name }))
            }
        }, 200, corsHdrs);
    } catch (err) {
        console.error('Process LMS round error:', err);
        return json({ success: false, error: "Failed to process round" }, 500, corsHdrs);
    }
}
