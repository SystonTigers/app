import { json } from "../services/util";
import { requireJWT } from "../services/auth";

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

// Get team fun stats for a season (or all-time if no season specified)
export async function handleGetTeamFunStats(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const url = new URL(req.url);
        const seasonId = url.searchParams.get('seasonId');

        const stats = await calculateTeamFunStats(env, claims.tenantId || '', seasonId);

        return json({ success: true, data: stats }, 200, corsHdrs);
    } catch (err) {
        console.error('Get team fun stats error:', err);
        return json({ success: false, error: "Failed to get stats" }, 500, corsHdrs);
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

// Calculate team fun stats
async function calculateTeamFunStats(env: any, tenantId: string, seasonId: string | null): Promise<FunStat[]> {
    const stats: FunStat[] = [];

    // Build season filter
    const seasonFilter = seasonId ? "AND season_id = ?" : "";
    const bindParams = seasonId ? [tenantId, seasonId] : [tenantId];

    const results = await env.DB.prepare(
        `SELECT * FROM team_results WHERE tenant_id = ? ${seasonFilter} ORDER BY match_date DESC`
    ).bind(...bindParams).all();

    const matches = results.results || [];

    if (matches.length === 0) {
        return [{ key: 'no_data', title: 'No Data', value: 'No matches recorded yet', icon: '📊' }];
    }

    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    let longestWinStreak = 0, longestUnbeatenStreak = 0;
    let tempWinStreak = 0, tempUnbeatenStreak = 0, cleanSheets = 0;

    for (const match of matches as any[]) {
        const gf = match.goals_for || 0;
        const ga = match.goals_against || 0;
        goalsFor += gf;
        goalsAgainst += ga;
        if (ga === 0) {cleanSheets++;}

        if (gf > ga) {
            wins++;
            tempWinStreak++;
            tempUnbeatenStreak++;
        } else if (gf === ga) {
            draws++;
            tempWinStreak = 0;
            tempUnbeatenStreak++;
        } else {
            losses++;
            tempWinStreak = 0;
            tempUnbeatenStreak = 0;
        }

        longestWinStreak = Math.max(longestWinStreak, tempWinStreak);
        longestUnbeatenStreak = Math.max(longestUnbeatenStreak, tempUnbeatenStreak);
    }

    const played = wins + draws + losses;
    const points = wins * 3 + draws;
    const winPct = played > 0 ? Math.round((wins / played) * 100) : 0;
    const cleanSheetPct = played > 0 ? Math.round((cleanSheets / played) * 100) : 0;
    const goalsPerGame = played > 0 ? (goalsFor / played).toFixed(1) : '0';
    const gd = goalsFor - goalsAgainst;

    stats.push({ key: 'record', title: 'Record', value: `${wins}W ${draws}D ${losses}L`, icon: '📈' });
    stats.push({ key: 'points', title: 'Points', value: points, icon: '🏆' });
    stats.push({ key: 'win_pct', title: 'Win Rate', value: `${winPct}%`, icon: '✅' });
    stats.push({ key: 'goals_per_game', title: 'Goals/Game', value: goalsPerGame, icon: '⚽' });
    stats.push({ key: 'clean_sheet_pct', title: 'Clean Sheet %', value: `${cleanSheetPct}%`, icon: '🧤' });
    stats.push({ key: 'goal_diff', title: 'Goal Difference', value: gd >= 0 ? `+${gd}` : `${gd}`, icon: gd >= 0 ? '📊' : '📉' });

    if (longestWinStreak > 1) {
        stats.push({ key: 'longest_win_streak', title: 'Longest Win Streak', value: `${longestWinStreak} games`, icon: '🔥' });
    }
    if (longestUnbeatenStreak > 2) {
        stats.push({ key: 'longest_unbeaten', title: 'Longest Unbeaten Run', value: `${longestUnbeatenStreak} games`, icon: '💪' });
    }

    return stats;
}

// Calculate player fun stats
async function calculatePlayerFunStats(env: any, tenantId: string, playerId: string, seasonId: string | null): Promise<FunStat[]> {
    const stats: FunStat[] = [];

    const seasonFilter = seasonId ? "AND f.season_id = ?" : "";
    const bindParams = seasonId ? [tenantId, playerId, seasonId] : [tenantId, playerId];

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
    if (assists > 0) {stats.push({ key: 'assists', title: 'Assists', value: assists, icon: '👟' });}
    if (goals > 0 && assists > 0) {stats.push({ key: 'contributions', title: 'Goal Contributions', value: goals + assists, icon: '🎯' });}
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
