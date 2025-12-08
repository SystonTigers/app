import { logJSON } from '../lib/log';
import type { Env } from '../env';
import { nowUTC } from '../utils/time';

// Football-related motivational quotes
const FOOTBALL_QUOTES = [
  {
    quote: "Success is no accident. It is hard work, perseverance, learning, studying, sacrifice and most of all, love of what you are doing.",
    author: "Pele",
  },
  {
    quote: "I learned all about life with a ball at my feet.",
    author: "Ronaldinho",
  },
  {
    quote: "The more difficult the victory, the greater the happiness in winning.",
    author: "Pele",
  },
  {
    quote: "You have to fight to reach your dream. You have to sacrifice and work hard for it.",
    author: "Lionel Messi",
  },
  {
    quote: "I've never tried to hide the fact that it is my intention to become the best.",
    author: "Cristiano Ronaldo",
  },
  {
    quote: "In football, the worst things are excuses. Excuses mean you cannot grow or move forward.",
    author: "Pep Guardiola",
  },
  {
    quote: "Without your team-mates, you're nothing. You can't play alone.",
    author: "Lionel Messi",
  },
  {
    quote: "A champion is someone who gets up when they can't.",
    author: "Jack Dempsey",
  },
  {
    quote: "The ball is round, the game lasts 90 minutes, and everything else is just theory.",
    author: "Sepp Herberger",
  },
  {
    quote: "Football is a simple game. Twenty-two men chase a ball for 90 minutes and at the end, the Germans always win.",
    author: "Gary Lineker",
  },
  {
    quote: "Some people believe football is a matter of life and death. I can assure you it is much, much more important than that.",
    author: "Bill Shankly",
  },
  {
    quote: "If you're in the penalty area and don't know what to do with the ball, put it in the net and we'll discuss the options later.",
    author: "Bob Paisley",
  },
  {
    quote: "I don't have time for hobbies. At the end of the day, I treat my job as a hobby. It's something I love doing.",
    author: "David Beckham",
  },
  {
    quote: "Every defeat is a step forward.",
    author: "Johan Cruyff",
  },
  {
    quote: "Quality without results is pointless. Results without quality is boring.",
    author: "Johan Cruyff",
  },
  {
    quote: "In his life, a man can change wives, political parties or religions but he cannot change his favourite football team.",
    author: "Eduardo Galeano",
  },
  {
    quote: "When you start supporting a football club, you don't support it because of the trophies, or a player, or history, you support it because you found yourself somewhere there.",
    author: "Dennis Bergkamp",
  },
  {
    quote: "Football is like life - it requires perseverance, self-denial, hard work, sacrifice, dedication and respect for authority.",
    author: "Vince Lombardi",
  },
  {
    quote: "The vision of a champion is bent over, drenched in sweat, at the point of exhaustion, when nobody else is looking.",
    author: "Mia Hamm",
  },
  {
    quote: "Take your victories, whatever they may be, cherish them, use them, but don't settle for them.",
    author: "Mia Hamm",
  },
  {
    quote: "It's not about the name on the back of the jersey, it's about the badge on the front.",
    author: "David Beckham",
  },
  {
    quote: "You can't score a goal if you don't take a shot.",
    author: "Johan Cruyff",
  },
  {
    quote: "Hard work beats talent when talent doesn't work hard.",
    author: "Tim Notke",
  },
  {
    quote: "It's not whether you get knocked down, it's whether you get up.",
    author: "Vince Lombardi",
  },
  {
    quote: "Winners never quit and quitters never win.",
    author: "Vince Lombardi",
  },
  {
    quote: "The only way to prove you're a good sport is to lose.",
    author: "Ernie Banks",
  },
  {
    quote: "Football is a team sport. No one makes it alone.",
    author: "Kaka",
  },
  {
    quote: "Age is no barrier. It's a limitation you put on your mind.",
    author: "Jackie Joyner-Kersee",
  },
  {
    quote: "Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.",
    author: "Christian D. Larson",
  },
  {
    quote: "Every champion was once a contender that refused to give up.",
    author: "Rocky Balboa",
  },
];

// Grassroots/youth football specific quotes
const GRASSROOTS_QUOTES = [
  {
    quote: "At this level, it's about having fun, learning the game, and making friends. The rest will follow.",
    author: "Grassroots Football",
  },
  {
    quote: "Every professional footballer started exactly where you are now. Keep dreaming, keep working.",
    author: "Grassroots Football",
  },
  {
    quote: "Win or lose, give it your all. That's what makes a true footballer.",
    author: "Grassroots Football",
  },
  {
    quote: "The best time to plant a tree was 20 years ago. The second best time is now. Same goes for practice.",
    author: "Grassroots Football",
  },
  {
    quote: "Support your teammates like they're family, because on this pitch, they are.",
    author: "Grassroots Football",
  },
  {
    quote: "Every training session is a chance to get better. Don't waste it.",
    author: "Grassroots Football",
  },
  {
    quote: "The scoreboard doesn't measure heart, effort, or improvement. Those are the real wins.",
    author: "Grassroots Football",
  },
  {
    quote: "Be the player your younger self would have looked up to.",
    author: "Grassroots Football",
  },
  {
    quote: "Football teaches us that success comes from working together, not alone.",
    author: "Grassroots Football",
  },
  {
    quote: "Every mistake is a lesson. Every lesson makes you stronger.",
    author: "Grassroots Football",
  },
];

