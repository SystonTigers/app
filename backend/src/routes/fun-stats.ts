import { json } from "../services/util";
import { requireJWT, requireTenantJWT } from "../services/auth";
import { computeFunStats } from "../services/funStats";
import { resolveSeason } from "../services/seasons/range";
import { tracksAssists } from "../services/clubOptions";

/**
 * Fun Stats Service
 * Auto-calculates unique/interesting statistics from match data
 */

interface FunStat {
    key: string;
    title: string;
    value: string | number;
    description?: string;
    icon?: string;
}

/**
 * Team fun stats for members (the app's Club history). Same numbers as the
 * club page (`/public/:club/stats/fun`, services/funStats.ts).
 * GET /api/v1/stats/fun?season=<id|2025-26|all> (no season = all time)
 */
export async function handleGetTeamFunStats(req: Request, env: any, corsHdrs: Headers) {
    let tenantId: string;
    try {
        tenantId = (await requireTenantJWT(req, env)).tenantId;
    } catch {
        return json({ success: false, error: "Please log in again." }, 401, corsHdrs);
    }
    try {
        const url = new URL(req.url);
        const asked = url.searchParams.get('season') || url.searchParams.get('seasonId');
        const season = asked ? await resolveSeason(env, tenantId, asked) : null;
        const stats = await computeFunStats(env.DB, tenantId, season);
        return json({ success: true, data: stats, season: season ? { id: season.id, label: season.label } : null }, 200, corsHdrs);
    } catch (err) {
        console.error('Get team fun stats error:', err);
        return json({ success: false, error: "Fun stats didn't load. Please try again." }, 500, corsHdrs);
    }
}

// Get player fun stats
export async function handleGetPlayerFunStats(req: Request, env: any, corsHdrs: Headers, playerId: string) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const seasonId = url.searchParams.get('seasonId');

        const stats = await calculatePlayerFunStats(env, claims.tenantId || '', playerId, seasonId);

        return json({ success: true, data: stats }, 200, corsHdrs);
    } catch (err) {
        console.error('Get player fun stats error:', err);
        return json({ success: false, error: "Failed to get stats" }, 500, corsHdrs);
    }
}

// Calculate player fun stats
async function calculatePlayerFunStats(env: any, tenantId: string, playerId: string, seasonId: string | null): Promise<FunStat[]> {
    const stats: FunStat[] = [];

    const season = seasonId ? await resolveSeason(env, tenantId, seasonId) : null;
    const seasonFilter = season ? "AND substr(f.fixture_date, 1, 10) BETWEEN ? AND ?" : "";
    const bindParams = season ? [tenantId, playerId, season.from, season.to] : [tenantId, playerId];

    const events = await env.DB.prepare(
        `SELECT me.*, f.fixture_date FROM match_events me
         JOIN fixtures f ON me.fixture_id = f.id
         WHERE f.tenant_id = ? AND me.player_id = ? ${seasonFilter}
         ORDER BY f.fixture_date DESC`
    ).bind(...bindParams).all();

    const eventList = events.results || [];

    if (eventList.length === 0) {
        return [{ key: 'no_events', title: 'No Data', value: 'No events recorded', icon: '📊' }];
    }

    let goals = 0, assists = 0, yellowCards = 0, redCards = 0, motm = 0;
    const matchesPlayed = new Set<string>();

    for (const event of eventList as any[]) {
        matchesPlayed.add(event.fixture_id);
        switch (event.event_type) {
            case 'goal': goals++; break;
            case 'assist': assists++; break;
            case 'yellow_card': yellowCards++; break;
            case 'red_card': redCards++; break;
            case 'motm': motm++; break;
        }
    }

    const appearances = matchesPlayed.size;

    stats.push({ key: 'appearances', title: 'Appearances', value: appearances, icon: '👕' });
    if (goals > 0) {
        stats.push({ key: 'goals', title: 'Goals', value: goals, icon: '⚽' });
        stats.push({ key: 'goals_per_game', title: 'Goals/Game', value: (goals / appearances).toFixed(2), icon: '📊' });
    }
    // Clubs that don't record assists don't see them
    if (assists > 0 && await tracksAssists(env, tenantId)) {
        stats.push({ key: 'assists', title: 'Assists', value: assists, icon: '👟' });
        if (goals > 0) {stats.push({ key: 'contributions', title: 'Goal Contributions', value: goals + assists, icon: '🎯' });}
    }
    if (motm > 0) {stats.push({ key: 'motm', title: 'Man of the Match', value: motm, icon: '⭐' });}
    if (yellowCards > 0 || redCards > 0) {
        stats.push({ key: 'discipline', title: 'Cards', value: `${yellowCards}🟨 ${redCards}🟥`, icon: '⚠️' });
    }

    return stats;
}

// Get season summary stats
export async function handleGetSeasonSummary(req: Request, env: any, corsHdrs: Headers, seasonId: string) {
    try {
        const claims = await requireJWT(req, env);

        const season = await env.DB.prepare(
            "SELECT * FROM seasons WHERE id = ? AND tenant_id = ?"
        ).bind(seasonId, claims.tenantId).first();

        if (!season) {
            return json({ success: false, error: "Season not found" }, 404, corsHdrs);
        }

        const results = await env.DB.prepare(
            "SELECT * FROM team_results WHERE tenant_id = ? AND season_id = ?"
        ).bind(claims.tenantId, seasonId).all();

        const matches = results.results || [];
        let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;

        for (const m of matches as any[]) {
            const gf = m.goals_for || 0;
            const ga = m.goals_against || 0;
            goalsFor += gf;
            goalsAgainst += ga;
            if (gf > ga) {wins++;}
            else if (gf === ga) {draws++;}
            else {losses++;}
        }

        const scorers = await env.DB.prepare(
            `SELECT me.player_id, s.name as player_name, COUNT(*) as goals
             FROM match_events me
             JOIN fixtures f ON me.fixture_id = f.id
             LEFT JOIN squad s ON me.player_id = s.id
             WHERE f.tenant_id = ? AND f.season_id = ? AND me.event_type = 'goal'
             GROUP BY me.player_id ORDER BY goals DESC LIMIT 5`
        ).bind(claims.tenantId, seasonId).all();

        const summary = {
            season,
            record: {
                played: wins + draws + losses,
                won: wins, drawn: draws, lost: losses,
                goalsFor, goalsAgainst,
                goalDifference: goalsFor - goalsAgainst,
                points: wins * 3 + draws
            },
            topScorers: scorers.results || []
        };

        return json({ success: true, data: summary }, 200, corsHdrs);
    } catch (err) {
        console.error('Get season summary error:', err);
        return json({ success: false, error: "Failed to get summary" }, 500, corsHdrs);
    }
}
