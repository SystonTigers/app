/**
 * The owner panel's headline numbers, money and member search.
 */
import { PLANS } from "../../routes/billing";
import { ms } from "./clubs";

type DB = { DB: D1Database };

export interface Overview {
  clubs: { total: number; trial: number; active: number; suspended: number; cancelled: number; comped: number };
  newClubs30d: number;
  trialsEndingSoon: Array<{ id: string; name: string; trialEndsAt: number }>;
  members: number;
  players: number;
  liveMatches7d: number;
  money: Money;
  recentSignups: Array<{ id: string; name: string; createdAt: number; plan: string; status: string }>;
}

export interface Money {
  /** Monthly value of paying (active, not free) clubs at list price, in pence */
  monthlyRecurringPence: number;
  payingClubs: number;
  /** If every club on trial started paying */
  trialPipelinePence: number;
  byPlan: Array<{ plan: string; name: string; monthlyPence: number; active: number; trial: number }>;
  /** Money actually recorded (shop commission etc.) in the last 30 days, in pence */
  recorded30dPence: number;
  stripeConnected: boolean;
}

export async function money(env: DB & { STRIPE_SECRET_KEY?: string }, now = Date.now()): Promise<Money> {
  const { results } = await env.DB.prepare(`SELECT plan, status, comped, COUNT(*) AS c FROM tenants GROUP BY plan, status, comped`)
    .all<{ plan: string; status: string; comped: number; c: number }>();
  const byPlan = Object.entries(PLANS).map(([id, p]) => ({ plan: id, name: p.name, monthlyPence: p.monthlyPence, active: 0, trial: 0 }));
  let mrr = 0; let paying = 0; let pipeline = 0;
  for (const r of results ?? []) {
    const plan = byPlan.find((p) => p.plan === r.plan) ?? byPlan[0];
    if (r.status === "active" && r.comped !== 1) { plan.active += r.c; mrr += plan.monthlyPence * r.c; paying += r.c; }
    if (r.status === "trial") { plan.trial += r.c; pipeline += plan.monthlyPence * r.c; }
  }
  const since = Math.floor((now - 30 * 86_400_000) / 1000);
  const rec = await env.DB.prepare(`SELECT COALESCE(SUM(amount_gbp), 0) AS total FROM platform_revenue WHERE created_at >= ?`).bind(since).first<{ total: number }>();
  return { monthlyRecurringPence: mrr, payingClubs: paying, trialPipelinePence: pipeline, byPlan, recorded30dPence: rec?.total ?? 0, stripeConnected: !!env.STRIPE_SECRET_KEY };
}

export async function overview(env: DB & { STRIPE_SECRET_KEY?: string }, now = Date.now()): Promise<Overview> {
  const nowSec = Math.floor(now / 1000);
  const [status, newClubs, ending, members, players, live, recent, m] = await Promise.all([
    env.DB.prepare(`SELECT status, SUM(comped) AS comped, COUNT(*) AS c FROM tenants GROUP BY status`).all<{ status: string; comped: number; c: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS c FROM tenants WHERE ${ms("created_at")} >= ?`).bind(now - 30 * 86_400_000).first<{ c: number }>(),
    env.DB.prepare(`SELECT id, name, trial_ends_at FROM tenants WHERE status = 'trial' AND trial_ends_at BETWEEN ? AND ? ORDER BY trial_ends_at LIMIT 20`)
      .bind(nowSec - 86400, nowSec + 7 * 86400).all<{ id: string; name: string; trial_ends_at: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS c FROM auth_users`).first<{ c: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS c FROM squad`).first<{ c: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS c FROM live_match_events WHERE type = 'kick_off' AND deleted_at IS NULL AND ${ms("created_at")} >= ?`).bind(now - 7 * 86_400_000).first<{ c: number }>(),
    env.DB.prepare(`SELECT id, name, ${ms("created_at")} AS created, plan, status FROM tenants ORDER BY created_at DESC LIMIT 8`).all<{ id: string; name: string; created: number; plan: string; status: string }>(),
    money(env, now),
  ]);
  const clubs = { total: 0, trial: 0, active: 0, suspended: 0, cancelled: 0, comped: 0 };
  for (const r of status.results ?? []) {
    clubs.total += r.c;
    clubs.comped += r.comped ?? 0;
    if (r.status in clubs) clubs[r.status as "trial" | "active" | "suspended" | "cancelled"] += r.c;
  }
  return {
    clubs,
    newClubs30d: newClubs?.c ?? 0,
    trialsEndingSoon: (ending.results ?? []).map((t) => ({ id: t.id, name: t.name, trialEndsAt: t.trial_ends_at * 1000 })),
    members: members?.c ?? 0,
    players: players?.c ?? 0,
    liveMatches7d: live?.c ?? 0,
    money: m,
    recentSignups: (recent.results ?? []).map((r) => ({ id: r.id, name: r.name, createdAt: r.created, plan: r.plan, status: r.status })),
  };
}

export interface MemberRow { email: string; clubId: string; clubName: string; roles: string[]; joinedAt: number | null; lastLoginAt: number | null }

/** Find people by email (3+ characters), across every club. */
export async function searchMembers(env: DB, q: string): Promise<MemberRow[]> {
  const term = q.trim().toLowerCase();
  if (term.length < 3) return [];
  const { results } = await env.DB.prepare(
    `SELECT u.email, u.tenant_id, t.name, u.roles, ${ms("u.created_at")} AS joined, ${ms("u.last_login_at")} AS last_login
     FROM auth_users u JOIN tenants t ON t.id = u.tenant_id WHERE lower(u.email) LIKE ? ORDER BY u.email LIMIT 50`,
  ).bind(`%${term}%`).all<{ email: string; tenant_id: string; name: string; roles: string; joined: number | null; last_login: number | null }>();
  return (results ?? []).map((r) => {
    let roles: string[];
    try { const v = JSON.parse(r.roles); roles = Array.isArray(v) ? v.map(String) : [r.roles]; } catch { roles = [r.roles]; }
    return { email: r.email, clubId: r.tenant_id, clubName: r.name, roles, joinedAt: r.joined, lastLoginAt: r.last_login };
  });
}

/** The latest changes made in the owner panel. */
export async function recentAudit(env: DB, limit = 30): Promise<Array<{ at: number; clubId: string | null; clubName: string | null; action: string; detail: string | null; by: string | null }>> {
  const { results } = await env.DB.prepare(
    `SELECT a.created_at, a.tenant_id, t.name, a.action, a.detail, a.owner_email FROM owner_audit a LEFT JOIN tenants t ON t.id = a.tenant_id ORDER BY a.created_at DESC LIMIT ?`,
  ).bind(limit).all<{ created_at: number; tenant_id: string | null; name: string | null; action: string; detail: string | null; owner_email: string | null }>();
  return (results ?? []).map((r) => ({ at: r.created_at, clubId: r.tenant_id, clubName: r.name, action: r.action, detail: r.detail, by: r.owner_email }));
}
