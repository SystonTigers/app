import { logJSON } from '../lib/log';
import type { Env } from '../env';
import { nowUTC } from '../utils/time';

/**
 * Birthday Posts cron job - Runs daily at 08:00 UTC
 * Checks for player birthdays and creates celebratory posts
 */
export const runBirthdays = async (env: Env, ctx: ExecutionContext) => {
  const now = nowUTC();
  const today = now.toFormat('MM-dd'); // Month-day format for comparison
  const todayFull = now.toFormat('yyyy-MM-dd');

  logJSON({ level: 'info', msg: 'Running birthday check', date: todayFull });

  try {
    // Get all active tenants with birthdays feature enabled
    const tenants = await getTenantsWithBirthdays(env);

    let postsCreated = 0;
    for (const config of tenants) {
      const created = await checkBirthdays(env, config, today, todayFull);
      postsCreated += created;
    }

    logJSON({
      level: 'info',
      msg: 'Birthday check completed',
      tenantsChecked: tenants.length,
      postsCreated,
    });
  } catch (error) {
    logJSON({
      level: 'error',
      msg: 'Birthday check error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Get tenants with birthdays feature enabled
async function getTenantsWithBirthdays(env: Env): Promise<any[]> {
  const list = await env.KV.list({ prefix: 'team:' });
  const tenants = [];

  for (const key of list.keys) {
    if (key.name.endsWith(':config')) {
      const config: any = await env.KV.get(key.name, 'json');

      if (config?.features?.auto_birthdays) {
        tenants.push(config);
      }
    }
  }

  return tenants;
}

// Check for birthdays and create posts
async function checkBirthdays(
  env: Env,
  config: any,
  today: string,
  todayFull: string
): Promise<number> {
  const tenant = config.team_id;
  let postsCreated = 0;

  // Get players with birthdays today from D1
  const birthdayPlayers = await env.DB.prepare(`
    SELECT id, name, photo_url, position, birthday
    FROM squad_players
    WHERE tenant_id = ?
    AND strftime('%m-%d', birthday) = ?
  `).bind(tenant, today).all();

  // Also check KV squad data for players with birthdays
  const kvPlayers = await getKVBirthdayPlayers(env, tenant, today);

  // Combine and dedupe players
  const allPlayers = [...(birthdayPlayers.results || []), ...kvPlayers];
  const seenIds = new Set<string>();
  const uniquePlayers = allPlayers.filter((p: any) => {
    if (seenIds.has(p.id)) {return false;}
    seenIds.add(p.id);
    return true;
  });

  for (const player of uniquePlayers as any[]) {
    // Check if we already posted for this player today
    const postKey = `birthday:${tenant}:${player.id}:${todayFull}`;
    const alreadyPosted = await env.KV.get(postKey);

    if (alreadyPosted) {
      continue;
    }

    // Calculate age if birthday year is available
    const age = calculateAge(player.birthday);

    // Create birthday post
    await createBirthdayPost(env, tenant, player, age, config);

    // Mark as posted
    await env.KV.put(postKey, 'posted', {
      expirationTtl: 60 * 60 * 24 * 2, // 2 days TTL
    });

    postsCreated++;
  }

  return postsCreated;
}

// Get players from KV with birthdays today
async function getKVBirthdayPlayers(
  env: Env,
  tenant: string,
  today: string
): Promise<any[]> {
  const squad: any = await env.KV.get(`squad:${tenant}`, 'json');

  if (!squad || !Array.isArray(squad)) {
    return [];
  }

  return squad.filter((player: any) => {
    if (!player.birthday) {return false;}

    // Handle various date formats
    const birthday = player.birthday;
    let monthDay: string;

    if (birthday.includes('-')) {
      // Format: YYYY-MM-DD or MM-DD
      const parts = birthday.split('-');
      if (parts.length === 3) {
        monthDay = `${parts[1]}-${parts[2]}`;
      } else if (parts.length === 2) {
        monthDay = birthday;
      } else {
        return false;
      }
    } else if (birthday.includes('/')) {
      // Format: DD/MM/YYYY or MM/DD/YYYY
      const parts = birthday.split('/');
      if (parts.length === 3) {
        // Assume DD/MM/YYYY (UK format)
        monthDay = `${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else {
        return false;
      }
    } else {
      return false;
    }

    return monthDay === today;
  });
}

// Calculate age from birthday
function calculateAge(birthday: string): number | null {
  if (!birthday) {return null;}

  try {
    const birthDate = new Date(birthday);
    if (isNaN(birthDate.getTime())) {return null;}

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age > 0 && age < 100 ? age : null;
  } catch {
    return null;
  }
}

// Create birthday celebration post
async function createBirthdayPost(
  env: Env,
  tenant: string,
  player: any,
  age: number | null,
  config: any
) {
  // Generate birthday message with variations
  const messages = getBirthdayMessages(player.name, age);
  const message = messages[Math.floor(Math.random() * messages.length)];

  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'birthday',
    player: {
      id: player.id,
      name: player.name,
      photo_url: player.photo_url,
      position: player.position,
    },
    age,
    message,
    template: 'birthday',
    created_at: Date.now(),
    status: 'pending',
  };

  // Store the post
  await env.KV.put(
    `autopost:${tenant}:${post.id}`,
    JSON.stringify(post),
    { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
  );

  // Trigger webhook for Make.com
  const webhook = await env.KV.get(`team:${tenant}:webhook`);
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'birthday',
        event_type: 'player_birthday',
        tenant,
        post,
        player_name: player.name,
        player_photo: player.photo_url,
        age,
        message,
        hashtags: ['#HappyBirthday', '#TeamFamily', '#GrassrootsFootball', '#Celebration'],
      }),
    });
  }

  logJSON({
    level: 'info',
    msg: `Created birthday post for ${player.name}`,
    tenant,
    playerId: player.id,
    age,
  });
}

// Get varied birthday messages
function getBirthdayMessages(name: string, age: number | null): string[] {
  const ageStr = age ? ` ${age} today` : '';
  const ageSuffix = age ? `! ${age} years young and still going strong!` : '!';

  return [
    `🎂 Happy Birthday ${name}! 🎉\n\nWishing you an amazing day filled with joy and celebration${ageSuffix}`,
    `🥳 It's ${name}'s birthday today! 🎈\n\nFrom everyone at the club, have an incredible day${ageStr}! 🎁`,
    `🎉 Birthday wishes to ${name}! 🎂\n\nHope your special day is as awesome as you are on the pitch!`,
    `🎈 Happy Birthday to our very own ${name}! 🎊\n\nEnjoy your day and see you at training! 🎁`,
    `🎂 Wishing ${name} the happiest of birthdays! 🥳\n\nHere's to another year of great football and memories!`,
  ];
}
