
import { resolveSeason } from "../services/seasons/range";
import { outcomeFromScores } from "../services/results";
import { refreshLeagueTable } from "../services/league/store";
import { z } from 'zod';
import { requireJWT } from '../services/auth';
import { json } from '../services/util';

const MatchEventSchema = z.object({
    playerId: z.string().min(1),
    // sub_on / sub_off record who came on and off (they count as appearances)
    eventType: z.enum(['goal', 'assist', 'yellow_card', 'red_card', 'motm', 'sub_on', 'sub_off', 'appearance']),
    minute: z.number().int().min(0).max(150).optional(),
    relatedPlayerId: z.string().optional(),
});

const MatchReportSchema = z.object({
    homeScore: z.number().int().min(0).max(99),
    awayScore: z.number().int().min(0).max(99),
    events: z.array(MatchEventSchema).max(300),
    // Starting line-up and named subs; starters count as an appearance
    lineup: z.object({ starters: z.array(z.string()).max(30), subs: z.array(z.string()).max(30).optional() }).optional(),
});

/**
 * POST /api/v1/matches/:id/report (staff, website match report): the score
 * and what each player did. Replaces the match's events (Match Centre's too,
 * since the report is loaded from them first), saves the result and marks the
 * fixture completed, then rebuilds the league table.
 */
