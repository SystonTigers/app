/**
 * What happens when a club's free trial ends without a plan.
 *
 * `TRIAL_END_MODE` (wrangler var) decides: "off" (default) changes nothing;
 * "read_only" keeps everything readable and lets families carry on (votes,
 * consent, their own profile), but refuses changes by club staff with
 * 402 TRIAL_ENDED until the club chooses a plan. Billing, sign-in and the
 * owner panel always work, so a club can always pay its way back.
 */
import { requireJWT, hasAnyRole, STAFF_ROLES } from "./auth";
import { json } from "./util";

export type TrialEndMode = "off" | "read_only";

export interface ClubBilling {
  status: string | null;
  subscription_status: string | null;
  trial_ends_at: number | null;
  comped: number | null;
}

export function trialEndMode(env: { TRIAL_END_MODE?: string }): TrialEndMode {
  return env.TRIAL_END_MODE === "read_only" ? "read_only" : "off";
}

/** Seconds, whether the column holds seconds (sign-up) or milliseconds (older rows). */
function seconds(value: number): number {
  return value > 100_000_000_000 ? Math.floor(value / 1000) : value;
}

/** A club on a paid plan or given free access. */
export function isPaid(club: ClubBilling): boolean {
  return club.comped === 1 || club.subscription_status === "active" || club.status === "active";
}

/** The trial has ended and the club isn't paying. */
export function trialOver(club: ClubBilling, nowSec: number): boolean {
  return !isPaid(club) && !!club.trial_ends_at && seconds(club.trial_ends_at) <= nowSec;
}

/** Requests that always work, even for a club whose trial is over. */
const ALWAYS_OPEN = [/^\/api\/v\d+\/auth\//, /^\/api\/v\d+\/billing\//, /^\/api\/v\d+\/owner\//];

export function isAlwaysOpen(pathname: string): boolean {
  return ALWAYS_OPEN.some((re) => re.test(pathname));
}

const READS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * The 402 to send instead of handling this request, or null to carry on.
 * Only staff changes are stopped; anything unclear (no token, a bad token)
 * carries on and the route's own checks answer it.
 */
export async function trialGate(req: Request, env: { DB: D1Database; TRIAL_END_MODE?: string }, corsHdrs: Headers): Promise<Response | null> {
  if (trialEndMode(env) === "off" || READS.has(req.method)) return null;
  const { pathname } = new URL(req.url);
  if (!pathname.startsWith("/api/") || isAlwaysOpen(pathname)) return null;
  if (!req.headers.get("authorization")) return null;

  let claims;
  try {
    claims = await requireJWT(req, env);
  } catch {
    return null;
  }
  if (!claims.tenantId || !hasAnyRole(claims, STAFF_ROLES) || hasAnyRole(claims, ["platform_owner"])) return null;

  const club = await env.DB.prepare(`SELECT status, subscription_status, trial_ends_at, comped FROM tenants WHERE id = ?`)
    .bind(claims.tenantId).first<ClubBilling>();
  if (!club || !trialOver(club, Math.floor(Date.now() / 1000))) return null;

  console.log(JSON.stringify({ event: "trial_gate", outcome: "refused", tenant: claims.tenantId, path: pathname }));
  return json({
    success: false,
    error: {
      code: "TRIAL_ENDED",
      message: "Your free trial has ended, so changes are paused. Choose a plan in Billing to carry on: everything you've added is still here.",
    },
  }, 402, corsHdrs);
}
