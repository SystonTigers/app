/**
 * The owner panel's view of clubs: one row per club with its plan, trial,
 * members, players, activity and connections, and a detail view.
 * Timestamps in the database are a mix of seconds and milliseconds; ms() evens them out.
 */
import { PLANS } from "../../routes/billing";
import { PACKS, packsIncludedWith } from "../graphics/packs";

type DB = { DB: D1Database };

/** SQL: a timestamp column as milliseconds, whether it was saved in seconds or ms. */
export const ms = (col: string) => `(CASE WHEN ${col} > 100000000000 THEN ${col} ELSE ${col} * 1000 END)`;

export interface ClubRow {
  id: string;
  slug: string;
  name: string;
  ownerEmail: string;
  createdAt: number | null;
  plan: string;
  planName: string;
  monthlyPence: number;
  status: string;
  comped: boolean;
  trialEndsAt: number | null;
  trialDaysLeft: number | null;
  subscriptionStatus: string | null;
  members: number;
  staff: number;
  players: number;
  lastActiveAt: number | null;
  liveMatches: number;
  youtube: boolean;
  facebook: boolean;
  instagram: boolean;
  color: string | null;
  badgeUrl: string | null;
}

const CLUB_SELECT = `
  SELECT t.id, t.slug, t.name, t.email, t.plan, t.status, t.comped, t.trial_ends_at, t.subscription_status,
         ${ms("t.created_at")} AS created_ms,
         b.primary_color, b.badge_url,
         (SELECT COUNT(*) FROM auth_users u WHERE u.tenant_id = t.id) AS members,
         (SELECT COUNT(*) FROM auth_users u WHERE u.tenant_id = t.id AND (u.roles LIKE '%admin%' OR u.roles LIKE '%owner%' OR u.roles LIKE '%coach%' OR u.roles LIKE '%manager%')) AS staff,
         (SELECT COUNT(*) FROM squad s WHERE s.tenant_id = t.id) AS players,
         (SELECT COUNT(*) FROM live_match_events e WHERE e.tenant_id = t.id AND e.type = 'kick_off' AND e.deleted_at IS NULL) AS live_matches,
         MAX(
           COALESCE((SELECT MAX(${ms("u.last_login_at")}) FROM auth_users u WHERE u.tenant_id = t.id), 0),
           COALESCE((SELECT MAX(${ms("u.created_at")}) FROM auth_users u WHERE u.tenant_id = t.id), 0),
           COALESCE((SELECT MAX(${ms("e.created_at")}) FROM live_match_events e WHERE e.tenant_id = t.id), 0),
           COALESCE((SELECT MAX(${ms("j.created_at")}) FROM social_jobs j WHERE j.tenant_id = t.id), 0)
         ) AS last_active,
         (SELECT GROUP_CONCAT(c.platform) FROM social_connections c WHERE c.tenant_id = t.id) AS connections
  FROM tenants t LEFT JOIN tenant_brand b ON b.tenant_id = t.id`;

interface RawClub {
  id: string; slug: string; name: string; email: string; plan: string; status: string; comped: number; trial_ends_at: number | null;
  subscription_status: string | null; created_ms: number | null; primary_color: string | null; badge_url: string | null;
  members: number; staff: number; players: number; live_matches: number; last_active: number; connections: string | null;
}

function toClub(r: RawClub, now: number): ClubRow {
  const plan = r.plan in PLANS ? (r.plan as keyof typeof PLANS) : "starter";
  const trialEnds = r.trial_ends_at ? (r.trial_ends_at > 100000000000 ? r.trial_ends_at : r.trial_ends_at * 1000) : null;
  const conns = new Set((r.connections ?? "").split(",").filter(Boolean));
  return {
    id: r.id, slug: r.slug, name: r.name, ownerEmail: r.email, createdAt: r.created_ms,
    plan, planName: PLANS[plan].name, monthlyPence: PLANS[plan].monthlyPence,
    status: r.status, comped: r.comped === 1,
    trialEndsAt: trialEnds,
    trialDaysLeft: r.status === "trial" && trialEnds ? Math.ceil((trialEnds - now) / 86_400_000) : null,
    subscriptionStatus: r.subscription_status,
    members: r.members, staff: r.staff, players: r.players,
    lastActiveAt: r.last_active || null, liveMatches: r.live_matches,
    youtube: conns.has("youtube"), facebook: conns.has("facebook"), instagram: conns.has("instagram"),
    color: r.primary_color, badgeUrl: r.badge_url,
  };
}

