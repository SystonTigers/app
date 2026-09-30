// Fun Stats Calculation Service
// Computes interesting statistics from match data

interface FunStat {
    key: string;
    label: string;
    value: string | number;
    description: string;
    icon?: string;
}

/**
 * Fun facts for the stats page, worked out from the club's results
 * (team_results: our score first), player events (match_events) and, for
 * half-time situations, the Match Centre timeline (live_match_events).
 */
export async function computeFunStats(db: D1Database, tenantId: string, seasonId?: string | null): Promise<FunStat[]> {
    const stats: FunStat[] = [];
    const seasonWhere = seasonId ? 'AND r.season_id = ?' : '';
    const binds = seasonId ? [tenantId, seasonId] : [tenantId];

    const { results: rows } = await db.prepare(
        `SELECT r.match_date, r.our_score, r.their_score, r.fixture_id,
                CASE WHEN f.id IS NOT NULL AND f.home_team = r.opponent AND IFNULL(f.away_team, '') != r.opponent THEN 'away'
                     WHEN f.id IS NOT NULL THEN 'home'
                     WHEN lower(r.venue) = 'away' THEN 'away'
                     WHEN lower(r.venue) = 'home' THEN 'home' END AS home_away
         FROM team_results r LEFT JOIN fixtures f ON f.id = r.fixture_id AND f.tenant_id = r.tenant_id
         WHERE r.tenant_id = ? ${seasonWhere}
         ORDER BY r.match_date DESC`,
    ).bind(...binds).all<{ match_date: string; our_score: number; their_score: number; fixture_id: string | null; home_away: string | null }>();
    const matches = rows ?? [];
    if (!matches.length) return stats;

    const played = matches.length;
    const won = matches.filter((m) => m.our_score > m.their_score).length;
    stats.push({ key: 'overall_win_pct', label: 'Win Rate', value: `${Math.round((won / played) * 100)}%`, description: `${won} wins from ${played} matches`, icon: '📈' });

    const win = calculateStreaks(matches, (m) => m.our_score > m.their_score);
    stats.push({ key: 'win_streak_best', label: 'Best Winning Streak', value: win.best, description: `Currently: ${win.current} match${win.current !== 1 ? 'es' : ''}`, icon: '🏆' });

    const unbeaten = calculateStreaks(matches, (m) => m.our_score >= m.their_score);
    stats.push({ key: 'unbeaten_streak_best', label: 'Longest Unbeaten Run', value: unbeaten.best, description: `Currently: ${unbeaten.current}`, icon: '🛡️' });

    const cleanSheets = matches.filter((m) => m.their_score === 0).length;
    const cs = calculateStreaks(matches, (m) => m.their_score === 0);
    stats.push({ key: 'clean_sheets', label: 'Clean Sheets', value: cleanSheets, description: `Best run: ${cs.best} in a row`, icon: '🧤' });

    const scoring = calculateStreaks(matches, (m) => m.our_score > 0);
    stats.push({ key: 'scoring_streak_best', label: 'Best Scoring Streak', value: scoring.best, description: `Currently: ${scoring.current}`, icon: '⚽' });

    const goalsFor = matches.reduce((n, m) => n + m.our_score, 0);
    stats.push({ key: 'avg_goals_per_match', label: 'Goals Per Game', value: (goalsFor / played).toFixed(1), description: `${goalsFor} goals in ${played} matches`, icon: '📊' });

    const biggest = matches.reduce((best, m) => (m.our_score - m.their_score > best.our_score - best.their_score ? m : best), matches[0]);
    if (biggest.our_score > biggest.their_score) {
        stats.push({ key: 'biggest_win', label: 'Biggest Win', value: `${biggest.our_score}-${biggest.their_score}`, description: new Date(`${biggest.match_date.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), icon: '🎯' });
    }

    const home = matches.filter((m) => m.home_away === 'home');
    if (home.length) {
        const homeWins = home.filter((m) => m.our_score > m.their_score).length;
        stats.push({ key: 'home_win_pct', label: 'Home Fortress', value: `${Math.round((homeWins / home.length) * 100)}%`, description: `${homeWins}/${home.length} home wins`, icon: '🏠' });
    }

    // Half-time situations, from matches run in Match Centre
    const fixtureIds = matches.map((m) => m.fixture_id).filter((id): id is string => !!id);
    if (fixtureIds.length) {
        const placeholders = fixtureIds.map(() => '?').join(',');
        const { results: ht } = await db.prepare(
            `SELECT e.fixture_id,
                    SUM(CASE WHEN e.type = 'goal' THEN 1 ELSE 0 END) AS us,
                    SUM(CASE WHEN e.type = 'opp_goal' THEN 1 ELSE 0 END) AS them
             FROM live_match_events e
             JOIN live_match_events h ON h.fixture_id = e.fixture_id AND h.tenant_id = e.tenant_id AND h.type = 'half_time' AND h.deleted_at IS NULL
             WHERE e.tenant_id = ? AND e.fixture_id IN (${placeholders}) AND e.deleted_at IS NULL
               AND e.type IN ('goal', 'opp_goal') AND COALESCE(e.occurred_at, e.created_at) < COALESCE(h.occurred_at, h.created_at)
             GROUP BY e.fixture_id`,
        ).bind(tenantId, ...fixtureIds).all<{ fixture_id: string; us: number; them: number }>();
        const halfTime = new Map((ht ?? []).map((r) => [r.fixture_id, r]));
        const withHt = matches.filter((m) => m.fixture_id && halfTime.has(m.fixture_id));
        const comebacks = withHt.filter((m) => { const h = halfTime.get(m.fixture_id!)!; return h.us < h.them && m.our_score > m.their_score; }).length;
        stats.push({ key: 'comeback_wins', label: 'Comeback Victories', value: comebacks, description: 'Wins from behind at half time', icon: '💪' });
    }

    const seasonJoin = seasonId ? 'JOIN team_results r ON r.fixture_id = me.fixture_id AND r.tenant_id = me.tenant_id AND r.season_id = ?' : '';
    const evBinds = seasonId ? [seasonId, tenantId] : [tenantId];
    const events = await db.prepare(
        `SELECT
            SUM(CASE WHEN me.event_type = 'goal' AND me.minute <= 15 THEN 1 ELSE 0 END) AS early,
            COUNT(DISTINCT CASE WHEN me.event_type = 'goal' THEN me.player_id END) AS scorers,
            SUM(CASE WHEN me.event_type = 'yellow_card' THEN 1 ELSE 0 END) AS yellows,
            SUM(CASE WHEN me.event_type = 'red_card' THEN 1 ELSE 0 END) AS reds
         FROM match_events me ${seasonJoin}
         WHERE me.tenant_id = ?`,
    ).bind(...evBinds).first<{ early: number | null; scorers: number | null; yellows: number | null; reds: number | null }>();
    const hattricks = await db.prepare(
        `SELECT COUNT(*) AS c FROM (
            SELECT me.fixture_id, me.player_id FROM match_events me ${seasonJoin}
            WHERE me.tenant_id = ? AND me.event_type = 'goal'
            GROUP BY me.fixture_id, me.player_id HAVING COUNT(*) >= 3)`,
    ).bind(...evBinds).first<{ c: number }>();

    stats.push({ key: 'different_scorers', label: 'Goal Contributors', value: events?.scorers ?? 0, description: 'Different players have scored', icon: '👥' });
    stats.push({ key: 'hattrick_count', label: 'Hat-Tricks', value: hattricks?.c ?? 0, description: 'Players scoring 3+ in a match', icon: '🎩' });
    stats.push({ key: 'goals_first_15', label: 'Fast Starts', value: events?.early ?? 0, description: 'Goals in the first 15 minutes', icon: '⚡' });
    stats.push({ key: 'disciplinary_record', label: 'Discipline Record', value: `${events?.yellows ?? 0}🟨 ${events?.reds ?? 0}🟥`, description: 'Cards received', icon: '📋' });

    return stats;
}

// Helper function to calculate streaks
function calculateStreaks<T>(matches: T[], condition: (match: T) => boolean): { current: number; best: number } {
    let current = 0;
    let best = 0;
    let temp = 0;

    for (const match of matches) {
        if (condition(match)) {
            temp++;
            if (temp > best) {best = temp;}
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
    // Replace the club's cached set (season_id can be NULL, which a unique index can't match)
    await db.batch([
        db.prepare(`DELETE FROM fun_stats_cache WHERE tenant_id = ? AND season_id ${seasonId ? '= ?' : 'IS NULL'} AND stat_type = 'team'`)
            .bind(...(seasonId ? [tenantId, seasonId] : [tenantId])),
        ...stats.map((stat) => db.prepare(
            `INSERT INTO fun_stats_cache (id, tenant_id, season_id, stat_type, stat_key, subject_id, value, computed_at)
             VALUES (?, ?, ?, 'team', ?, NULL, ?, ?)`,
        ).bind(crypto.randomUUID(), tenantId, seasonId, stat.key, JSON.stringify(stat), now)),
    ]);
}

// Retrieve cached fun stats
/** Cached stats younger than an hour (new results show up within the hour). */
export async function getCachedFunStats(db: any, tenantId: string, seasonId?: string | null, maxAgeMs = 3600_000): Promise<FunStat[]> {
    const binds = seasonId ? [tenantId, seasonId, Date.now() - maxAgeMs] : [tenantId, Date.now() - maxAgeMs];
    const result = await db.prepare(`
        SELECT value FROM fun_stats_cache
        WHERE tenant_id = ? AND season_id ${seasonId ? '= ?' : 'IS NULL'} AND stat_type = 'team' AND computed_at > ?
        ORDER BY computed_at DESC
    `).bind(...binds).all();

    return (result.results || []).map((r: any) => JSON.parse(r.value));
}
