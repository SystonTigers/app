import type { Env } from '../env';
import { nowUTC } from '../utils/time';

/**
 * Daily cron job - Runs at 06:00 UTC
 * Handles:
 * - Birthday posts
 * - Daily quotes/motivation
 * - Match day countdowns (when countdownsOnly=true at 08:00)
 */
export const runDaily = async (
  env: Env,
  ctx: ExecutionContext,
  options?: { countdownsOnly?: boolean }
) => {
  const now = nowUTC();
  const today = now.toFormat('yyyy-MM-dd');

  console.log(`Running daily cron job for ${today}`, options);

  try {
    // Get all active tenants
    const tenants = await getAllTenants(env);

    for (const tenant of tenants) {
      if (options?.countdownsOnly) {
        // 08:00 run - just countdowns
        await processCountdowns(env, tenant);
      } else {
        // 06:00 run - birthdays and quotes
        await processBirthdays(env, tenant, today);
        await processQuotes(env, tenant);
      }
    }

    console.log(`Daily cron completed for ${tenants.length} tenants`);
  } catch (error) {
    console.error('Daily cron error:', error);
  }
};

// Get all active tenants from KV
async function getAllTenants(env: Env): Promise<string[]> {
  // List all tenant config keys
  const list = await env.KV.list({ prefix: 'team:' });
  const tenants = new Set<string>();

  for (const key of list.keys) {
    // Extract tenant ID from key like "team:tenant-id:config"
    const parts = key.name.split(':');
    if (parts.length >= 2) {
      tenants.add(parts[1]);
    }
  }

  return Array.from(tenants);
}

// Process birthday posts for a tenant
async function processBirthdays(env: Env, tenant: string, today: string) {
  const config: any = await env.KV.get(`team:${tenant}:config`, 'json');

  if (!config || !config.features?.auto_birthdays) {
    return; // Feature not enabled
  }

  // Get squad/player data
  const players: any = await env.KV.get(`squad:${tenant}`, 'json');

  if (!players || !Array.isArray(players)) {
    return;
  }

  // Check for birthdays today
  const todayMMDD = today.substring(5); // "MM-DD"

  for (const player of players) {
    if (player.birthday && player.birthday.substring(5) === todayMMDD) {
      // Birthday today! Create auto-post
      await createBirthdayPost(env, tenant, player);
    }
  }
}

// Create birthday post
async function createBirthdayPost(env: Env, tenant: string, player: any) {
  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'birthday',
    player_id: player.id,
    player_name: player.name,
    age: calculateAge(player.birthday),
    template: 'birthday',
    created_at: Date.now(),
    status: 'pending',
  };

  // Store in KV for Make.com to pick up
  await env.KV.put(
    `autopost:${tenant}:${post.id}`,
    JSON.stringify(post),
    { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
  );

  // Trigger Make.com webhook if configured
  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'birthday',
        tenant,
        post,
      }),
    });
  }

  console.log(`Created birthday post for ${player.name} (${tenant})`);
}

// Calculate age from birthday
function calculateAge(birthday: string): number {
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

// Process daily quote/motivation posts
async function processQuotes(env: Env, tenant: string) {
  const config: any = await env.KV.get(`team:${tenant}:config`, 'json');

  if (!config || !config.features?.auto_quotes) {
    return;
  }

  // Create daily quote post
  const quotes = [
    "Hard work beats talent when talent doesn't work hard.",
    "Champions keep playing until they get it right.",
    "The harder the battle, the sweeter the victory.",
    "Success is no accident. It's hard work, perseverance, and learning.",
    "It's not whether you get knocked down, it's whether you get up.",
  ];

  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'quote',
    content: randomQuote,
    template: 'quote',
    created_at: Date.now(),
    status: 'pending',
  };

  await env.KV.put(
    `autopost:${tenant}:${post.id}`,
    JSON.stringify(post),
    { expirationTtl: 60 * 60 * 24 } // 1 day
  );

  console.log(`Created daily quote for ${tenant}`);
}

// Process match day countdowns
async function processCountdowns(env: Env, tenant: string) {
  const config: any = await env.KV.get(`team:${tenant}:config`, 'json');

  if (!config || !config.features?.auto_countdowns) {
    return;
  }

  // Get next fixture
  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.prepare(`
    SELECT * FROM matches
    WHERE team_id = ? AND date_utc > ? AND status = 'scheduled'
    ORDER BY date_utc ASC
    LIMIT 1
  `).bind(tenant, now).first();

  if (!result) {
    return; // No upcoming matches
  }

  // Calculate hours until match
  const hoursUntil = Math.floor((result.date_utc - now) / 3600);

  // Only post if match is today or tomorrow
  if (hoursUntil <= 48) {
    const post = {
      id: crypto.randomUUID(),
      tenant,
      type: 'countdown',
      match_id: result.id,
      hours_until: hoursUntil,
      template: 'countdown',
      created_at: Date.now(),
      status: 'pending',
    };

    await env.KV.put(
      `autopost:${tenant}:${post.id}`,
      JSON.stringify(post),
      { expirationTtl: 60 * 60 * 24 } // 1 day
    );

    console.log(`Created countdown post for ${tenant}: ${hoursUntil}h until match`);
  }
}
