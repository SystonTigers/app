/**
 * Signing on (a club extra: off unless the club switches it on, see
 * services/clubModules.ts).
 *
 *   GET /api/v1/signing-on                     members: this season, the form and my children; staff also get the squad list
 *   PUT /api/v1/signing-on/form                staff: { feeAmount, feeNote, conduct }
 *   GET /api/v1/signing-on/players/:id         staff or the child's family: this season's answers
 *   PUT /api/v1/signing-on/players/:id         staff or the child's family: sign them on (details, contacts, consent, conduct)
 *   PUT /api/v1/signing-on/players/:id/paid    staff: { paid: true|false }
 */
import { json } from "../services/util";
import { hasAnyRole, requireTenantJWT, STAFF_ROLES, type TenantClaims } from "../services/auth";
import { readAnswers, readForm, SigningOnError } from "../services/signingOn/rules";
import { getEntry, getForm, markPaid, myChildren, saveForm, signingOnSeason, squadStatus, submitEntry } from "../services/signingOn/store";

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

async function body(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/** Run a handler, turning SigningOnError into its message and anything else into a logged 500. */
async function run(corsHdrs: Headers, where: string, work: () => Promise<unknown>): Promise<Response> {
  try {
    return json({ success: true, data: await work() }, 200, corsHdrs);
  } catch (err) {
    if (err instanceof SigningOnError) return fail(corsHdrs, err.status, err.code, err.message);
    console.error(JSON.stringify({ level: "error", msg: "signing_on_error", where, error: err instanceof Error ? err.message : String(err) }));
    return fail(corsHdrs, 500, "INTERNAL", "Something went wrong. Please try again.");
  }
}

const today = () => new Date().toISOString().slice(0, 10);

export async function handleGetSigningOn(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  return run(corsHdrs, "get", async () => {
    const season = await signingOnSeason(env, claims.tenantId);
    const staff = hasAnyRole(claims, STAFF_ROLES);
    const [form, children, squad] = await Promise.all([
      getForm(env, claims.tenantId, season.id),
      myChildren(env, claims, season.id),
      staff ? squadStatus(env, claims.tenantId, season.id) : Promise.resolve(undefined),
    ]);
    return { season: { id: season.id, label: season.label }, form, children, ...(squad ? { squad } : {}) };
  });
}

export async function handleSaveSigningOnForm(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const raw = await body(req);
  return run(corsHdrs, "form", async () => {
    const season = await signingOnSeason(env, claims.tenantId);
    return saveForm(env, claims, season.id, readForm(raw));
  });
}

export async function handleGetSigningOnEntry(req: Request, env: Env, corsHdrs: Headers, playerId: string): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  return run(corsHdrs, "entry", async () => {
    const season = await signingOnSeason(env, claims.tenantId);
    return getEntry(env, claims, playerId, season.id);
  });
}

export async function handleSubmitSigningOn(req: Request, env: Env, corsHdrs: Headers, playerId: string): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const raw = await body(req);
  return run(corsHdrs, "submit", async () => {
    const season = await signingOnSeason(env, claims.tenantId);
    const form = await getForm(env, claims.tenantId, season.id);
    return submitEntry(env, claims, playerId, season.id, readAnswers(raw, form, today()));
  });
}

export async function handleMarkSigningOnPaid(req: Request, env: Env, corsHdrs: Headers, playerId: string): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const raw = (await body(req)) as { paid?: unknown } | null;
  if (typeof raw?.paid !== "boolean") return fail(corsHdrs, 400, "VALIDATION", "paid must be true or false.");
  return run(corsHdrs, "paid", async () => {
    const season = await signingOnSeason(env, claims.tenantId);
    return markPaid(env, claims, playerId, season.id, raw.paid as boolean);
  });
}
