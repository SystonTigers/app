import { ok } from '../utils/response';
import { nowUTC } from '../utils/time';
import type { Env } from '../env';

// Get next upcoming fixture for tenant
export const getNextFixture = async (req: any, env: Env) => {
  const now = Math.floor(Date.now() / 1000);

  // Query D1 for next match
  const result = await env.DB.prepare(`
    SELECT * FROM matches
    WHERE team_id = ? AND date_utc > ? AND status = 'scheduled'
    ORDER BY date_utc ASC
    LIMIT 1
  `).bind(req.tenant, now).first();

  if (!result) {
    return ok({ fixture: null });
  }

  return ok({ fixture: result });
};

// Get league table from KV
export const getLeagueTable = async (req: any, env: Env) => {
  const key = `league:${req.tenant}:table`;
  const table = await env.KV.get(key, 'json');

  return ok({
    table: table || {
      standings: [],
      last_updated: null,
    },
  });
};

// Upsert league table (admin/coach only)
export const upsertLeagueTable = async (req: any, env: Env) => {
  const { standings, competition, season } = req.json || {};

  if (!standings || !Array.isArray(standings)) {
    return new Response(
      JSON.stringify({ error: 'standings array required' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const table = {
    standings,
    competition: competition || 'Unknown',
    season: season || new Date().getFullYear(),
    last_updated: Date.now(),
  };

  const key = `league:${req.tenant}:table`;
  await env.KV.put(key, JSON.stringify(table));

  return ok({ success: true, table });
};

// Create new match
export const createMatch = async (req: any, env: Env) => {
  const {
    home_team,
    away_team,
    date_utc,
    venue,
    lat,
    lon,
    competition,
  } = req.json || {};

  if (!home_team || !away_team || !date_utc) {
    return new Response(
      JSON.stringify({ error: 'home_team, away_team, and date_utc required' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const match_id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO matches (
      id, team_id, date_utc, venue, lat, lon, status
    ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
  `).bind(
    match_id,
    req.tenant,
    date_utc,
    venue || null,
    lat || null,
    lon || null
  ).run();

  // Store extended match data in KV
  await env.KV.put(
    `match:${req.tenant}:${match_id}`,
    JSON.stringify({
      match_id,
      home_team,
      away_team,
      date_utc,
      venue,
      lat,
      lon,
      competition,
      status: 'scheduled',
      created_at: Date.now(),
    })
  );

  return ok({ match_id, status: 'scheduled' });
};

// Get match details
export const getMatch = async (req: any, env: Env) => {
  const url = new URL(req.url);
  const match_id = url.pathname.split('/').pop();

  const match = await env.KV.get(
    `match:${req.tenant}:${match_id}`,
    'json'
  );

  if (!match) {
    return new Response(
      JSON.stringify({ error: 'Match not found' }),
      { status: 404, headers: { 'content-type': 'application/json' } }
    );
  }

  return ok({ match });
};

// Update match status/score
export const updateMatch = async (req: any, env: Env) => {
  const url = new URL(req.url);
  const match_id = url.pathname.split('/').pop();
  const { status, home_score, away_score } = req.json || {};

  const matchKey = `match:${req.tenant}:${match_id}`;
  const match = await env.KV.get(matchKey, 'json');

  if (!match) {
    return new Response(
      JSON.stringify({ error: 'Match not found' }),
      { status: 404, headers: { 'content-type': 'application/json' } }
    );
  }

  const updated = {
    ...match,
    status: status || match.status,
    home_score: home_score !== undefined ? home_score : match.home_score,
    away_score: away_score !== undefined ? away_score : match.away_score,
    updated_at: Date.now(),
  };

  await env.KV.put(matchKey, JSON.stringify(updated));

  // Update D1 status if changed
  if (status) {
    await env.DB.prepare(`
      UPDATE matches SET status = ? WHERE id = ?
    `).bind(status, match_id).run();
  }

  return ok({ match: updated });
};
