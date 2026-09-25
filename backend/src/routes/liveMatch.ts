/**
 * Live match updates.
 *
 * Staff record what happens from the touchline (kick off, goals, cards, subs,
 * notes, half time, full time) and can undo mistakes. Members follow along in
 * the app; the public club page shows the live score.
 *
 *   GET    /api/v1/live                                  matches with recent live activity (members)
 *   GET    /api/v1/fixtures/:id/live                     one match (members)
 *   POST   /api/v1/fixtures/:id/live/events              record an event (staff)
 *   DELETE /api/v1/fixtures/:id/live/events/:eventId     undo an event (staff)
 */
import { json } from "../services/util";
import { requireStaff, requireTenantJWT, type TenantClaims } from "../services/auth";
import { computeState, isLiveEventType, matchMinute, rejectReason, undoBlockedReason, type LiveEventType } from "../services/liveMatchState";
import { describeMatch, loadEvents, loadFixture, recentLiveFixtureIds, recordFullTime, revertFullTime, setMatchStatus } from "../services/liveMatch";

type Env = { DB: D1Database; [key: string]: unknown };

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function authenticate(req: Request, env: Env, corsHdrs: Headers, staff: boolean): Promise<TenantClaims | Response> {
  try {
    return staff ? await requireStaff(req, env) : await requireTenantJWT(req, env);
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403
      ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can post live updates.")
      : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

function internalError(corsHdrs: Headers, where: string, err: unknown): Response {
  console.error(JSON.stringify({ level: "error", msg: "live_match_error", where, error: err instanceof Error ? err.message : String(err) }));
  return fail(corsHdrs, 500, "INTERNAL", "Something went wrong with the live match. Please try again.");
}

async function matchResponse(env: Env, tenantId: string, fixtureId: string, corsHdrs: Headers): Promise<Response> {
  const fixture = await loadFixture(env, tenantId, fixtureId);
  if (!fixture) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");
  return json({ success: true, data: describeMatch(fixture, await loadEvents(env, tenantId, fixtureId)) }, 200, corsHdrs);
}

export async function handleListLive(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  try {
    const ids = await recentLiveFixtureIds(env, claims.tenantId);
    const matches = [];
    for (const id of ids) {
      const fixture = await loadFixture(env, claims.tenantId, id);
      if (fixture) matches.push(describeMatch(fixture, await loadEvents(env, claims.tenantId, id)));
    }
    return json({ success: true, data: matches }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "list", err);
  }
}

export async function handleGetLive(req: Request, env: Env, corsHdrs: Headers, fixtureId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  try {
    return await matchResponse(env, claims.tenantId, fixtureId, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "get", err);
  }
}

async function squadName(env: Env, tenantId: string, playerId: unknown): Promise<{ id: string; name: string } | null | "invalid"> {
  if (playerId === undefined || playerId === null || playerId === "") return null;
  if (typeof playerId !== "string") return "invalid";
  const row = await env.DB.prepare(`SELECT id, name FROM squad WHERE tenant_id = ? AND id = ?`).bind(tenantId, playerId).first<{ id: string; name: string }>();
  return row ?? "invalid";
}

export async function handleRecordLiveEvent(req: Request, env: Env, corsHdrs: Headers, fixtureId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      type?: unknown; playerId?: unknown; player2Id?: unknown; text?: unknown; minute?: unknown; clientEventId?: unknown; halfLength?: unknown;
    };
    if (!isLiveEventType(body.type)) return fail(corsHdrs, 400, "VALIDATION", "Choose what happened.");
    const type: LiveEventType = body.type;
    const clientEventId = typeof body.clientEventId === "string" && body.clientEventId.length <= 100 ? body.clientEventId : crypto.randomUUID();

    const fixture = await loadFixture(env, claims.tenantId, fixtureId);
    if (!fixture) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");

    // A retried tap (poor signal on the touchline) is recorded once
    const repeat = await env.DB.prepare(`SELECT 1 AS hit FROM live_match_events WHERE tenant_id = ? AND client_event_id = ?`)
      .bind(claims.tenantId, clientEventId).first();
    if (repeat) return matchResponse(env, claims.tenantId, fixtureId, corsHdrs);

    const events = await loadEvents(env, claims.tenantId, fixtureId);
    const state = computeState(events);
    const reason = rejectReason(state, type);
    if (reason) return fail(corsHdrs, 409, "NOT_NOW", reason);

    const player = await squadName(env, claims.tenantId, body.playerId);
    const player2 = await squadName(env, claims.tenantId, body.player2Id);
    if (player === "invalid" || player2 === "invalid") return fail(corsHdrs, 400, "VALIDATION", "That player isn't in your squad.");
    if ((type === "goal" || type === "yellow" || type === "red") && !player) {
      return fail(corsHdrs, 400, "VALIDATION", type === "goal" ? "Choose who scored." : "Choose which player was booked.");
    }
    if (type === "sub" && (!player || !player2)) return fail(corsHdrs, 400, "VALIDATION", "Choose who came on and who went off.");

    let text = typeof body.text === "string" ? body.text.trim().slice(0, 280) : "";
    if (type === "note" && !text) return fail(corsHdrs, 400, "VALIDATION", "Write the update first.");
    if (type === "kick_off") {
      const half = Number(body.halfLength);
      text = Number.isInteger(half) && half >= 5 && half <= 60 ? String(half) : "";
    }

    const now = Date.now();
    const given = Number(body.minute);
    const minute = Number.isInteger(given) && given >= 0 && given <= 130 ? given : matchMinute(state, now);

    try {
      await env.DB.prepare(
        `INSERT INTO live_match_events (id, tenant_id, fixture_id, type, minute, player_id, player_name, player2_id, player2_name, text, client_event_id, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(), claims.tenantId, fixtureId, type, minute,
        player?.id ?? null, player?.name ?? null, player2?.id ?? null, player2?.name ?? null,
        text || null, clientEventId, claims.userId ?? null, now,
      ).run();
    } catch (err) {
      // Two staff tapped the same half-time/full-time button at once
      if (/UNIQUE/.test(err instanceof Error ? err.message : String(err))) {
        return matchResponse(env, claims.tenantId, fixtureId, corsHdrs);
      }
      throw err;
    }

    const updated = await loadEvents(env, claims.tenantId, fixtureId);
    const newState = computeState(updated);
    if (type === "full_time") await recordFullTime(env, claims.tenantId, fixture, updated);
    await setMatchStatus(env, claims.tenantId, fixtureId, newState.status);
    return json({ success: true, data: describeMatch(fixture, updated) }, 201, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "record", err);
  }
}

export async function handleUndoLiveEvent(req: Request, env: Env, corsHdrs: Headers, fixtureId: string, eventId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  try {
    const events = await loadEvents(env, claims.tenantId, fixtureId);
    const target = events.find((e) => e.id === eventId);
    if (!target) return fail(corsHdrs, 404, "NOT_FOUND", "That update has already been removed.");
    const blocked = undoBlockedReason(events, target);
    if (blocked) return fail(corsHdrs, 409, "NOT_NOW", blocked);

    await env.DB.prepare(`UPDATE live_match_events SET deleted_at = ? WHERE tenant_id = ? AND id = ?`)
      .bind(Date.now(), claims.tenantId, eventId).run();
    if (target.type === "full_time") await revertFullTime(env, claims.tenantId, fixtureId);

    const remaining = events.filter((e) => e.id !== eventId);
    await setMatchStatus(env, claims.tenantId, fixtureId, computeState(remaining).status);
    return matchResponse(env, claims.tenantId, fixtureId, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "undo", err);
  }
}
