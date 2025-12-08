import { logJSON } from '../lib/log';
import type { Env } from '../env';
import { nowUTC } from '../utils/time';

/**
 * Seasonal Content cron job
 * Handles:
 * - Weekly stats roundup (Mondays)
 * - Season start announcements
 * - Mid-season reviews
 * - End of season summaries & awards
 */

// Weekly stats roundup - runs every Monday at 10:00 UTC
export const runWeeklyRoundup = async (env: Env, ctx: ExecutionContext) => {
  const now = nowUTC();
  const today = now.toFormat('yyyy-MM-dd');

  logJSON({ level: 'info', msg: 'Running weekly stats roundup', date: today });

  try {
    const tenants = await getTenantsWithFeature(env, 'auto_weekly_roundup');

    let postsCreated = 0;
    for (const config of tenants) {
      const created = await createWeeklyRoundup(env, config);
      if (created) postsCreated++;
    }

    logJSON({
      level: 'info',
      msg: 'Weekly roundup completed',
      tenantsChecked: tenants.length,
      postsCreated,
    });
  } catch (error) {
    logJSON({
      level: 'error',
      msg: 'Weekly roundup error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Season summary check - runs on specific dates
export const runSeasonCheck = async (env: Env, ctx: ExecutionContext) => {
  const now = nowUTC();
  const today = now.toFormat('yyyy-MM-dd');
  const monthDay = now.toFormat('MM-dd');

  logJSON({ level: 'info', msg: 'Running season check', date: today });

  try {
    const tenants = await getTenantsWithFeature(env, 'auto_season_posts');

    for (const config of tenants) {
      // Check for season milestones
      const seasonDates = config.features?.season_dates || {
        start: '09-01',      // Season start
        mid: '01-01',        // Mid-season
        end: '05-31',        // Season end
      };

      if (monthDay === seasonDates.start) {
        await createSeasonStartPost(env, config);
      } else if (monthDay === seasonDates.mid) {
        await createMidSeasonReview(env, config);
      } else if (monthDay === seasonDates.end) {
        await createSeasonEndSummary(env, config);
      }
    }

    logJSON({ level: 'info', msg: 'Season check completed' });
  } catch (error) {
    logJSON({
      level: 'error',
      msg: 'Season check error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Get tenants with specific feature enabled
async function getTenantsWithFeature(env: Env, feature: string): Promise<any[]> {
  const list = await env.KV.list({ prefix: 'team:' });
  const tenants = [];

  for (const key of list.keys) {
    if (key.name.endsWith(':config')) {
      const config: any = await env.KV.get(key.name, 'json');
      if (config?.features?.[feature]) {
        tenants.push(config);
      }
    }
  }

  return tenants;
}

// Create weekly stats roundup
async function createWeeklyRoundup(env: Env, config: any): Promise<boolean> {
  const tenant = config.team_id;
  const now = Date.now();
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const weekAgoTimestamp = Math.floor(weekAgo / 1000);

  // Check if already posted this week
  const weekKey = `weekly:${tenant}:${new Date().toISOString().substring(0, 10)}`;
  const alreadyPosted = await env.KV.get(weekKey);
  if (alreadyPosted) return false;

  // Get last week's results
  const results = await env.DB.prepare(`
    SELECT * FROM team_results
    WHERE tenant_id = ?
    AND match_date >= date(?, 'unixepoch')
    ORDER BY match_date DESC
  `).bind(tenant, weekAgoTimestamp).all();

  const matches = results.results || [];
  if (matches.length === 0) return false;

  // Calculate stats
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
  for (const match of matches as any[]) {
    const our = match.our_score || 0;
    const their = match.their_score || 0;
    goalsFor += our;
    goalsAgainst += their;
    if (our > their) wins++;
    else if (our === their) draws++;
    else losses++;
  }

  // Get top scorers this week
  const topScorers = await env.DB.prepare(`
    SELECT
      me.player_id,
      p.name as player_name,
      COUNT(*) as goals
    FROM match_events me
    INNER JOIN squad_players p ON me.player_id = p.id AND p.tenant_id = ?
    WHERE me.tenant_id = ?
    AND me.event_type = 'goal'
    AND me.created_at >= ?
    GROUP BY me.player_id
    ORDER BY goals DESC
    LIMIT 3
  `).bind(tenant, tenant, weekAgo).all();

  // Build message
  const played = wins + draws + losses;
  const points = (wins * 3) + draws;
  const goalDiff = goalsFor - goalsAgainst;

  let message = `📊 Weekly Roundup!\n\n`;
  message += `Matches played: ${played}\n`;
  message += `Record: ${wins}W-${draws}D-${losses}L (${points} pts)\n`;
  message += `Goals: ${goalsFor} scored, ${goalsAgainst} conceded (${goalDiff >= 0 ? '+' : ''}${goalDiff})\n`;

  if ((topScorers.results || []).length > 0) {
    message += `\n⚽ Top scorers this week:\n`;
    for (const scorer of topScorers.results as any[]) {
      message += `- ${scorer.player_name}: ${scorer.goals} goal${scorer.goals > 1 ? 's' : ''}\n`;
    }
  }

  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'weekly_roundup',
    stats: { played, wins, draws, losses, goalsFor, goalsAgainst, points },
    top_scorers: topScorers.results,
    message,
    template: 'weekly_roundup',
    created_at: Date.now(),
    status: 'pending',
  };

  // Store and trigger webhook
  await env.KV.put(`autopost:${tenant}:${post.id}`, JSON.stringify(post), { expirationTtl: 60 * 60 * 24 * 7 });
  await env.KV.put(weekKey, 'posted', { expirationTtl: 60 * 60 * 24 * 7 });

  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'weekly_roundup',
        event_type: 'weekly_roundup',
        tenant,
        post,
        message,
        hashtags: ['#WeeklyRoundup', '#GrassrootsFootball', '#TeamStats'],
      }),
    });
  }

  logJSON({ level: 'info', msg: 'Created weekly roundup', tenant, played, wins });
  return true;
}

// Create season start post
async function createSeasonStartPost(env: Env, config: any) {
  const tenant = config.team_id;
  const season = new Date().getFullYear();

  const seasonKey = `season_start:${tenant}:${season}`;
  if (await env.KV.get(seasonKey)) return;

  // Get squad size
  const squad = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM squad_players WHERE tenant_id = ?'
  ).bind(tenant).first();

  // Get first fixture
  const nextFixture = await env.DB.prepare(`
    SELECT * FROM fixtures
    WHERE tenant_id = ? AND status = 'scheduled'
    ORDER BY fixture_date ASC
    LIMIT 1
  `).bind(tenant).first();

  const message = `🏆 The ${season}/${season + 1} season is here!\n\n` +
    `We're ready with a squad of ${squad?.count || 0} players.\n` +
    (nextFixture ? `First match: vs ${(nextFixture as any).opponent} on ${(nextFixture as any).fixture_date}\n` : '') +
    `\nLet's make it a great season! 💪`;

  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'season_start',
    season: `${season}/${season + 1}`,
    message,
    template: 'season_start',
    created_at: Date.now(),
    status: 'pending',
  };

  await env.KV.put(`autopost:${tenant}:${post.id}`, JSON.stringify(post), { expirationTtl: 60 * 60 * 24 * 30 });
  await env.KV.put(seasonKey, 'posted', { expirationTtl: 60 * 60 * 24 * 365 });

  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'season_start',
        event_type: 'season_start',
        tenant,
        post,
        message,
        hashtags: ['#NewSeason', '#GrassrootsFootball', '#LetsGo'],
      }),
    });
  }

  logJSON({ level: 'info', msg: 'Created season start post', tenant, season });
}

