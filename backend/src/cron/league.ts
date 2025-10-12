import type { Env } from '../env';

/**
 * League table refresh cron job - Runs every 6 hours
 * Handles:
 * - Fetching latest league table data from FA/external sources
 * - Updating cached league standings
 * - Detecting position changes
 */
export const runLeague = async (env: Env, ctx: ExecutionContext) => {
  console.log('Running league table refresh cron job');

  try {
    // Get all active tenants with league table tracking enabled
    const tenants = await getTenantsWithLeagueTracking(env);

    for (const tenant of tenants) {
      await refreshLeagueTable(env, tenant);
    }

    console.log(`League refresh completed for ${tenants.length} tenants`);
  } catch (error) {
    console.error('League cron error:', error);
  }
};

// Get tenants that have league table tracking enabled
async function getTenantsWithLeagueTracking(env: Env): Promise<any[]> {
  const list = await env.KV.list({ prefix: 'team:' });
  const tenants = [];

  for (const key of list.keys) {
    if (key.name.endsWith(':config')) {
      const config: any = await env.KV.get(key.name, 'json');

      if (config?.features?.auto_league_updates && config?.league_url) {
        tenants.push(config);
      }
    }
  }

  return tenants;
}

// Refresh league table for a tenant
async function refreshLeagueTable(env: Env, config: any) {
  const tenant = config.team_id;

  console.log(`Refreshing league table for ${tenant}`);

  try {
    // Get previous table
    const previousTable: any = await env.KV.get(
      `league:${tenant}:table`,
      'json'
    );

    // Fetch new table data from external source
    const newTable = await fetchLeagueData(config.league_url);

    if (!newTable || !newTable.standings) {
      console.log(`No league data found for ${tenant}`);
      return;
    }

    // Store updated table
    await env.KV.put(
      `league:${tenant}:table`,
      JSON.stringify({
        ...newTable,
        last_updated: Date.now(),
      })
    );

    // Detect position changes
    if (previousTable && previousTable.standings) {
      const changes = detectPositionChanges(
        previousTable.standings,
        newTable.standings,
        tenant
      );

      // Create auto-post if position changed
      if (changes.length > 0) {
        await createLeagueUpdatePost(env, tenant, newTable, changes);
      }
    }

    console.log(`League table updated for ${tenant}`);
  } catch (error) {
    console.error(`Failed to refresh league table for ${tenant}:`, error);
  }
}

// Fetch league data from external source
async function fetchLeagueData(url: string): Promise<any> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Parse response (could be HTML, JSON, or FA snippet)
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await response.json();
    } else {
      // HTML parsing would go here
      // For now, return null
      return null;
    }
  } catch (error) {
    console.error('Failed to fetch league data:', error);
    return null;
  }
}

// Detect position changes between two tables
function detectPositionChanges(
  oldStandings: any[],
  newStandings: any[],
  teamName: string
): any[] {
  const changes = [];

  // Find our team in both tables
  const oldPos = oldStandings.findIndex(
    (t) => t.team === teamName || t.team_id === teamName
  );
  const newPos = newStandings.findIndex(
    (t) => t.team === teamName || t.team_id === teamName
  );

  if (oldPos !== -1 && newPos !== -1 && oldPos !== newPos) {
    changes.push({
      type: 'position_change',
      old_position: oldPos + 1,
      new_position: newPos + 1,
      direction: newPos < oldPos ? 'up' : 'down',
    });
  }

  return changes;
}

// Create league update post
async function createLeagueUpdatePost(
  env: Env,
  tenant: string,
  table: any,
  changes: any[]
) {
  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'league_update',
    table,
    changes,
    template: 'league_update',
    created_at: Date.now(),
    status: 'pending',
  };

  await env.KV.put(
    `autopost:${tenant}:${post.id}`,
    JSON.stringify(post),
    { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
  );

  // Trigger webhook
  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'league_update',
        tenant,
        post,
      }),
    });
  }

  console.log(`Created league update post for ${tenant}:`, changes);
}
