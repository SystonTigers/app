/**
 * Photo and video consent.
 *
 *   GET /api/v1/consent                 parents: their children; staff: the whole squad
 *   PUT /api/v1/players/:id/consent     parent (linked) or staff: { photos?: true|false|null, video?: true|false|null }
 */
import { json } from "../services/util";
import { requireTenantJWT, type TenantClaims } from "../services/auth";
import { consentForViewer, ConsentError, setConsent } from "../services/consent";

type Env = { DB: D1Database; [key: string]: unknown };

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function member(req: Request, env: Env, corsHdrs: Headers): Promise<TenantClaims | Response> {
  try {
    return await requireTenantJWT(req, env);
  } catch {
    return fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

function internalError(corsHdrs: Headers, where: string, err: unknown): Response {
  console.error(JSON.stringify({ level: "error", msg: "consent_error", where, error: err instanceof Error ? err.message : String(err) }));
  return fail(corsHdrs, 500, "INTERNAL", "Something went wrong. Please try again.");
}

export async function handleGetConsent(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  try {
    return json({ success: true, data: await consentForViewer(env, claims) }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "get", err);
  }
}

export async function handleSetConsent(req: Request, env: Env, corsHdrs: Headers, playerId: string): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(corsHdrs, 400, "INVALID_BODY", "Couldn't read that request.");
  }
  const change: { photos?: boolean | null; video?: boolean | null } = {};
  for (const key of ["photos", "video"] as const) {
    if (!(key in body)) continue;
    const v = body[key];
    if (v !== null && typeof v !== "boolean") return fail(corsHdrs, 400, "VALIDATION", "Answer yes or no.");
    change[key] = v as boolean | null;
  }
  try {
    return json({ success: true, data: await setConsent(env, claims, playerId, change) }, 200, corsHdrs);
  } catch (err) {
    if (err instanceof ConsentError) return fail(corsHdrs, err.status, err.code, err.message);
    return internalError(corsHdrs, "put", err);
  }
}
