// Fun Stats Calculation Service
// Computes interesting statistics from match data

interface FunStat {
    key: string;
    label: string;
    value: string | number;
    description: string;
    icon?: string;
}

export async function computeFunStats(db: any, tenantId: string, seasonId?: string | null): Promise<FunStat[]> {
    const stats: FunStat[] = [];

    // Build WHERE clause for season filtering  
    const seasonWhere = seasonId ? `AND f.season_id = ?` : '';
    const seasonBinds = seasonId ? [seasonId] : [];

    // 1. Unbeaten when leading at half-time
    const htLeadingQuery = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN f.home_score >= f.away_score THEN 1 ELSE 0 END) as unbeaten
        FROM fixtures f
        WHERE f.tenant_id = ? 
        AND f.match_status = 'ft'
        AND f.half_time_home_score > f.half_time_away_score
        ${seasonWhere}
    `;
    const htLeading = await db.prepare(htLeadingQuery).bind(tenantId, ...seasonBinds).first();
    if (htLeading && htLeading.total > 0) {
        const pct = Math.round((htLeading.unbeaten / htLeading.total) * 100);
        stats.push({
            key: 'unbeaten_leading_halftime',
            label: 'Unbeaten When Leading at Half-Time',
            value: `${pct}%`,
            description: `${htLeading.unbeaten}/${htLeading.total} matches`,
            icon: '🔥'
        });
    }

    // 2. Comeback wins (when trailing at half-time)
    const comebackQuery = `
        SELECT COUNT(*) as count
        FROM fixtures f
        WHERE f.tenant_id = ?
        AND f.match_status = 'ft'
        AND f.half_time_home_score < f.half_time_away_score
        AND f.home_score > f.away_score
        ${seasonWhere}
    `;
    const comebacks = await db.prepare(comebackQuery).bind(tenantId, ...seasonBinds).first();
    if (comebacks) {
        stats.push({
            key: 'comeback_wins',
            label: 'Comeback Victories',
            value: comebacks.count,
            description: 'Wins from losing positions',
            icon: '💪'
        });
    }

    // 3. Clean sheet streak (current and best)
    const cleanSheetQuery = `
        SELECT 
            f.id,
            f.fixture_date,
            f.away_score,
            f.home_score
        FROM fixtures f
        WHERE f.tenant_id = ?
        AND f.match_status = 'ft'
        ${seasonWhere}
        ORDER BY f.fixture_date DESC
    `;
    const allMatches = await db.prepare(cleanSheetQuery).bind(tenantId, ...seasonBinds).all();
    const { current: cssCurrent, best: cssBest } = calculateStreaks(
        allMatches.results || [],
        (m: any) => m.away_score === 0
    );
    stats.push({
        key: 'clean_sheet_streak_best',
        label: 'Best Clean Sheet Streak',
        value: cssBest,
        description: `Currently: ${cssCurrent}`,
        icon: '🧤'
    });

    // 4. Scoring streak
    const { current: scoringCurrent, best: scoringBest } = calculateStreaks(
        allMatches.results || [],
        (m: any) => m.home_score > 0
    );
    stats.push({
        key: 'scoring_streak_best',
        label: 'Best Scoring Streak',
        value: scoringBest,
        description: `Currently: ${scoringCurrent}`,
        icon: '⚽'
    });

    // 5. Winning streak
    const { current: winCurrent, best: winBest } = calculateStreaks(
        allMatches.results || [],
        (m: any) => m.home_score > m.away_score
    );
    stats.push({
        key: 'win_streak_best',
        label: 'Best Winning Streak',
        value: winBest,
        description: `Currently: ${winCurrent} match${winCurrent !== 1 ? 'es' : ''}`,
        icon: '🏆'
    });

    // 6. Goals in first 15 minutes
    const earlyGoalsQuery = `
        SELECT COUNT(*) as count
        FROM match_events me
        JOIN fixtures f ON me.fixture_id = f.id
        WHERE me.tenant_id = ?
        AND me.event_type = 'goal'
        AND me.minute <= 15
        AND f.match_status = 'ft'
        ${seasonWhere.replace('f.season_id', 'f.season_id')}
    `;
    const earlyGoals = await db.prepare(earlyGoalsQuery).bind(tenantId, ...seasonBinds).first();
    stats.push({
        key: 'goals_first_15',
        label: 'Fast Starts',
        value: earlyGoals?.count || 0,
        description: 'Goals in first 15 minutes',
        icon: '⚡'
    });

    // 7. Goals in last 15 minutes
    const lateGoalsQuery = `
        SELECT COUNT(*) as count
        FROM match_events me
        JOIN fixtures f ON me.fixture_id = f.id
        WHERE me.tenant_id = ?
        AND me.event_type = 'goal'
        AND me.minute >= 75
        AND f.match_status = 'ft'
        ${seasonWhere.replace('f.season_id', 'f.season_id')}
    `;
    const lateGoals = await db.prepare(lateGoalsQuery).bind(tenantId, ...seasonBinds).first();
    stats.push({
        key: 'goals_last_15',
        label: 'Late Drama',
        value: lateGoals?.count || 0,
        description: 'Goals in last 15 minutes',
        icon: '🔚'
    });

    // 8. Home win percentage
    const homeStatsQuery = `
        SELECT 
            COUNT(*) as played,
            SUM(CASE WHEN home_score > away_score THEN 1 ELSE 0 END) as won
        FROM fixtures
        WHERE tenant_id = ?
        AND match_status = 'ft'
        ${seasonWhere}
    `;
    const homeStats = await db.prepare(homeStatsQuery).bind(tenantId, ...seasonBinds).first();
    if (homeStats && homeStats.played > 0) {
        const homePct = Math.round((homeStats.won / homeStats.played) * 100);
        stats.push({
            key: 'home_win_pct',
            label: 'Home Fortress',
            value: `${homePct}%`,
            description: `${homeStats.won}/${homeStats.played} home wins`,
            icon: '🏠'
        });
    }

    // 9. Hat-tricks
    const hattricksQuery = `
        SELECT 
            me.fixture_id,
            me.player_id,
            COUNT(*) as goals
        FROM match_events me
        JOIN fixtures f ON me.fixture_id = f.id
        WHERE me.tenant_id = ?
        AND me.event_type = 'goal'
        AND f.match_status = 'ft'
        ${seasonWhere.replace('f.season_id', 'f.season_id')}
        GROUP BY me.fixture_id, me.player_id
        HAVING goals >= 3
    `;
    const hattricks = await db.prepare(hattricksQuery).bind(tenantId, ...seasonBinds).all();
    stats.push({
        key: 'hattrick_count',
        label: 'Hat-Tricks',
        value: hattricks.results?.length || 0,
        description: 'Players scoring 3+ in a match',
        icon: '🎩'
    });

    // 10. Late winners (85'+)
    const lateWinnersQuery = `
        SELECT COUNT(DISTINCT f.id) as count
        FROM match_events me
        JOIN fixtures f ON me.fixture_id = f.id
        WHERE me.tenant_id = ?
        AND me.event_type = 'goal'
        AND me.minute >= 85
        AND f.match_status = 'ft'
        AND f.home_score > f.away_score
        ${seasonWhere.replace('f.season_id', 'f.season_id')}
        AND NOT EXISTS (
            SELECT 1 FROM match_events me2
            WHERE me2.fixture_id = f.id
            AND me2.event_type = 'goal'
            AND me2.minute > me.minute
            AND me2.tenant_id = me.tenant_id
        )
    `;
    const lateWinners = await db.prepare(lateWinnersQuery).bind(tenantId, ...seasonBinds).first();
    stats.push({
        key: 'late_winner_count',
        label: 'Late Winners',
        value: lateWinners?.count || 0,
        description: 'Winning goals scored 85\'+',
        icon: '⏱️'
    });

    // 11. Most goals in a single match
    const biggestWinQuery = `
        SELECT MAX(home_score) as max_goals
        FROM fixtures
        WHERE tenant_id = ?
        AND match_status = 'ft'
        ${seasonWhere}
    `;
    const biggestWin = await db.prepare(biggestWinQuery).bind(tenantId, ...seasonBinds).first();
    if (biggestWin && biggestWin.max_goals) {
        stats.push({
            key: 'most_goals_single_match',
            label: 'Goal Fest',
            value: biggestWin.max_goals,
            description: 'Most goals in a single match',
            icon: '🎯'
        });
    }

    // 12. Average goals per match
    const avgGoalsQuery = `
        SELECT 
            AVG(home_score) as avg_goals,
            COUNT(*) as matches
        FROM fixtures
        WHERE tenant_id = ?
        AND match_status = 'ft'
        ${seasonWhere}
    `;
    const avgGoals = await db.prepare(avgGoalsQuery).bind(tenantId, ...seasonBinds).first();
    if (avgGoals && avgGoals.matches > 0) {
        stats.push({
            key: 'avg_goals_per_match',
            label: 'Goals Per Game',
            value: avgGoals.avg_goals.toFixed(2),
            description: `Across ${avgGoals.matches} matches`,
            icon: '📊'
        });
    }

    // 13. Different goalscorers
    const scorersQuery = `
        SELECT COUNT(DISTINCT player_id) as count
        FROM match_events me
        JOIN fixtures f ON me.fixture_id = f.id
        WHERE me.tenant_id = ?
        AND me.event_type = 'goal'
        AND f.match_status = 'ft'
        ${seasonWhere.replace('f.season_id', 'f.season_id')}
    `;
    const scorers = await db.prepare(scorersQuery).bind(tenantId, ...seasonBinds).first();
    stats.push({
        key: 'different_scorers',
        label: 'Goal Contributors',
        value: scorers?.count || 0,
        description: 'Different players scored',
        icon: '👥'
    });

    // 14. Win percentage
    const winPctQuery = `
        SELECT 
            COUNT(*) as played,
            SUM(CASE WHEN home_score > away_score THEN 1 ELSE 0 END) as won
        FROM fixtures
        WHERE tenant_id = ?
        AND match_status = 'ft'
        ${seasonWhere}
    `;
    const winPct = await db.prepare(winPctQuery).bind(tenantId, ...seasonBinds).first();
    if (winPct && winPct.played > 0) {
        const pct = Math.round((winPct.won / winPct.played) * 100);
        stats.push({
            key: 'overall_win_pct',
            label: 'Win Rate',
            value: `${pct}%`,
            description: `${winPct.won} wins from ${winPct.played} matches`,
            icon: '📈'
        });
    }

    // 15. Disciplinary record
    const cardsQuery = `
        SELECT 
            SUM(CASE WHEN event_type = 'yellow_card' THEN 1 ELSE 0 END) as yellows,
            SUM(CASE WHEN event_type = 'red_card' THEN 1 ELSE 0 END) as reds
        FROM match_events me
        JOIN fixtures f ON me.fixture_id = f.id
        WHERE me.tenant_id = ?
        AND f.match_status = 'ft'
        ${seasonWhere.replace('f.season_id', 'f.season_id')}
    `;
    const cards = await db.prepare(cardsQuery).bind(tenantId, ...seasonBinds).first();
    if (cards) {
        stats.push({
            key: 'disciplinary_record',
            label: 'Discipline Record',
            value: `${cards.yellows}🟨 ${cards.reds}🟥`,
            description: 'Cards received',
            icon: '📋'
        });
    }

    return stats;
}

// Helper function to calculate streaks
function calculateStreaks(matches: any[], condition: (match: any) => boolean): { current: number; best: number } {
    let current = 0;
    let best = 0;
    let temp = 0;

    for (const match of matches) {
        if (condition(match)) {
            temp++;
            if (temp > best) best = temp;
        } else {
            temp = 0;
        }
    }

    // Current streak is from most recent matches
    for (const match of matches) {
        if (condition(match)) {
            current++;
        } else {
            break;
        }
    }

    return { current, best };
}

// Cache fun stats in database
export async function cacheFunStats(db: any, tenantId: string, seasonId: string | null, stats: FunStat[]) {
    const now = Date.now();

    for (const stat of stats) {
        const id = crypto.randomUUID();
        await db.prepare(`
            INSERT INTO fun_stats_cache (id, tenant_id, season_id, stat_type, stat_key, subject_id, value, computed_at)
            VALUES (?, ?, ?, 'team', ?, NULL, ?, ?)
            ON CONFLICT(tenant_id, season_id, stat_type, stat_key, subject_id) 
            DO UPDATE SET value = excluded.value, computed_at = excluded.computed_at
        `).bind(id, tenantId, seasonId, stat.key, JSON.stringify(stat), now).run();
    }
}

// Retrieve cached fun stats
export async function getCachedFunStats(db: any, tenantId: string, seasonId?: string | null): Promise<FunStat[]> {
    const binds = seasonId ? [tenantId, seasonId] : [tenantId];
    const result = await db.prepare(`
        SELECT value FROM fun_stats_cache
        WHERE tenant_id = ? AND season_id ${seasonId ? '= ?' : 'IS NULL'} AND stat_type = 'team'
        ORDER BY computed_at DESC
    `).bind(...binds).all();

    return (result.results || []).map((r: any) => JSON.parse(r.value));
}
