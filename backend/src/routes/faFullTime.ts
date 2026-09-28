/**
 * FA Full-Time code snippets for the club's league pages.
 *
 *   GET /api/v1/club/fa-full-time   club staff: the saved snippet codes
 *   PUT /api/v1/club/fa-full-time   club admins: { table?, fixtures?, results?, team? } (pasted snippet, code, or "" to remove)
 *
 * The public codes are served as /public/:club/fa-full-time (routes/public.ts).
 */
import { json } from "../services/util";
import { hasAnyRole, requireStaff, type TenantClaims } from "../services/auth";
import { applySnippetUpdate, loadFaSnippets, saveFaSnippets } from "../services/faFullTime";
import { logJSON } from "../lib/log";

type Env = { DB: D1Database; [key: string]: unknown };

const ADMIN_ROLES = ["owner", "tenant_admin", "admin", "platform_admin"] as const;

function fail(corsHdrs: Headers, status: number, code: string, message: string, field?: string): Response {
  return json({ success: false, error: { code, message, ...(field ? { field } : {}) } }, status, corsHdrs);
}

async function staff(req: Request, env: Env, corsHdrs: Headers, adminOnly: boolean): Promise<TenantClaims | Response> {
  try {
    const claims = await requireStaff(req, env);
    if (adminOnly && !hasAnyRole(claims, ADMIN_ROLES)) return fail(corsHdrs, 403, "FORBIDDEN", "Only the club's owner or admins can change this.");
    return claims;
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can do this.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

export async function handleGetFaFullTime(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  return json({ success: true, data: await loadFaSnippets(env.DB, claims.tenantId) }, 200, corsHdrs);
}

export async function handleSetFaFullTime(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staff(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(corsHdrs, 400, "INVALID_JSON", "Couldn't read that request.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail(corsHdrs, 400, "INVALID_BODY", "Send the snippets as an object.");
  const current = await loadFaSnippets(env.DB, claims.tenantId);
  const update = applySnippetUpdate(current, body as Record<string, unknown>);
  if ("error" in update) return fail(corsHdrs, 400, "INVALID_SNIPPET", update.error.message, update.error.field);
  await saveFaSnippets(env.DB, claims.tenantId, update.snippets);
  logJSON({ level: "info", msg: "fa_snippets_saved", tenantId: claims.tenantId, kinds: Object.keys(update.snippets) });
  return json({ success: true, data: update.snippets }, 200, corsHdrs);
}