// Create mid-season review
async function createMidSeasonReview(env: Env, config: any) {
  const tenant = config.team_id;
  const season = new Date().getFullYear();

  const midSeasonKey = `mid_season:${tenant}:${season}`;
  if (await env.KV.get(midSeasonKey)) return;

  // Get season stats
  const stats = await env.DB.prepare(`
    SELECT
      COUNT(*) as matches,
      SUM(CASE WHEN our_score > their_score THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN our_score = their_score THEN 1 ELSE 0 END) as draws,
      SUM(CASE WHEN our_score < their_score THEN 1 ELSE 0 END) as losses,
      SUM(our_score) as goals_for,
      SUM(their_score) as goals_against
    FROM team_results
    WHERE tenant_id = ?
  `).bind(tenant).first() as any;

  if (!stats || stats.matches === 0) return;

  // Get top scorer
  const topScorer = await env.DB.prepare(`
    SELECT
      p.name,
      COUNT(*) as goals
    FROM match_events me
    INNER JOIN squad_players p ON me.player_id = p.id AND p.tenant_id = ?
    WHERE me.tenant_id = ? AND me.event_type = 'goal'
    GROUP BY me.player_id
    ORDER BY goals DESC
    LIMIT 1
  `).bind(tenant, tenant).first() as any;

  const points = (stats.wins * 3) + stats.draws;
  const goalDiff = (stats.goals_for || 0) - (stats.goals_against || 0);

  let message = `📈 Mid-Season Review!\n\n`;
  message += `Matches: ${stats.matches}\n`;
  message += `Record: ${stats.wins}W-${stats.draws}D-${stats.losses}L\n`;
  message += `Points: ${points}\n`;
  message += `Goals: ${stats.goals_for || 0}-${stats.goals_against || 0} (${goalDiff >= 0 ? '+' : ''}${goalDiff})\n`;
  if (topScorer) {
    message += `\n⭐ Top scorer: ${topScorer.name} (${topScorer.goals} goals)\n`;
  }
  message += `\nKeep pushing for the second half! 🚀`;

  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'mid_season_review',
    season: `${season - 1}/${season}`,
    stats,
    top_scorer: topScorer,
    message,
    template: 'mid_season_review',
    created_at: Date.now(),
    status: 'pending',
  };

  await env.KV.put(`autopost:${tenant}:${post.id}`, JSON.stringify(post), { expirationTtl: 60 * 60 * 24 * 30 });
  await env.KV.put(midSeasonKey, 'posted', { expirationTtl: 60 * 60 * 24 * 365 });

  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'mid_season_review',
        event_type: 'mid_season_review',
        tenant,
        post,
        message,
        hashtags: ['#MidSeasonReview', '#GrassrootsFootball', '#TeamStats'],
      }),
    });
  }

  logJSON({ level: 'info', msg: 'Created mid-season review', tenant });
}

