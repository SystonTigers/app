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
import { hasAnyRole, requireStaff, requireTenantJWT, STAFF_ROLES, type TenantClaims } from "../services/auth";
import { computeState, isLiveEventType, matchMinute, rejectReason, undoBlockedReason, type LiveEventType } from "../services/liveMatchState";
import { describeMatch, loadEvents, loadFixture, recentLiveFixtureIds, recordFullTime, revertFullTime, setMatchStatus, type LiveFixture } from "../services/liveMatch";
import { cancelPost, jobsForFixture, postPerson, queuePost, type JobSummary } from "../services/social/jobs";
import { isPostKind } from "../services/social/content";
import type { LiveEvent } from "../services/liveMatchState";
import { getSession, openVote } from "../services/motm";
import { playersWhoPlayed } from "../services/lineup";

const MOTM_VOTING_HOURS = 48;

/**
 * Full time: open Man of the Match voting straight away, nominating everyone
 * who played (starting line-up plus subs who came on). Needs a line-up; if
 * the manager already set up a vote, it's left alone.
 */
async function openMotmAtFullTime(env: Env, tenantId: string, fixtureId: string): Promise<boolean> {
  if (await getSession(env, tenantId, fixtureId)) return false;
  const nominees = await playersWhoPlayed(env, tenantId, fixtureId);
  if (nominees.length < 2) return false;
  const start = new Date();
  const end = new Date(start.getTime() + MOTM_VOTING_HOURS * 3600_000);
  return openVote(env, tenantId, fixtureId, { nominees: nominees.slice(0, 25), status: "active", start: start.toISOString(), end: end.toISOString(), autoPost: true });
}

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

async function matchResponse(env: Env, claims: TenantClaims, fixtureId: string, corsHdrs: Headers, extra: Record<string, unknown> = {}, status = 200): Promise<Response> {
  const fixture = await loadFixture(env, claims.tenantId, fixtureId);
  if (!fixture) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");
  const view = describeMatch(fixture, await loadEvents(env, claims.tenantId, fixtureId));
  // Staff also see what's been (or is about to be) posted for each update
  const posts = hasAnyRole(claims, STAFF_ROLES) ? await jobsForFixture(env, claims.tenantId, fixtureId) : undefined;
  return json({ success: true, data: { ...view, ...(posts ? { posts } : {}), ...extra } }, status, corsHdrs);
}

/** Queue the automatic post for a newly recorded event (if the club posts that kind of event). */
/** How many goals this event's scorer has so far this match, counting this one. */
function goalNumberFor(events: LiveEvent[], event: LiveEvent): number {
  if (!event.playerId) return 1;
  const upTo = events.findIndex((e) => e.id === event.id);
  const earlier = upTo === -1 ? events : events.slice(0, upTo + 1);
  const n = earlier.filter((e) => e.type === "goal" && e.playerId === event.playerId).length;
  return upTo === -1 ? n + 1 : n;
}

