/**
 * The platform owner panel's API (the website's /owner pages call it through
 * their own server, which keeps the session in an HttpOnly cookie).
 *
 *   POST /api/v1/owner/login                 { email, password } → { token, expiresAt }
 *   POST /api/v1/owner/logout
 *   GET  /api/v1/owner/overview              headline numbers
 *   GET  /api/v1/owner/clubs?q=&status=      every club
 *   GET  /api/v1/owner/clubs/:id             one club in detail
 *   POST /api/v1/owner/clubs/:id/actions     { action: extend_trial|set_plan|comp|suspend|reactivate|graphics, ... }
 *   GET  /api/v1/owner/members?q=            find people by email
 *   GET  /api/v1/owner/money                 plans, trials and recorded income
 *   GET  /api/v1/owner/history               recent owner changes
 */
import { json } from "../services/util";
import { rateLimit } from "../middleware/rateLimit";
import { OwnerAuthError, ownerLogin, ownerLogout, requireOwner } from "../services/ownerAuth";
import { clubDetail, listClubs } from "../services/owner/clubs";
import { applyAction, OwnerActionError, parseAction } from "../services/owner/actions";
import { money, overview, recentAudit, searchMembers } from "../services/owner/overview";
import type { Claims } from "../services/jwt";

type Env = { DB: D1Database; KV_IDEMP?: KVNamespace; JWT_SECRET?: string; JWT_ISSUER?: string; STRIPE_SECRET_KEY?: string; [key: string]: unknown };

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function owner(req: Request, env: Env, corsHdrs: Headers): Promise<Claims | Response> {
  try {
    return await requireOwner(req, env);
  } catch (err) {
    // A valid admin token without the owner role is forbidden; anything else
    // (missing, expired, revoked) means signing in again.
    if (err instanceof OwnerAuthError && err.status === 403) return fail(corsHdrs, 403, err.code, err.message);
    return fail(corsHdrs, 401, "UNAUTHORIZED", "Please sign in to the owner panel again.");
  }
}

function internal(corsHdrs: Headers, where: string, err: unknown): Response {
  console.error(JSON.stringify({ level: "error", msg: "owner_api_error", where, error: err instanceof Error ? err.message : String(err) }));
  return fail(corsHdrs, 500, "INTERNAL", "Something went wrong. Please try again.");
}

export async function handleOwnerLogin(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  if (typeof body?.email !== "string" || typeof body.password !== "string" || !body.email || !body.password) {
    return fail(corsHdrs, 400, "VALIDATION", "Enter your email and password.");
  }
  // Per email as well as per address: the website signs in from its own server,
  // so every owner shares one address as far as this Worker can tell.
  const who = body.email.trim().toLowerCase().slice(0, 200);
  const limited = await rateLimit(req, env as never, { scope: `owner-login:${who}`, limit: 5, windowSeconds: 900, path: "/api/v1/owner/login" });
  if (!limited.ok) return fail(corsHdrs, 429, "RATE_LIMITED", "Too many tries. Wait 15 minutes and try again.");
  try {
    return json({ success: true, data: await ownerLogin(env, body.email, body.password) }, 200, corsHdrs);
  } catch (err) {
    if (err instanceof OwnerAuthError) return fail(corsHdrs, err.status, err.code, err.message);
    return internal(corsHdrs, "login", err);
  }
}

export async function handleOwnerLogout(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await owner(req, env, corsHdrs);
  if (claims instanceof Response) return json({ success: true }, 200, corsHdrs);
  await ownerLogout(env, claims);
  return json({ success: true }, 200, corsHdrs);
}

/** GET routes that just return data */
export async function handleOwnerGet(req: Request, env: Env, corsHdrs: Headers, what: "overview" | "clubs" | "members" | "money" | "history", id?: string): Promise<Response> {
  const claims = await owner(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const url = new URL(req.url);
  try {
    switch (what) {
      case "overview": return json({ success: true, data: await overview(env) }, 200, corsHdrs);
      case "money": return json({ success: true, data: await money(env) }, 200, corsHdrs);
      case "history": return json({ success: true, data: await recentAudit(env) }, 200, corsHdrs);
      case "members": return json({ success: true, data: await searchMembers(env, url.searchParams.get("q") ?? "") }, 200, corsHdrs);
      case "clubs": {
        if (id) {
          const club = await clubDetail(env, id);
          return club ? json({ success: true, data: club }, 200, corsHdrs) : fail(corsHdrs, 404, "NOT_FOUND", "Club not found.");
        }
        return json({ success: true, data: await listClubs(env, { q: url.searchParams.get("q") ?? "", status: url.searchParams.get("status") ?? "" }) }, 200, corsHdrs);
      }
    }
  } catch (err) {
    return internal(corsHdrs, what, err);
  }
}

export async function handleOwnerAction(req: Request, env: Env, corsHdrs: Headers, clubId: string): Promise<Response> {
  const claims = await owner(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return fail(corsHdrs, 400, "INVALID_BODY", "Couldn't read that request.");
  try {
    const action = parseAction(body);
    const detail = await applyAction(env, clubId, action, { id: claims.userId!, email: claims.email ?? null });
    return json({ success: true, data: { detail, club: await clubDetail(env, clubId) } }, 200, corsHdrs);
  } catch (err) {
    if (err instanceof OwnerActionError) return fail(corsHdrs, err.status, "VALIDATION", err.message);
    return internal(corsHdrs, "action", err);
  }
}
