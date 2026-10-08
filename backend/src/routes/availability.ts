/**
 * Availability for matches, training and club events (services/availability/).
 *
 *   GET  /api/v1/availability                                   members: the next four weeks, my children's answers (staff: squad totals)
 *   GET  /api/v1/availability/:type/:id                         staff: the whole squad's answers for one item
 *   PUT  /api/v1/availability/:type/:id/players/:playerId       the child's family or staff: { status: yes|no|maybe|null, note? }
 *   POST /api/v1/availability/:type/:id/remind                  staff: push a reminder to families who haven't answered
 *
 * :type is match, training or event.
 */
import { json } from "../services/util";
import { hasAnyRole, requireTenantJWT, STAFF_ROLES, type TenantClaims } from "../services/auth";
import { AvailabilityError, isItemType, readAnswer } from "../services/availability/rules";
import { overview, setAnswer, squadAnswers } from "../services/availability/store";
import { remindForItem } from "../services/availability/reminders";
import type { PushEnv } from "../services/push/delivery";

type Env = PushEnv & { [key: string]: unknown };

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function run(req: Request, env: Env, corsHdrs: Headers, where: string, work: (claims: TenantClaims) => Promise<unknown>, opts: { staff?: boolean; type?: string } = {}): Promise<Response> {
  let claims: TenantClaims;
  try {
    claims = await requireTenantJWT(req, env);
  } catch {
    return fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
  if (opts.staff && !hasAnyRole(claims, STAFF_ROLES)) return fail(corsHdrs, 403, "FORBIDDEN", "Only the club's coaches can do that.");
  if (opts.type !== undefined && !isItemType(opts.type)) return fail(corsHdrs, 404, "NOT_FOUND", "Not found.");
  try {
    return json({ success: true, data: await work(claims) }, 200, corsHdrs);
  } catch (err) {
    if (err instanceof AvailabilityError) return fail(corsHdrs, err.status, err.code, err.message);
    console.error(JSON.stringify({ level: "error", msg: "availability_error", where, tenantId: claims.tenantId, error: err instanceof Error ? err.message : String(err) }));
    return fail(corsHdrs, 500, "INTERNAL", "Something went wrong. Please try again.");
  }
}

export function handleGetAvailability(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  return run(req, env, corsHdrs, "overview", (claims) => overview(env, claims));
}

export function handleGetItemAvailability(req: Request, env: Env, corsHdrs: Headers, type: string, id: string): Promise<Response> {
  return run(req, env, corsHdrs, "item", (claims) => squadAnswers(env, claims.tenantId, type as never, id), { staff: true, type });
}

export async function handleSetAvailability(req: Request, env: Env, corsHdrs: Headers, type: string, id: string, playerId: string): Promise<Response> {
  let body: unknown = null;
  try { body = await req.json(); } catch { /* checked below */ }
  return run(req, env, corsHdrs, "set", (claims) => setAnswer(env, claims, type as never, id, playerId, readAnswer(body)), { type });
}

export function handleRemindAvailability(req: Request, env: Env, corsHdrs: Headers, type: string, id: string): Promise<Response> {
  return run(req, env, corsHdrs, "remind", (claims) => remindForItem(env, claims.tenantId, type as never, id), { staff: true, type });
}
