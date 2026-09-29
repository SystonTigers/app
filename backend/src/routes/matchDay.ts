/**
 * Match day in the app: live video, "at the match?" and the ground's location.
 *
 *   GET    /api/v1/matchday                     members: today's fixtures, stream, own attendance
 *   PUT    /api/v1/fixtures/:id/attendance      members: { atVenue, source: "location" | "manual" }
 *   DELETE /api/v1/fixtures/:id/attendance      members: forget a manual choice (back to automatic)
 *   PUT    /api/v1/fixtures/:id/stream          staff: { url } a YouTube link for this match
 *   DELETE /api/v1/fixtures/:id/stream          staff
 *   PUT    /api/v1/fixtures/:id/venue           staff: { lat, lng } where the ground is (from their phone)
 *
 * Phones decide "at the match" themselves and only send yes/no, so nobody's
 * location reaches the server except the ground's, which staff choose to set.
 */
import { json } from "../services/util";
import { requireStaff, requireTenantJWT, type TenantClaims } from "../services/auth";
import { matchDayFor, streamView, validCoords, VENUE_RADIUS_M, FIXTURE_COLUMNS, type FixtureRow } from "../services/matchDay";
import { clearFixtureStream, setFixtureStream, type StreamEnv } from "../services/stream/detect";
import { parseYouTubeVideoId } from "../services/stream/youtube";
import { processDueAlerts } from "../services/matchAlerts/queue";

type Env = StreamEnv & { VAPID_PUBLIC_KEY?: string; [key: string]: unknown };

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function authenticate(req: Request, env: Env, corsHdrs: Headers, staff: boolean): Promise<TenantClaims | Response> {
  try {
    return staff ? await requireStaff(req, env) : await requireTenantJWT(req, env);
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403
      ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can do this.")
      : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

function internalError(corsHdrs: Headers, where: string, err: unknown): Response {
  console.error(JSON.stringify({ level: "error", msg: "match_day_error", where, error: err instanceof Error ? err.message : String(err) }));
  return fail(corsHdrs, 500, "INTERNAL", "Something went wrong. Please try again.");
}

async function fixtureRow(env: Env, tenantId: string, fixtureId: string): Promise<FixtureRow | null> {
  return env.DB.prepare(`SELECT ${FIXTURE_COLUMNS} FROM fixtures WHERE tenant_id = ? AND id = ?`).bind(tenantId, fixtureId).first<FixtureRow>();
}

export async function handleGetMatchDay(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  try {
    const fixtures = await matchDayFor(env, claims.tenantId, claims.userId ?? null);
    return json({ success: true, data: { fixtures, radiusMeters: VENUE_RADIUS_M, webPushKey: env.VAPID_PUBLIC_KEY ?? null } }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "get", err);
  }
}

export async function handlePutAttendance(req: Request, env: Env, corsHdrs: Headers, fixtureId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  if (!claims.userId) return fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  try {
    const body = (await req.json().catch(() => ({}))) as { atVenue?: unknown; source?: unknown };
    if (typeof body.atVenue !== "boolean") return fail(corsHdrs, 400, "VALIDATION", "atVenue must be true or false.");
    if (body.source !== "location" && body.source !== "manual") return fail(corsHdrs, 400, "VALIDATION", "source must be location or manual.");
    if (!(await fixtureRow(env, claims.tenantId, fixtureId))) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");
    // What someone chose themselves is never overridden by their phone's location
    await env.DB.prepare(
      `INSERT INTO match_attendance (tenant_id, fixture_id, user_id, at_venue, source, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id, fixture_id, user_id) DO UPDATE SET at_venue = excluded.at_venue, source = excluded.source, updated_at = excluded.updated_at
       WHERE excluded.source = 'manual' OR match_attendance.source = 'location'`,
    ).bind(claims.tenantId, fixtureId, claims.userId, body.atVenue ? 1 : 0, body.source, Date.now()).run();
    const row = await env.DB.prepare(`SELECT at_venue, source FROM match_attendance WHERE tenant_id = ? AND fixture_id = ? AND user_id = ?`)
      .bind(claims.tenantId, fixtureId, claims.userId).first<{ at_venue: number; source: string }>();
    return json({ success: true, data: { atVenue: row?.at_venue === 1, source: row?.source ?? body.source } }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "attendance", err);
  }
}

export async function handleDeleteAttendance(req: Request, env: Env, corsHdrs: Headers, fixtureId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  try {
    await env.DB.prepare(`DELETE FROM match_attendance WHERE tenant_id = ? AND fixture_id = ? AND user_id = ?`).bind(claims.tenantId, fixtureId, claims.userId ?? "").run();
    return json({ success: true, data: null }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "attendance_clear", err);
  }
}

export async function handlePutStream(req: Request, env: Env, corsHdrs: Headers, fixtureId: string, ctx?: ExecutionContext): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  try {
    const body = (await req.json().catch(() => ({}))) as { url?: unknown };
    const videoId = typeof body.url === "string" && body.url.length <= 300 ? parseYouTubeVideoId(body.url) : null;
    if (!videoId) return fail(corsHdrs, 400, "VALIDATION", "Paste the YouTube link for the stream (from the Share button).");
    if (!(await fixtureRow(env, claims.tenantId, fixtureId))) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");
    const changed = await setFixtureStream(env, claims.tenantId, fixtureId, { videoId, source: "link", embeddable: true });
    // "Live now" goes out straight away rather than waiting for the next minute
    if (changed) {
      const work = processDueAlerts(env).catch(() => 0);
      if (ctx) ctx.waitUntil(work); else await work;
    }
    const row = await fixtureRow(env, claims.tenantId, fixtureId);
    return json({ success: true, data: { stream: row ? streamView(row) : null } }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "stream", err);
  }
}

export async function handleDeleteStream(req: Request, env: Env, corsHdrs: Headers, fixtureId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  try {
    await clearFixtureStream(env, claims.tenantId, fixtureId);
    return json({ success: true, data: { stream: null } }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "stream_clear", err);
  }
}

export async function handlePutVenue(req: Request, env: Env, corsHdrs: Headers, fixtureId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  try {
    const body = (await req.json().catch(() => ({}))) as { lat?: unknown; lng?: unknown };
    if (!validCoords(body.lat, body.lng)) return fail(corsHdrs, 400, "VALIDATION", "Location missing or not valid.");
    const res = await env.DB.prepare(`UPDATE fixtures SET venue_lat = ?, venue_lng = ? WHERE tenant_id = ? AND id = ?`)
      .bind(body.lat as number, body.lng as number, claims.tenantId, fixtureId).run();
    if ((res.meta?.changes ?? 0) === 0) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");
    return json({ success: true, data: { venueLocation: { lat: body.lat, lng: body.lng } } }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "venue", err);
  }
}