async function queueEventPost(env: Env, tenantId: string, fixture: LiveFixture, events: LiveEvent[], event: LiveEvent): Promise<JobSummary | null> {
  if (!isPostKind(event.type)) return null;
  const state = describeMatch(fixture, events);
  const [player, player2] = await Promise.all([
    postPerson(env, tenantId, event.playerId, event.playerName),
    postPerson(env, tenantId, event.player2Id, event.player2Name),
  ]);
  return queuePost(env, {
    tenantId,
    fixtureId: fixture.id,
    sourceType: "live_event",
    sourceId: event.id,
    match: { opponent: fixture.opponent, homeAway: fixture.homeAway, ourScore: state.ourScore, theirScore: state.theirScore, competition: fixture.competition },
    input: {
      kind: event.type,
      minute: event.minute,
      player,
      player2,
      goalNumber: event.type === "goal" ? goalNumberFor(events, event) : undefined,
      scorers: event.type === "full_time" ? events.filter((e) => e.type === "goal").map((e) => e.playerName ?? "Unknown") : undefined,
    },
  });
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
    return await matchResponse(env, claims, fixtureId, corsHdrs);
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
      type?: unknown; playerId?: unknown; player2Id?: unknown; text?: unknown; minute?: unknown; clientEventId?: unknown; halfLength?: unknown; occurredAt?: unknown;
    };
    if (!isLiveEventType(body.type)) return fail(corsHdrs, 400, "VALIDATION", "Choose what happened.");
    const type: LiveEventType = body.type;
    const clientEventId = typeof body.clientEventId === "string" && body.clientEventId.length <= 100 ? body.clientEventId : crypto.randomUUID();

    const fixture = await loadFixture(env, claims.tenantId, fixtureId);
    if (!fixture) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");

    // A retried tap (poor signal on the touchline) is recorded once
    const repeat = await env.DB.prepare(`SELECT 1 AS hit FROM live_match_events WHERE tenant_id = ? AND client_event_id = ?`)
      .bind(claims.tenantId, clientEventId).first();
    if (repeat) return matchResponse(env, claims, fixtureId, corsHdrs);

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

    // When the manager tapped (sent by the phone), so a slow connection doesn't shift the
    // match clock or the footage timings. Trusted only if it's within the last 15 minutes.
    const now = Date.now();
    const tapped = Number(body.occurredAt);
    const occurredAt = Number.isFinite(tapped) && tapped <= now + 60_000 && tapped >= now - 15 * 60_000 ? Math.round(tapped) : now;
    const given = Number(body.minute);
    const minute = Number.isInteger(given) && given >= 0 && given <= 130 ? given : matchMinute(state, occurredAt);

    const eventId = crypto.randomUUID();
    try {
      await env.DB.prepare(
        `INSERT INTO live_match_events (id, tenant_id, fixture_id, type, minute, player_id, player_name, player2_id, player2_name, text, client_event_id, created_by, created_at, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        eventId, claims.tenantId, fixtureId, type, minute,
        player?.id ?? null, player?.name ?? null, player2?.id ?? null, player2?.name ?? null,
        text || null, clientEventId, claims.userId ?? null, now, occurredAt,
      ).run();
    } catch (err) {
      // Two staff tapped the same half-time/full-time button at once
      if (/UNIQUE/.test(err instanceof Error ? err.message : String(err))) {
        return matchResponse(env, claims, fixtureId, corsHdrs);
      }
      throw err;
    }

    const updated = await loadEvents(env, claims.tenantId, fixtureId);
    const newState = computeState(updated);
    let motmOpened = false;
    if (type === "full_time") {
      await recordFullTime(env, claims.tenantId, fixture, updated);
      try {
        motmOpened = await openMotmAtFullTime(env, claims.tenantId, fixtureId);
      } catch (err) {
        console.error(JSON.stringify({ level: "error", msg: "motm_auto_open_failed", fixtureId, error: err instanceof Error ? err.message : String(err) }));
      }
    }
    await setMatchStatus(env, claims.tenantId, fixtureId, newState.status);

    // A failed post must never lose the update itself
    let newPost: JobSummary | null = null;
    try {
      const recorded = updated.find((e) => e.id === eventId);
      if (recorded) newPost = await queueEventPost(env, claims.tenantId, fixture, updated, recorded);
    } catch (err) {
      console.error(JSON.stringify({ level: "error", msg: "social_queue_failed", fixtureId, error: err instanceof Error ? err.message : String(err) }));
    }
    return matchResponse(env, claims, fixtureId, corsHdrs, { newPost, motmOpened }, 201);
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
    // Stop the post going out, or take it down from the app and Facebook if it already has
    const undonePost = await cancelPost(env, claims.tenantId, "live_event", eventId);
    return matchResponse(env, claims, fixtureId, corsHdrs, { undonePost });
  } catch (err) {
    return internalError(corsHdrs, "undo", err);
  }
}
