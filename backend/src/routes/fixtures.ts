import { z } from 'zod';
import { requireJWT } from '../services/auth';
import { json } from '../services/util';

// Zod validation schemas
const FixtureSyncSchema = z.object({
  fixtures: z.array(z.object({
    date: z.string(),
    opponent: z.string(),
    venue: z.string().optional(),
    competition: z.string().optional(),
    time: z.string().optional(),
    status: z.string().optional(),
    source: z.string().optional(),
  }))
});

const ResultSchema = z.object({
  date: z.string(),
  opponent: z.string(),
  homeScore: z.number().optional(),
  awayScore: z.number().optional(),
  venue: z.string().optional(),
  competition: z.string().optional(),
  scorers: z.string().optional(),
});

/**
 * POST /sync - Sync fixtures from Google Apps Script
 * Receives fixture data from consolidator and stores in D1
 * SECURITY: Requires JWT authentication (admin or service token)
 */
export async function handleFixtureSync(req: Request, env: any): Promise<Response> {
  try {
    // Require JWT authentication
    const claims = await requireJWT(req, env);

    const body = await req.json();
    const validated = FixtureSyncSchema.parse(body);
    const { fixtures } = validated;

    if (!Array.isArray(fixtures)) {
      return json({ error: 'Invalid fixtures data' }, 400);
    }

    let synced = 0;
    const db = env.DB as D1Database;

    for (const fixture of fixtures) {
      try {
        // Insert or replace fixture - SECURITY: Include tenant_id
        await db.prepare(`
          INSERT INTO fixtures (
            tenant_id,
            fixture_date,
            opponent,
            home_team,
            away_team,
            venue,
            competition,
            kick_off_time,
            status,
            source,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(tenant_id, fixture_date, home_team, away_team)
          DO UPDATE SET
            venue = excluded.venue,
            competition = excluded.competition,
            kick_off_time = excluded.kick_off_time,
            status = excluded.status,
            source = excluded.source,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          claims.tenantId,
          fixture.date,
          fixture.opponent,
          fixture.homeTeam || 'Home',
          fixture.awayTeam || fixture.opponent,
          fixture.venue || '',
          fixture.competition || '',
          fixture.time || '',
          fixture.status || 'scheduled',
          fixture.source || 'unknown'
        ).run();

        synced++;
      } catch (err) {
      }
    }

    return json({
      success: true,
      synced
    });

  } catch (err) {
    return json({
      error: 'Failed to sync fixtures',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, 500);
  }
}

/**
 * GET /upcoming - Get upcoming fixtures
 * Returns next 10 scheduled fixtures for mobile app
 * SECURITY: Requires JWT authentication, filters by tenant_id
 */
export async function handleGetUpcomingFixtures(req: Request, env: any): Promise<Response> {
  try {
    // Require JWT authentication
    const claims = await requireJWT(req, env);

    const db = env.DB as D1Database;

    // SECURITY: Filter by tenant_id to prevent cross-tenant access
    const result = await db.prepare(`
      SELECT
        id,
        fixture_date as date,
        opponent,
        venue,
        competition,
        kick_off_time as kickOffTime,
        status,
        source
      FROM fixtures
      WHERE tenant_id = ?
        AND fixture_date >= DATE('now')
        AND status != 'postponed'
      ORDER BY fixture_date ASC
      LIMIT 10
    `).bind(claims.tenantId).all();

    return json(result.results || []);

  } catch (err) {
    return json({
      error: 'Failed to fetch fixtures',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, 500);
  }
}

/**
 * GET /all - Get all fixtures (upcoming and past)
 * Optional query params: status, limit
 * SECURITY: Requires JWT authentication, filters by tenant_id
 */
export async function handleGetAllFixtures(req: Request, env: any): Promise<Response> {
  try {
    // Require JWT authentication
    const claims = await requireJWT(req, env);

    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const db = env.DB as D1Database;

    // SECURITY: Always filter by tenant_id
    let query = `
      SELECT
        id,
        fixture_date as date,
        opponent,
        venue,
        competition,
        kick_off_time as kickOffTime,
        status,
        source
      FROM fixtures
      WHERE tenant_id = ?
    `;

    const params: (string | number)[] = [claims.tenantId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY fixture_date DESC LIMIT ?';
    params.push(limit);

    const result = await db.prepare(query).bind(...params).all();

    return json(result.results || []);

  } catch (err) {
    return json({
      error: 'Failed to fetch fixtures',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, 500);
  }
}

/**
 * GET /results - Get recent match results
 * Returns last 10 completed matches
 * SECURITY: Requires JWT authentication, filters by tenant_id
 */
export async function handleGetResults(req: Request, env: any): Promise<Response> {
  try {
    // Require JWT authentication
    const claims = await requireJWT(req, env);

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const db = env.DB as D1Database;

    // SECURITY: Filter by tenant_id to prevent cross-tenant access
    const result = await db.prepare(`
      SELECT
        id,
        match_date as date,
        opponent,
        home_score as homeScore,
        away_score as awayScore,
        venue,
        competition,
        scorers
      FROM results
      WHERE tenant_id = ?
      ORDER BY match_date DESC
      LIMIT ?
    `).bind(claims.tenantId, limit).all();

    return json(result.results || []);

  } catch (err) {
    return json({
      error: 'Failed to fetch results',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, 500);
  }
}

/**
 * POST /results - Add a match result
 * Stores completed match result in D1
 * SECURITY: Requires JWT authentication, includes tenant_id
 */
export async function handleAddResult(req: Request, env: any): Promise<Response> {
  try {
    // Require JWT authentication
    const claims = await requireJWT(req, env);

    const body = await req.json();
    const result = ResultSchema.parse(body);
    const db = env.DB as D1Database;

    // SECURITY: Include tenant_id in insert
    await db.prepare(`
      INSERT INTO results (
        tenant_id,
        match_date,
        opponent,
        home_score,
        away_score,
        venue,
        competition,
        scorers
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, match_date, opponent)
      DO UPDATE SET
        home_score = excluded.home_score,
        away_score = excluded.away_score,
        venue = excluded.venue,
        competition = excluded.competition,
        scorers = excluded.scorers
    `).bind(
      claims.tenantId,
      result.date,
      result.opponent,
      result.homeScore || 0,
      result.awayScore || 0,
      result.venue || '',
      result.competition || '',
      result.scorers || ''
    ).run();

    return json({ success: true });

  } catch (err) {
    return json({
      error: 'Failed to add result',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, 500);
  }
}

/**
 * DELETE /fixtures/:id - Delete a fixture by ID
 * SECURITY: Requires JWT authentication, validates tenant ownership
 */
export async function handleDeleteFixture(req: Request, env: any, id: string): Promise<Response> {
  try {
    // Require JWT authentication
    const claims = await requireJWT(req, env);

    const db = env.DB as D1Database;

    // SECURITY: Only delete if fixture belongs to tenant
    await db.prepare('DELETE FROM fixtures WHERE id = ? AND tenant_id = ?').bind(id, claims.tenantId).run();

    return json({ success: true });

  } catch (err) {
    return json({
      error: 'Failed to delete fixture',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, 500);
  }
}