/**
 * Motivational Quotes cron job - Runs on specific days
 * Posts inspiring football quotes to engage the community
 * Suggested schedule: Monday, Wednesday, Friday mornings
 */
export const runQuotes = async (env: Env, ctx: ExecutionContext) => {
  const now = nowUTC();
  const today = now.toFormat('yyyy-MM-dd');

  logJSON({ level: 'info', msg: 'Running quotes post', date: today });

  try {
    // Get all active tenants with quotes feature enabled
    const tenants = await getTenantsWithQuotes(env);

    let postsCreated = 0;
    for (const config of tenants) {
      const created = await postQuote(env, config, today);
      if (created) postsCreated++;
    }

    logJSON({
      level: 'info',
      msg: 'Quotes post completed',
      tenantsChecked: tenants.length,
      postsCreated,
    });
  } catch (error) {
    logJSON({
      level: 'error',
      msg: 'Quotes post error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Get tenants with quotes feature enabled
async function getTenantsWithQuotes(env: Env): Promise<any[]> {
  const list = await env.KV.list({ prefix: 'team:' });
  const tenants = [];

  for (const key of list.keys) {
    if (key.name.endsWith(':config')) {
      const config: any = await env.KV.get(key.name, 'json');

      if (config?.features?.auto_quotes) {
        tenants.push(config);
      }
    }
  }

  return tenants;
}

// Post a quote for a tenant
async function postQuote(env: Env, config: any, today: string): Promise<boolean> {
  const tenant = config.team_id;

  // Check if we already posted today
  const postKey = `quote:${tenant}:${today}`;
  const alreadyPosted = await env.KV.get(postKey);

  if (alreadyPosted) {
    logJSON({ level: 'info', msg: 'Quote already posted today', tenant });
    return false;
  }

  // Get the last few quotes posted to avoid repetition
  const recentQuotesKey = `quotes_history:${tenant}`;
  const recentQuotesData = await env.KV.get(recentQuotesKey, 'json') as string[] | null;
  const recentQuotes = recentQuotesData || [];

  // Select a quote that wasn't recently used
  const quote = selectQuote(recentQuotes, config);

  // Create the post
  await createQuotePost(env, tenant, quote, config);

  // Update history (keep last 20 quotes)
  const updatedHistory = [quote.quote, ...recentQuotes].slice(0, 20);
  await env.KV.put(recentQuotesKey, JSON.stringify(updatedHistory), {
    expirationTtl: 60 * 60 * 24 * 90, // 90 days
  });

  // Mark as posted today
  await env.KV.put(postKey, 'posted', {
    expirationTtl: 60 * 60 * 24 * 2, // 2 days TTL
  });

  return true;
}

// Select a quote that wasn't recently used
function selectQuote(
  recentQuotes: string[],
  config: any
): { quote: string; author: string } {
  // Combine all quotes, with preference for grassroots quotes for youth teams
  const isYouthTeam = config.team_type === 'youth' || config.age_group;

  let allQuotes: typeof FOOTBALL_QUOTES;
  if (isYouthTeam) {
    // 60% grassroots, 40% famous for youth teams
    allQuotes = [...GRASSROOTS_QUOTES, ...GRASSROOTS_QUOTES, ...FOOTBALL_QUOTES];
  } else {
    // 70% famous, 30% grassroots for adult teams
    allQuotes = [...FOOTBALL_QUOTES, ...FOOTBALL_QUOTES, ...GRASSROOTS_QUOTES];
  }

  // Filter out recently used quotes
  const availableQuotes = allQuotes.filter(q => !recentQuotes.includes(q.quote));

  // If all quotes have been used, reset
  const quotesToUse = availableQuotes.length > 0 ? availableQuotes : allQuotes;

  // Select random quote
  return quotesToUse[Math.floor(Math.random() * quotesToUse.length)];
}

// Create quote post
async function createQuotePost(
  env: Env,
  tenant: string,
  quote: { quote: string; author: string },
  config: any
) {
  const emoji = getRandomEmoji();
  const message = `${emoji} "${quote.quote}"\n\n— ${quote.author}\n\n#MondayMotivation #FootballQuotes`;

  const post = {
    id: crypto.randomUUID(),
    tenant,
    type: 'quote',
    quote: quote.quote,
    author: quote.author,
    message,
    template: 'quote',
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
        event: 'quote',
        event_type: 'motivational_quote',
        tenant,
        post,
        quote: quote.quote,
        author: quote.author,
        message,
        hashtags: ['#MondayMotivation', '#FootballQuotes', '#GrassrootsFootball', '#Inspiration'],
      }),
    });
  }

  logJSON({
    level: 'info',
    msg: 'Created quote post',
    tenant,
    author: quote.author,
  });
}

// Get random motivational emoji
function getRandomEmoji(): string {
  const emojis = ['💪', '⚽', '🏆', '🌟', '✨', '🔥', '💯', '🎯', '👊', '🙌'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

/**
 * Get all available quotes (for admin preview)
 */
export function getAllQuotes(): Array<{ quote: string; author: string; category: string }> {
  return [
    ...FOOTBALL_QUOTES.map(q => ({ ...q, category: 'football' })),
    ...GRASSROOTS_QUOTES.map(q => ({ ...q, category: 'grassroots' })),
  ];
}
