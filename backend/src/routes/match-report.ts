
import { outcomeFromScores } from "../services/results";
import { z } from 'zod';
import { requireJWT } from '../services/auth';
import { json } from '../services/util';

const MatchEventSchema = z.object({
    playerId: z.string(),
    eventType: z.enum(['goal', 'assist', 'yellow_card', 'red_card', 'motm']),
    minute: z.number().optional(),
});

const MatchReportSchema = z.object({
    homeScore: z.number(),
    awayScore: z.number(),
    events: z.array(MatchEventSchema),
});

export async function handleSaveMatchReport(req: Request, env: any, id: string): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;
        const body = await req.json();
        const report = MatchReportSchema.parse(body);

        const db = env.DB as D1Database;

        // Transaction: Update result + Replace events
        const batch: any[] = [];

        // 1. Update/Insert Result (Score)
        // We assume the result might already exist or we need to create it.
        // For simplicity, let's update the existing result for this fixture or match.
        // Wait, 'id' here is likely fixture_id. We need to know if we are updating 'team_results' or 'fixtures'.
        // The previous implementation had 'team_results' separate from 'fixtures'.
        // ideally we link them. Let's assume 'id' is the FIXTURE ID.
        // We need to find if there is a result linked to this fixture?
        // Or maybe we treat 'team_results' as the source of truth for scores.
        // Let's UPDATE the 'fixtures' table status to 'played' and create/update a 'team_results' entry?
        // Actually, simpler: Let's just update 'team_results' if we use that for stats.
        // BUT the implementation plan said "enable detailed match reporting linked to fixtures".
        // So let's store events linked to the fixture_id.

        // 1. Delete old events for this fixture (full replace)
        batch.push(
            db.prepare("DELETE FROM match_events WHERE tenant_id = ? AND fixture_id = ?").bind(tenantId, id)
        );

        // 2. Insert new events
        for (const event of report.events) {
            batch.push(
                db.prepare(
                    `INSERT INTO match_events (id, tenant_id, fixture_id, player_id, event_type, minute, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
                ).bind(
                    crypto.randomUUID(),
                    tenantId,
                    id,
                    event.playerId,
                    event.eventType,
                    event.minute || null,
                    Date.now()
                )
            );
        }

        // 3. Update Fixture Status / Score (if we store score on fixture now?)
        // In 'fixtures.ts' we have 'status'. In 'results' we have scores.
        // Let's upsert into 'results' table using the fixture info if possible, 
        // OR just rely on 'team_results' being separate.
        // For now, let's just save the EVENTS. The user can still use the "Add Result" flow for the score,
        // OR we can unify them. The prompt implies "Instead of just Add Result... click Enter Report".
        // So we should probably save the score too.
        // Let's try to update 'team_results' with a matching ID or Date?
        // Actually, best practice: 'fixtures' should have score columns or be linked 1:1 to 'results'.
        // Given the current separation, let's just update 'team_results' assuming the User provides the data.
        // But wait, 'team_results' has its own ID.
        // Let's stick to saving events for now, and maybe update 'fixtures' metadata if needed.
        // To keep it simple and robust: We will ONLY save events here. The score input in UI can call the existing 'createResult' or we can add logic here.
        // Let's add logic here to upsert a result linked to this fixture if we can. 
        // Since we don't have a direct link in schema yet, let's assume we proceed with JUST events for stats first.
        // Wait, user wants "Match Report" to input score too.
        // Let's do this: finding the fixture, getting its date/opponent, and upserting into 'team_results'.

        // FETCH FIXTURE
        const fixture = await db.prepare("SELECT * FROM fixtures WHERE id = ? AND tenant_id = ?").bind(id, tenantId).first();
        if (fixture) {
            // Upsert Result based on fixture data
            // strict match on date/opponent might be brittle but it's what we have in `fixtures.ts`
            // our_score = homeScore / their_score = awayScore, as elsewhere in the report flow
            const { result, points } = outcomeFromScores(report.homeScore, report.awayScore);
            batch.push(
                db.prepare(`
              INSERT INTO team_results (tenant_id, match_date, opponent, venue, competition, our_score, their_score, result, points, scorers)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(tenant_id, match_date, opponent) DO UPDATE SET
                our_score = excluded.our_score,
                their_score = excluded.their_score,
                result = excluded.result,
                points = excluded.points,
                scorers = excluded.scorers
            `).bind(
                    tenantId,
                    fixture.fixture_date,
                    fixture.opponent,
                    fixture.venue || 'TBC',
                    fixture.competition || 'League',
                    Number(report.homeScore) || 0,
                    Number(report.awayScore) || 0,
                    result,
                    points,
                    // Legacy text summary of scorers (player ids)
                    report.events.filter(e => e.eventType === 'goal').map(e => e.playerId).join(', ')
                )
            );

            // Mark fixture as played
            batch.push(
                db.prepare("UPDATE fixtures SET status = 'played' WHERE id = ?").bind(id)
            );
        }

        await db.batch(batch);

        return json({ success: true });

    } catch (err) {
        return json({
            error: 'Failed to save match report',
            message: err instanceof Error ? err.message : 'Unknown error'
        }, 500);
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
 * with an event, whichever is higher.
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
        const { results } = await (env.DB as D1Database).prepare(`
            SELECT s.id, s.name, s.number, s.position, COALESCE(s.headshot_url, s.photo_url) AS photo,
                   COALESCE(e.goals, 0) AS goals, COALESCE(e.assists, 0) AS assists, COALESCE(e.motm, 0) AS motm,
                   COALESCE(e.yellow, 0) AS yellow_cards, COALESCE(e.red, 0) AS red_cards,
                   MAX(COALESCE(a.apps, 0), COALESCE(e.fixtures, 0)) AS appearances
            FROM squad s
            LEFT JOIN (
                SELECT player_id, SUM(event_type = 'goal') AS goals, SUM(event_type = 'assist') AS assists,
                       SUM(event_type = 'motm') AS motm, SUM(event_type = 'yellow_card') AS yellow,
                       SUM(event_type = 'red_card') AS red, COUNT(DISTINCT fixture_id) AS fixtures
                FROM match_events WHERE tenant_id = ? AND player_id IS NOT NULL GROUP BY player_id
            ) e ON e.player_id = s.id
            LEFT JOIN (
                SELECT ml.player_id, COUNT(DISTINCT ml.fixture_id) AS apps
                FROM match_lineups ml JOIN fixtures f ON f.id = ml.fixture_id AND f.tenant_id = ml.tenant_id
                WHERE ml.tenant_id = ? AND f.status = 'completed' AND (ml.role = 'starter' OR EXISTS (
                    SELECT 1 FROM live_match_events le WHERE le.tenant_id = ml.tenant_id AND le.fixture_id = ml.fixture_id
                      AND le.type = 'sub' AND le.player_id = ml.player_id AND le.deleted_at IS NULL))
                GROUP BY ml.player_id
            ) a ON a.player_id = s.id
            WHERE s.tenant_id = ?
            ORDER BY goals DESC, assists DESC, s.name
        `).bind(tenantId, tenantId, tenantId).all<Record<string, any>>();
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
        return json({ success: true, data }, 200, corsHdrs);
    } catch (err) {
        console.error(JSON.stringify({ level: 'error', msg: 'player_stats_failed', tenantId, error: err instanceof Error ? err.message : String(err) }));
        return json({ success: false, error: { code: 'INTERNAL', message: "We couldn't load the stats. Please try again." } }, 500, corsHdrs);
    }
}
