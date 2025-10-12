import type { Env } from '../env';

// Monthly usage key builder
const monthKey = (tenant: string) => {
  const d = new Date();
  return `usage:${tenant}:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

// Check if tenant has remaining quota
export const allowed = async (req: any, env: Env) => {
  const cap = 1000; // Starter plan: 1000 ops/month
  const used = +(await env.KV.get(monthKey(req.tenant)) || 0);

  return new Response(
    JSON.stringify({
      allowed: used < cap,
      used,
      cap,
      remaining: Math.max(0, cap - used),
    }),
    { headers: { 'content-type': 'application/json' } }
  );
};

// Increment usage counter
export const increment = async (req: any, env: Env) => {
  const key = monthKey(req.tenant);
  const used = +(await env.KV.get(key) || 0) + 1;

  await env.KV.put(key, String(used), {
    expirationTtl: 60 * 60 * 24 * 45, // 45 days
  });

  return new Response(
    JSON.stringify({ used }),
    { headers: { 'content-type': 'application/json' } }
  );
};

// Get usage stats
export const getUsage = async (req: any, env: Env) => {
  const url = new URL(req.url);
  const month = url.searchParams.get('month'); // Format: YYYY-MM

  const key = month
    ? `usage:${req.tenant}:${month}`
    : monthKey(req.tenant);

  const used = +(await env.KV.get(key) || 0);
  const cap = 1000; // TODO: Get from tenant config

  return new Response(
    JSON.stringify({
      month: month || new Date().toISOString().slice(0, 7),
      used,
      cap,
      remaining: Math.max(0, cap - used),
      percentage: Math.min(100, (used / cap) * 100),
    }),
    { headers: { 'content-type': 'application/json' } }
  );
};