/** Every club, newest first, optionally filtered by name/slug/email and status. */
export async function listClubs(env: DB, opts: { q?: string; status?: string } = {}, now = Date.now()): Promise<ClubRow[]> {
  const where: string[] = [];
  const binds: string[] = [];
  const q = (opts.q ?? "").trim().toLowerCase();
  if (q) {
    where.push("(lower(t.name) LIKE ? OR lower(t.slug) LIKE ? OR lower(t.email) LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (opts.status && ["trial", "active", "suspended", "cancelled"].includes(opts.status)) {
    where.push("t.status = ?");
    binds.push(opts.status);
  }
  const { results } = await env.DB.prepare(`${CLUB_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY t.created_at DESC LIMIT 500`)
    .bind(...binds).all<RawClub>();
  return (results ?? []).map((r) => toClub(r, now));
}

export interface ClubDetail extends ClubRow {
  staffList: Array<{ email: string; roles: string[]; lastLoginAt: number | null }>;
  fixtures: { upcoming: number; played: number };
  consent: { answered: number; players: number };
  pushDevices: number;
  graphicsPack: string | null;
  unlockedPacks: string[];
  /** Premium packs the club's plan already includes (Pro) */
  planPacks: string[];
  /** Premium graphics packs the owner can unlock */
  premiumPacks: Array<{ id: string; name: string }>;
  history: Array<{ at: number; action: string; detail: string | null; by: string | null }>;
}

export async function clubDetail(env: DB, id: string, now = Date.now()): Promise<ClubDetail | null> {
  const raw = await env.DB.prepare(`${CLUB_SELECT} WHERE t.id = ?`).bind(id).first<RawClub>();
  if (!raw) return null;
  const today = new Date(now).toISOString().slice(0, 10);
  const [staff, fixtures, consent, devices, pack, unlocks, history] = await Promise.all([
    env.DB.prepare(`SELECT email, roles, ${ms("last_login_at")} AS last_login FROM auth_users WHERE tenant_id = ? AND (roles LIKE '%admin%' OR roles LIKE '%owner%' OR roles LIKE '%coach%' OR roles LIKE '%manager%') ORDER BY created_at LIMIT 50`)
      .bind(id).all<{ email: string; roles: string; last_login: number | null }>(),
    env.DB.prepare(`SELECT SUM(substr(fixture_date, 1, 10) >= ? AND COALESCE(status, '') NOT IN ('completed', 'cancelled')) AS upcoming, SUM(status = 'completed') AS played FROM fixtures WHERE tenant_id = ?`)
      .bind(today, id).first<{ upcoming: number | null; played: number | null }>(),
    env.DB.prepare(`SELECT COUNT(*) AS players, SUM(photo_consent IS NOT NULL AND video_consent IS NOT NULL) AS answered FROM squad WHERE tenant_id = ?`).bind(id).first<{ players: number; answered: number | null }>(),
    env.DB.prepare(`SELECT COUNT(*) AS c FROM devices WHERE tenant_id = ?`).bind(id).first<{ c: number }>(),
    env.DB.prepare(`SELECT graphics_pack FROM tenants WHERE id = ?`).bind(id).first<{ graphics_pack: string | null }>(),
    env.DB.prepare(`SELECT pack_id AS pack FROM graphics_unlocks WHERE tenant_id = ?`).bind(id).all<{ pack: string }>(),
    env.DB.prepare(`SELECT created_at, action, detail, owner_email FROM owner_audit WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20`).bind(id).all<{ created_at: number; action: string; detail: string | null; owner_email: string | null }>(),
  ]);
  const parseRoles = (r: string) => { try { const v = JSON.parse(r); return Array.isArray(v) ? v.map(String) : [r]; } catch { return [r]; } };
  return {
    ...toClub(raw, now),
    staffList: (staff.results ?? []).map((s) => ({ email: s.email, roles: parseRoles(s.roles), lastLoginAt: s.last_login })),
    fixtures: { upcoming: fixtures?.upcoming ?? 0, played: fixtures?.played ?? 0 },
    consent: { answered: consent?.answered ?? 0, players: consent?.players ?? 0 },
    pushDevices: devices?.c ?? 0,
    graphicsPack: pack?.graphics_pack ?? null,
    unlockedPacks: (unlocks.results ?? []).map((u) => u.pack),
    planPacks: packsIncludedWith(raw.plan),
    premiumPacks: PACKS.filter((p) => p.premium).map((p) => ({ id: p.id, name: p.name })),
    history: (history.results ?? []).map((h) => ({ at: h.created_at, action: h.action, detail: h.detail, by: h.owner_email })),
  };
}
