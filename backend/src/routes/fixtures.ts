import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { requireJWT } from '../services/auth';

type Env = {
  DB: D1Database;
  JWT_SECRET?: string;
  JWT_ISSUER?: string;
  JWT_AUDIENCE?: string;
};

const app = new Hono<{ Bindings: Env }>();

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
app.post('/sync', async (c: Context) => {
  try {
    // Require JWT authentication
    const request = c.req.raw;
    await requireJWT(request, c.env);

    const body = await c.req.json();
    const validated = FixtureSyncSchema.parse(body);
    const { fixtures } = validated;

    if (!Array.isArray(fixtures)) {
      return c.json({ error: 'Invalid fixtures data' }, 400);
    }

    let synced = 0;
    const db = c.env.DB as D1Database;

    for (const fixture of fixtures) {
      try {
        // Insert or replace fixture
        await db.prepare(`
          INSERT INTO fixtures (
            fixture_date,
            opponent,
            venue,
            competition,
            kick_off_time,
            status,
            source,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(fixture_date, opponent)
          DO UPDATE SET
            venue = excluded.venue,
            competition = excluded.competition,
            kick_off_time = excluded.kick_off_time,
            status = excluded.status,
            source = excluded.source,
            updated_at = CURRENT_TIMESTAMP
        `).bind(
          fixture.date,
          fixture.opponent,
          fixture.venue || '',
          fixture.competition || '',
          fixture.time || '',
          fixture.status || 'scheduled',
          fixture.source || 'unknown'
        ).run();

        synced++;
      } catch (err) {
        console.error('Error syncing fixture:', err);
      }
    }

    return c.json({
      success: true,
      synced
    });

  } catch (err) {
    console.error('Fixture sync error:', err);
    return c.json({
      error: 'Failed to sync fixtures',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /upcoming - Get upcoming fixtures
 * Returns next 10 scheduled fixtures for mobile app
 * SECURITY: Requires JWT authentication
 */
app.get('/upcoming', async (c: Context) => {
  try {
    // Require JWT authentication
    const request = c.req.raw;
    await requireJWT(request, c.env);

    const db = c.env.DB as D1Database;

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
      WHERE fixture_date >= DATE('now')
        AND status != 'postponed'
      ORDER BY fixture_date ASC
      LIMIT 10
    `).all();

    return c.json(result.results || []);

  } catch (err) {
    console.error('Get upcoming fixtures error:', err);
    return c.json({
      error: 'Failed to fetch fixtures',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /all - Get all fixtures (upcoming and past)
 * Optional query params: status, limit
 * SECURITY: Requires JWT authentication
 */
app.get('/all', async (c: Context) => {
  try {
    // Require JWT authentication
    const request = c.req.raw;
    await requireJWT(request, c.env);

    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');
    const db = c.env.DB as D1Database;

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
    `;

    const params: string[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY fixture_date DESC LIMIT ?';
    params.push(limit.toString());

    const result = await db.prepare(query).bind(...params).all();

    return c.json(result.results || []);

  } catch (err) {
    console.error('Get all fixtures error:', err);
    return c.json({
      error: 'Failed to fetch fixtures',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /results - Get recent match results
 * Returns last 10 completed matches
 * SECURITY: Requires JWT authentication
 */
app.get('/results', async (c: Context) => {
  try {
    // Require JWT authentication
    const request = c.req.raw;
    await requireJWT(request, c.env);

    const limit = parseInt(c.req.query('limit') || '10');
    const db = c.env.DB as D1Database;

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
      ORDER BY match_date DESC
      LIMIT ?
    `).bind(limit).all();

    return c.json(result.results || []);

  } catch (err) {
    console.error('Get results error:', err);
    return c.json({
      error: 'Failed to fetch results',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, 500);
  }
});

/**
 * POST /results - Add a match result
 * Stores completed match result in D1
 * SECURITY: Requires JWT authentication
 */
app.post('/results', async (c: Context) => {
  try {
    // Require JWT authentication
    const request = c.req.raw;
    await requireJWT(request, c.env);

    const body = await c.req.json();
    const result = ResultSchema.parse(body);
    const db = c.env.DB as D1Database;

    await db.prepare(`
      INSERT INTO results (
        match_date,
        opponent,
        home_score,
        away_score,
        venue,
        competition,
        scorers
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(match_date, opponent)
      DO UPDATE SET
        home_score = excluded.home_score,
        away_score = excluded.away_score,
        venue = excluded.venue,
        competition = excluded.competition,
        scorers = excluded.scorers
    `).bind(
      result.date,
      result.opponent,
      result.homeScore || 0,
      result.awayScore || 0,
      result.venue || '',
      result.competition || '',
      result.scorers || ''
    ).run();

    return c.json({ success: true });

  } catch (err) {
    console.error('Add result error:', err);
    return c.json({
      error: 'Failed to add result',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, 500);
  }
});

/**
 * DELETE /fixtures/:id - Delete a fixture by ID
 * SECURITY: Requires JWT authentication
 */
app.delete('/:id', async (c: Context) => {
  try {
    // Require JWT authentication
    const request = c.req.raw;
    await requireJWT(request, c.env);

    const id = c.req.param('id');
    const db = c.env.DB as D1Database;

    await db.prepare('DELETE FROM fixtures WHERE id = ?').bind(id).run();

    return c.json({ success: true });

  } catch (err) {
    console.error('Delete fixture error:', err);
    return c.json({
      error: 'Failed to delete fixture',
      message: err instanceof Error ? err.message : 'Unknown error'
    }, 500);
  }
});

export default app;