export async function handleSaveMatchReport(req: Request, env: any, id: string): Promise<Response> {
    let tenantId: string;
    try {
        const claims = await requireJWT(req, env);
        if (!claims.tenantId) throw new Error("no club");
        tenantId = claims.tenantId;
    } catch {
        return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Please log in again.' } }, 401);
    }
    const parsed = MatchReportSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return json({ success: false, error: { code: 'INVALID', message: 'Check the score and events, then save again.' } }, 400);
    }
    const report = parsed.data;
    try {
        const db = env.DB as D1Database;
        const fixture = await db.prepare("SELECT * FROM fixtures WHERE id = ? AND tenant_id = ?").bind(id, tenantId).first<Record<string, any>>();
        if (!fixture) return json({ success: false, error: { code: 'NOT_FOUND', message: 'Fixture not found.' } }, 404);

        // Only this club's players
        const ids = new Set<string>([
            ...report.events.map((e) => e.playerId),
            ...(report.lineup?.starters ?? []),
        ]);
        const { results: known } = await db.prepare(`SELECT id, name FROM squad WHERE tenant_id = ?`).bind(tenantId).all<{ id: string; name: string }>();
        const names = new Map((known ?? []).map((p) => [p.id, p.name]));
        if ([...ids].some((pid) => !names.has(pid))) {
            return json({ success: false, error: { code: 'INVALID', message: "Some players aren't in your squad." } }, 400);
        }

        const now = Date.now();
        const batch: D1PreparedStatement[] = [
            db.prepare("DELETE FROM match_events WHERE tenant_id = ? AND fixture_id = ?").bind(tenantId, id),
        ];
        const insert = (playerId: string, type: string, minute: number | null) => db.prepare(
            `INSERT INTO match_events (id, tenant_id, fixture_id, player_id, event_type, minute, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind(crypto.randomUUID(), tenantId, id, playerId, type, minute, now);
        for (const event of report.events) batch.push(insert(event.playerId, event.eventType, event.minute ?? null));
        // Starters who have no other event still played
        const withEvents = new Set(report.events.map((e) => e.playerId));
        for (const starter of new Set(report.lineup?.starters ?? [])) {
            if (!withEvents.has(starter)) batch.push(insert(starter, 'appearance', null));
        }

        const { result, points } = outcomeFromScores(report.homeScore, report.awayScore);
        const scorers = report.events.filter((e) => e.eventType === 'goal').map((e) => names.get(e.playerId) ?? '').filter(Boolean);
        const scorerText = [...scorers.reduce((m, n) => m.set(n, (m.get(n) ?? 0) + 1), new Map<string, number>())]
            .map(([n, c]) => (c > 1 ? `${n} ${c}` : n)).join(', ') || null;
        const date = String(fixture.fixture_date).slice(0, 10);
        batch.push(db.prepare(`
            INSERT INTO team_results (tenant_id, match_date, opponent, venue, competition, our_score, their_score, result, points, scorers, fixture_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(tenant_id, match_date, opponent) DO UPDATE SET
              our_score = excluded.our_score, their_score = excluded.their_score, result = excluded.result,
              points = excluded.points, scorers = excluded.scorers, fixture_id = excluded.fixture_id
        `).bind(tenantId, date, fixture.opponent, fixture.venue || 'TBC', fixture.competition || 'League',
            report.homeScore, report.awayScore, result, points, scorerText, id));
        batch.push(db.prepare("UPDATE fixtures SET status = 'completed' WHERE id = ? AND tenant_id = ?").bind(id, tenantId));
        await db.batch(batch);
        await refreshLeagueTable(env, tenantId);
        console.log(JSON.stringify({ level: 'info', msg: 'match_report_saved', tenantId, fixtureId: id, events: report.events.length }));
        return json({ success: true });
    } catch (err) {
        console.error(JSON.stringify({ level: 'error', msg: 'match_report_failed', tenantId, fixtureId: id, error: err instanceof Error ? err.message : String(err) }));
        return json({ success: false, error: { code: 'INTERNAL', message: "The match report didn't save. Please try again." } }, 500);
    }
}

export async function handleGetMatchReport(req: Request, env: any, id: string): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const db = env.DB as D1Database;

        const events = await db.prepare(`
            SELECT * FROM match_events 
            WHERE tenant_id = ? AND fixture_id = ?
            ORDER BY minute ASC
        `).bind(tenantId, id).all();

        return json({ success: true, events: events.results });

    } catch (err) {
        return json({ error: 'Failed to fetch report' }, 500);
    }
}

/**
 * GET /api/v1/stats/players (club members): every squad player with their
 * goals, assists, MOTM awards, cards and appearances. Goals and assists come
 * from match_events (Match Centre full time, imports, match reports);
 * appearances count matches in a line-up (starters and subs who came on) or
 * with an event, whichever is higher. Numbers staff entered by hand for a
 * season (player_stat_entries) are added on top.
 */
export async function handleGetPlayerStats(req: Request, env: any, corsHdrs?: Headers): Promise<Response> {
    let tenantId: string;
    try {
        const claims = await requireJWT(req, env);
        if (!claims.tenantId) throw new Error("no club");
        tenantId = claims.tenantId;
    } catch {
        return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Please log in again.' } }, 401, corsHdrs);
    }
    try {
        // ?season=<id or 2025-26> for one season; no value = all time
        const seasonParam = new URL(req.url).searchParams.get('season');
        const season = seasonParam ? await resolveSeason(env, tenantId, seasonParam) : null;
        const from = season?.from ?? null;
        const to = season?.to ?? null;
        const { results } = await (env.DB as D1Database).prepare(`
            SELECT s.id, s.name, s.number, s.position, COALESCE(s.headshot_url, s.photo_url) AS photo,
                   COALESCE(e.goals, 0) + COALESCE(h.goals, 0) AS goals,
                   COALESCE(e.assists, 0) + COALESCE(h.assists, 0) AS assists,
                   COALESCE(e.motm, 0) + COALESCE(h.motm, 0) AS motm,
                   COALESCE(e.yellow, 0) + COALESCE(h.yellow, 0) AS yellow_cards,
                   COALESCE(e.red, 0) + COALESCE(h.red, 0) AS red_cards,
                   MAX(COALESCE(a.apps, 0), COALESCE(e.fixtures, 0)) + COALESCE(h.apps, 0) AS appearances
            FROM squad s
            LEFT JOIN (
                SELECT player_id, SUM(event_type = 'goal') AS goals, SUM(event_type = 'assist') AS assists,
                       SUM(event_type = 'motm') AS motm, SUM(event_type = 'yellow_card') AS yellow,
                       SUM(event_type = 'red_card') AS red, COUNT(DISTINCT fixture_id) AS fixtures
                FROM match_events me
                WHERE me.tenant_id = ? AND me.player_id IS NOT NULL
                  AND (? IS NULL OR COALESCE(
                    (SELECT substr(f.fixture_date, 1, 10) FROM fixtures f WHERE f.id = me.fixture_id AND f.tenant_id = me.tenant_id),
                    (SELECT substr(r.match_date, 1, 10) FROM team_results r WHERE CAST(r.id AS TEXT) = me.fixture_id AND r.tenant_id = me.tenant_id)
                  ) BETWEEN ? AND ?)
                GROUP BY player_id
            ) e ON e.player_id = s.id
            LEFT JOIN (
                SELECT ml.player_id, COUNT(DISTINCT ml.fixture_id) AS apps
                FROM match_lineups ml JOIN fixtures f ON f.id = ml.fixture_id AND f.tenant_id = ml.tenant_id
                WHERE ml.tenant_id = ? AND f.status = 'completed' AND (? IS NULL OR substr(f.fixture_date, 1, 10) BETWEEN ? AND ?)
                  AND (ml.role = 'starter' OR EXISTS (
                    SELECT 1 FROM live_match_events le WHERE le.tenant_id = ml.tenant_id AND le.fixture_id = ml.fixture_id
                      AND le.type = 'sub' AND le.player_id = ml.player_id AND le.deleted_at IS NULL))
                GROUP BY ml.player_id
            ) a ON a.player_id = s.id
            LEFT JOIN (
                SELECT player_id, SUM(appearances) AS apps, SUM(goals) AS goals, SUM(assists) AS assists,
                       SUM(yellow_cards) AS yellow, SUM(red_cards) AS red, SUM(motm) AS motm
                FROM player_stat_entries
                WHERE tenant_id = ? AND (? IS NULL OR season_from BETWEEN ? AND ?)
                GROUP BY player_id
            ) h ON h.player_id = s.id
            WHERE s.tenant_id = ?
            ORDER BY goals DESC, assists DESC, s.name
        `).bind(tenantId, from, from, to, tenantId, from, from, to, tenantId, from, from, to, tenantId).all<Record<string, any>>();
        const data = (results || []).map((r) => ({
            id: r.id,
            name: r.name,
            number: r.number,
            position: r.position,
            photo: r.photo,
            goals: Number(r.goals),
            assists: Number(r.assists),
            motmCount: Number(r.motm),
            yellowCards: Number(r.yellow_cards),
            redCards: Number(r.red_cards),
            appearances: Number(r.appearances),
        }));
        return json({ success: true, data, meta: { season: season ? { id: season.id, label: season.label } : null } }, 200, corsHdrs);
    } catch (err) {
        console.error(JSON.stringify({ level: 'error', msg: 'player_stats_failed', tenantId, error: err instanceof Error ? err.message : String(err) }));
        return json({ success: false, error: { code: 'INTERNAL', message: "We couldn't load the stats. Please try again." } }, 500, corsHdrs);
    }
}
