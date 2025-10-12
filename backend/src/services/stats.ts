import { ok } from '../utils/response';
import type { Env } from '../env';

// Get team statistics
export const teamStats = async (req: any, env: Env) => {
  const url = new URL(req.url);
  const season = url.searchParams.get('season') || new Date().getFullYear().toString();

  // Query D1 for match results
  const matches = await env.DB.prepare(`
    SELECT * FROM matches
    WHERE team_id = ?
    AND status IN ('completed', 'final')
    ORDER BY date_utc DESC
  `).bind(req.tenant).all();

  const matchResults = matches.results || [];

  // Calculate team stats from KV match data
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goals_for = 0;
  let goals_against = 0;

  for (const match of matchResults) {
    const matchData: any = await env.KV.get(
      `match:${req.tenant}:${match.id}`,
      'json'
    );

    if (matchData && matchData.home_score !== undefined && matchData.away_score !== undefined) {
      goals_for += matchData.home_score;
      goals_against += matchData.away_score;

      if (matchData.home_score > matchData.away_score) {
        wins++;
      } else if (matchData.home_score === matchData.away_score) {
        draws++;
      } else {
        losses++;
      }
    }
  }

  const played = wins + draws + losses;
  const points = wins * 3 + draws;
  const goal_difference = goals_for - goals_against;

  return ok({
    season,
    played,
    wins,
    draws,
    losses,
    goals_for,
    goals_against,
    goal_difference,
    points,
  });
};

// Get player statistics
export const playerStats = async (req: any, env: Env) => {
  const url = new URL(req.url);
  const player_id = url.searchParams.get('player_id');
  const season = url.searchParams.get('season') || new Date().getFullYear().toString();

  if (!player_id) {
    // Return stats for all players
    return await getAllPlayersStats(req, env, season);
  }

  // Query D1 for player events
  const events = await env.DB.prepare(`
    SELECT e.*, m.date_utc
    FROM events e
    JOIN matches m ON e.match_id = m.id
    WHERE m.team_id = ?
    AND e.player_id = ?
    ORDER BY m.date_utc DESC
  `).bind(req.tenant, player_id).all();

  const eventList = events.results || [];

  // Calculate stats
  let goals = 0;
  let assists = 0;
  let yellow_cards = 0;
  let red_cards = 0;
  let appearances = 0;
  let sin_bins = 0;

  const matchesPlayed = new Set();

  for (const event of eventList) {
    matchesPlayed.add(event.match_id);

    switch (event.type) {
      case 'goal':
        goals++;
        break;
      case 'assist':
        assists++;
        break;
      case 'card_yellow':
        yellow_cards++;
        break;
      case 'card_red':
        red_cards++;
        break;
      case 'sin_bin':
        sin_bins++;
        break;
    }
  }

  appearances = matchesPlayed.size;

  return ok({
    player_id,
    season,
    appearances,
    goals,
    assists,
    yellow_cards,
    red_cards,
    sin_bins,
  });
};

// Get stats for all players
async function getAllPlayersStats(req: any, env: Env, season: string) {
  // Query D1 for all player events
  const events = await env.DB.prepare(`
    SELECT e.*, m.date_utc
    FROM events e
    JOIN matches m ON e.match_id = m.id
    WHERE m.team_id = ?
    ORDER BY m.date_utc DESC
  `).bind(req.tenant).all();

  const eventList = events.results || [];

  // Build stats map
  const playerStats = new Map<string, any>();

  for (const event of eventList) {
    if (!event.player_id) continue;

    if (!playerStats.has(event.player_id)) {
      playerStats.set(event.player_id, {
        player_id: event.player_id,
        appearances: 0,
        goals: 0,
        assists: 0,
        yellow_cards: 0,
        red_cards: 0,
        sin_bins: 0,
        matches: new Set(),
      });
    }

    const stats = playerStats.get(event.player_id);
    stats.matches.add(event.match_id);

    switch (event.type) {
      case 'goal':
        stats.goals++;
        break;
      case 'assist':
        stats.assists++;
        break;
      case 'card_yellow':
        stats.yellow_cards++;
        break;
      case 'card_red':
        stats.red_cards++;
        break;
      case 'sin_bin':
        stats.sin_bins++;
        break;
    }
  }

  // Convert to array and calculate appearances
  const players = Array.from(playerStats.values()).map((stats) => {
    const { matches, ...rest } = stats;
    return {
      ...rest,
      appearances: matches.size,
    };
  });

  // Sort by goals desc
  players.sort((a, b) => b.goals - a.goals);

  return ok({
    season,
    players,
  });
}

// Get top scorers
export const getTopScorers = async (req: any, env: Env) => {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');

  const response = await getAllPlayersStats(req, env, '');
  const data = await response.json();

  const topScorers = data.players.slice(0, limit);

  return ok({ top_scorers: topScorers });
};