// Create end of season summary
async function createSeasonEndSummary(env: Env, config: any) {
  const tenant = config.team_id;
  const season = new Date().getFullYear();

  const seasonEndKey = `season_end:${tenant}:${season}`;
  if (await env.KV.get(seasonEndKey)) return;

  // Get full season stats
  const stats = await env.DB.prepare(`
    SELECT
      COUNT(*) as matches,
      SUM(CASE WHEN our_score > their_score THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN our_score = their_score THEN 1 ELSE 0 END) as draws,
      SUM(CASE WHEN our_score < their_score THEN 1 ELSE 0 END) as losses,
      SUM(our_score) as goals_for,
      SUM(their_score) as goals_against
    FROM team_results
    WHERE tenant_id = ?
  `).bind(tenant).first() as any;

  if (!stats || stats.matches === 0) return;

  // Get top scorers
  const topScorers = await env.DB.prepare(`
    SELECT
      p.name,
      COUNT(*) as goals
    FROM match_events me
    INNER JOIN squad_players p ON me.player_id = p.id AND p.tenant_id = ?
    WHERE me.tenant_id = ? AND me.event_type = 'goal'
    GROUP BY me.player_id
    ORDER BY goals DESC
    LIMIT 3
  `).bind(tenant, tenant).all();

  // Get top assist providers
  const topAssisters = await env.DB.prepare(`
    SELECT
      p.name,
      COUNT(*) as assists
    FROM match_events me
    INNER JOIN squad_players p ON me.player_id = p.id AND p.tenant_id = ?
    WHERE me.tenant_id = ? AND me.event_type = 'assist'
    GROUP BY me.player_id
    ORDER BY assists DESC
    LIMIT 3
  `).bind(tenant, tenant).all();

  const points = (stats.wins * 3) + stats.draws;
  const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;

  let message = `🏆 Season ${season - 1}/${season} Complete!\n\n`;
  message += `📊 Final Stats:\n`;
  message += `Played: ${stats.matches} | Won: ${stats.wins} | Drew: ${stats.draws} | Lost: ${stats.losses}\n`;
  message += `Points: ${points} | Win Rate: ${winRate}%\n`;
  message += `Goals: ${stats.goals_for || 0} scored, ${stats.goals_against || 0} conceded\n`;

  if ((topScorers.results || []).length > 0) {
    message += `\n⚽ Golden Boot:\n`;
    for (const s of topScorers.results as any[]) {
      message += `${s.name}: ${s.goals} goals\n`;
    }
  }

  if ((topAssisters.results || []).length > 0) {
    message += `\n🎯 Top Playmakers:\n`;
    for (const a of topAssisters.results as any[]) {
      message += `${a.name}: ${a.assists} assists\n`;
    }
  }

  message += `\nThank you to all players, coaches, and supporters! See you next season! 🙌`;

  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'season_end_summary',
    season: `${season - 1}/${season}`,
    stats,
    awards: {
      top_scorers: topScorers.results,
      top_assisters: topAssisters.results,
    },
    message,
    template: 'season_end_summary',
    created_at: Date.now(),
    status: 'pending',
  };

  await env.KV.put(`autopost:${tenant}:${post.id}`, JSON.stringify(post), { expirationTtl: 60 * 60 * 24 * 30 });
  await env.KV.put(seasonEndKey, 'posted', { expirationTtl: 60 * 60 * 24 * 365 });

  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'season_end_summary',
        event_type: 'season_end_summary',
        tenant,
        post,
        message,
        hashtags: ['#SeasonEnd', '#GrassrootsFootball', '#TeamAwards', '#ThankYou'],
      }),
    });
  }

  logJSON({ level: 'info', msg: 'Created season end summary', tenant });
}
