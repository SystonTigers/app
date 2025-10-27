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

// Admin - List all fixtures
export const listFixtures = async (req: any, env: Env) => {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '20');

  const fixtures = await env.DB.prepare(`
    SELECT * FROM matches
    WHERE team_id = ?
    ORDER BY date_utc DESC
    LIMIT ?
  `).bind(req.tenant, limit).all();

  return ok({ data: fixtures.results || [] });
};

// Admin - Create fixture
export const createFixture = async (req: any, env: Env) => {
  const { opponent, date, time, venue, competition, homeAway, homeScore, awayScore } = req.json || {};

  if (!opponent || !date) {
    return new Response(
      JSON.stringify({ error: 'opponent and date required' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const fixture_id = crypto.randomUUID();
  const dateTime = time ? `${date}T${time}:00Z` : `${date}T00:00:00Z`;
  const date_utc = Math.floor(new Date(dateTime).getTime() / 1000);

  const fixture = {
    id: fixture_id,
    opponent,
    date,
    time: time || 'TBC',
    venue: venue || 'TBC',
    competition: competition || 'League',
    homeAway: homeAway || 'home',
    homeScore,
    awayScore,
    status: homeScore !== undefined ? 'completed' : 'scheduled',
    created_at: Date.now(),
  };

  // Store in KV
  await env.KV.put(`fixture:${req.tenant}:${fixture_id}`, JSON.stringify(fixture));

  // Also store in D1 for queries
  await env.DB.prepare(`
    INSERT INTO matches (id, team_id, date_utc, venue, status)
    VALUES (?, ?, ?, ?, ?)
  `).bind(fixture_id, req.tenant, date_utc, venue || 'TBC', fixture.status).run();

  return ok({ data: fixture, success: true });
};

// Admin - Update fixture
export const updateFixture = async (req: any, env: Env) => {
  const fixture_id = req.params.id;
  const updates = req.json || {};

  const fixtureKey = `fixture:${req.tenant}:${fixture_id}`;
  const fixture = await env.KV.get(fixtureKey, 'json');

  if (!fixture) {
    return new Response(
      JSON.stringify({ error: 'Fixture not found' }),
      { status: 404, headers: { 'content-type': 'application/json' } }
    );
  }

  const updated = { ...fixture, ...updates, updated_at: Date.now() };
  await env.KV.put(fixtureKey, JSON.stringify(updated));

  return ok({ data: updated, success: true });
};

// Admin - Delete fixture
export const deleteFixture = async (req: any, env: Env) => {
  const fixture_id = req.params.id;

  const fixtureKey = `fixture:${req.tenant}:${fixture_id}`;
  await env.KV.delete(fixtureKey);

  await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(fixture_id).run();

  return ok({ success: true });
};

// Admin - List squad
export const listSquad = async (req: any, env: Env) => {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');

  // Get all players from KV
  const listKey = `squad:${req.tenant}:list`;
  const players = await env.KV.get(listKey, 'json') || [];

  return ok({ data: players });
};

// Admin - Create player
export const createPlayer = async (req: any, env: Env) => {
  const { name, number, position, goals, assists, appearances, yellowCards, redCards } = req.json || {};

  if (!name || !number) {
    return new Response(
      JSON.stringify({ error: 'name and number required' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const player_id = crypto.randomUUID();
  const player = {
    id: player_id,
    name,
    number: parseInt(number),
    position: position || 'Forward',
    goals: parseInt(goals) || 0,
    assists: parseInt(assists) || 0,
    appearances: parseInt(appearances) || 0,
    yellowCards: parseInt(yellowCards) || 0,
    redCards: parseInt(redCards) || 0,
    created_at: Date.now(),
  };

  // Store individual player
  await env.KV.put(`player:${req.tenant}:${player_id}`, JSON.stringify(player));

  // Update squad list
  const listKey = `squad:${req.tenant}:list`;
  const squad = await env.KV.get(listKey, 'json') || [];
  squad.push(player);
  await env.KV.put(listKey, JSON.stringify(squad));

  return ok({ data: player, success: true });
};

// Admin - Update player
export const updatePlayer = async (req: any, env: Env) => {
  const player_id = req.params.id;
  const updates = req.json || {};

  const playerKey = `player:${req.tenant}:${player_id}`;
  const player = await env.KV.get(playerKey, 'json');

  if (!player) {
    return new Response(
      JSON.stringify({ error: 'Player not found' }),
      { status: 404, headers: { 'content-type': 'application/json' } }
    );
  }

  const updated = { ...player, ...updates, updated_at: Date.now() };
  await env.KV.put(playerKey, JSON.stringify(updated));

  // Update in squad list
  const listKey = `squad:${req.tenant}:list`;
  const squad = await env.KV.get(listKey, 'json') || [];
  const updatedSquad = squad.map((p: any) => p.id === player_id ? updated : p);
  await env.KV.put(listKey, JSON.stringify(updatedSquad));

  return ok({ data: updated, success: true });
};

// Admin - Delete player
export const deletePlayer = async (req: any, env: Env) => {
  const player_id = req.params.id;

  const playerKey = `player:${req.tenant}:${player_id}`;
  await env.KV.delete(playerKey);

  // Remove from squad list
  const listKey = `squad:${req.tenant}:list`;
  const squad = await env.KV.get(listKey, 'json') || [];
  const updatedSquad = squad.filter((p: any) => p.id !== player_id);
  await env.KV.put(listKey, JSON.stringify(updatedSquad));

  return ok({ success: true });
};

// Feed - List posts
export const listPosts = async (req: any, env: Env) => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  // Get posts from KV
  const postsKey = `feed:${req.tenant}:posts`;
  const allPosts = await env.KV.get(postsKey, 'json') || [];

  // Paginate
  const start = (page - 1) * limit;
  const posts = allPosts.slice(start, start + limit);

  return ok({ data: posts, total: allPosts.length, page, limit });
};

// Feed - Create post
export const createPost = async (req: any, env: Env) => {
  const { content, channels, media } = req.json || {};

  if (!content) {
    return new Response(
      JSON.stringify({ error: 'content required' }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const post_id = crypto.randomUUID();
  const post = {
    id: post_id,
    content,
    channels: channels || ['feed'],
    media: media || [],
    created_at: Date.now(),
    likes: 0,
  };

  // Store individual post
  await env.KV.put(`post:${req.tenant}:${post_id}`, JSON.stringify(post));

  // Add to posts list
  const postsKey = `feed:${req.tenant}:posts`;
  const posts = await env.KV.get(postsKey, 'json') || [];
  posts.unshift(post); // Add to beginning
  await env.KV.put(postsKey, JSON.stringify(posts));

  return ok({ data: post, success: true });
};
