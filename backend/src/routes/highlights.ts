/**
 * Match highlights: the moments tapped in Match Centre, played from the
 * match's YouTube video.
 *
 *   GET /api/v1/highlights                 members: recent matches that have highlights
 *   GET /api/v1/fixtures/:id/highlights    members: the clips (staff also see hidden ones)
 *   PUT /api/v1/fixtures/:id/highlights    staff: { lineUp: { videoId, eventId, sec } } lines one part of the
 *                                          match's video up (sec = where that moment is in it); { kickoffSec }
 *                                          does the first part from kick-off; { moment: { id, before?, after?,
 *                                          start?, end?, hidden? } } tweaks one clip
 */
import { json } from "../services/util";
import { hasAnyRole, requireTenantJWT, STAFF_ROLES, type TenantClaims } from "../services/auth";
import { loadEvents, loadFixture } from "../services/liveMatch";
import { streamView } from "../services/matchDay";
import { buildHighlights, fromKickOffPlacer, HIGHLIGHT_TYPES, MAX_SIDE, parseEdits, partsPlacer, shiftFor, type HighlightEdits } from "../services/highlights";
import { loadParts, setPartAnchor, withLegacyKickoff, type VideoPart } from "../services/stream/parts";
import type { LiveEvent } from "../services/liveMatchState";
import { loadClubSocial } from "../services/social/club";
import { withoutVideoConsent } from "../services/consent";

type Env = { DB: D1Database; [key: string]: unknown };

interface VideoRow {
  youtube_live_id: string | null;
  youtube_status: string | null;
  stream_source: string | null;
  stream_embeddable: number | null;
  stream_started_at: number | null;
  video_kickoff_sec: number | null;
  highlight_edits: string | null;
  home_score: number | null;
  away_score: number | null;
}

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

const isStaff = (claims: TenantClaims) => hasAnyRole(claims, STAFF_ROLES);

function internalError(corsHdrs: Headers, where: string, err: unknown): Response {
  console.error(JSON.stringify({ level: "error", msg: "highlights_error", where, error: err instanceof Error ? err.message : String(err) }));
  return fail(corsHdrs, 500, "INTERNAL", "Something went wrong with the highlights. Please try again.");
}

async function loadVideo(env: Env, tenantId: string, fixtureId: string): Promise<VideoRow | null> {
  return env.DB.prepare(
    `SELECT youtube_live_id, youtube_status, stream_source, stream_embeddable, stream_started_at, video_kickoff_sec, highlight_edits, home_score, away_score
     FROM fixtures WHERE tenant_id = ? AND id = ?`,
  ).bind(tenantId, fixtureId).first<VideoRow>();
}

/** What staff pause on to line a part up: the first thing tapped while it was live. */
function lineUpMoment(events: LiveEvent[], part: VideoPart, next: VideoPart | undefined): { eventId: string; label: string } | null {
  const from = part.startedAt ?? part.addedAt;
  const to = next ? (next.startedAt ?? next.addedAt) : Infinity;
  const e = events.find((x) => x.createdAt >= from - 60_000 && x.createdAt < to && (x.type === "kick_off" || x.type === "second_half" || (HIGHLIGHT_TYPES as string[]).includes(x.type)));
  if (!e) return null;
  const label = e.type === "kick_off" ? "kick-off"
    : e.type === "second_half" ? "the second-half kick-off"
    : e.type === "goal" ? `the goal${e.playerName ? ` by ${e.playerName}` : ""}${e.minute !== null ? ` (${e.minute}')` : ""}`
    : `the ${e.type.replace("_", " ")}${e.minute !== null ? ` (${e.minute}')` : ""}`;
  return { eventId: e.id, label };
}

/** The match's video parts with their line-up, and a placer for its taps. */
async function matchVideo(env: Env, tenantId: string, fixtureId: string, row: VideoRow, events: LiveEvent[]) {
  const parts = withLegacyKickoff(await loadParts(env, tenantId, fixtureId), row.video_kickoff_sec, events);
  return { parts, place: partsPlacer(parts) };
}

async function highlightsView(env: Env, claims: TenantClaims, fixtureId: string) {
  const fixture = await loadFixture(env as never, claims.tenantId, fixtureId);
  const row = await loadVideo(env, claims.tenantId, fixtureId);
  if (!fixture || !row) return null;
  const events = await loadEvents(env as never, claims.tenantId, fixtureId);
  const video = streamView(row);
  const { parts, place } = await matchVideo(env, claims.tenantId, fixtureId, row, events);
  const staff = isStaff(claims);
  const edits = parseEdits(row.highlight_edits);
  const all = video ? buildHighlights(events, place, fixture.opponent, edits) : [];
  // Staff making a video from the camera's own recording: clip times from kick-off (can be negative)
  const OFFSET = 100_000;
  const fromKickOff = staff
    ? buildHighlights(events, fromKickOffPlacer(events, OFFSET), fixture.opponent, edits).map((m) => ({ ...m, start: m.start - OFFSET, end: m.end - OFFSET, tapAt: m.tapAt - OFFSET }))
    : [];
  const club = staff ? await loadClubSocial(env as never, claims.tenantId) : null;
  // Staff: players in each clip whose parents haven't said yes to video
  const missing = staff ? await withoutVideoConsent(env, claims.tenantId, events.flatMap((e) => [e.playerId ?? "", e.player2Id ?? ""])) : new Map<string, string>();
  const byEvent = new Map(events.map((e) => [e.id, [e.playerId, e.player2Id].filter((id): id is string => !!id && missing.has(id)).map((id) => missing.get(id)!)]));
  const withConsent = <T extends { id: string }>(list: T[]) => (staff ? list.map((m) => ({ ...m, noVideoConsent: byEvent.get(m.id) ?? [] })) : list);
  const tapped = events.filter((e) => (HIGHLIGHT_TYPES as string[]).includes(e.type));
  const ko = events.find((e) => e.type === "kick_off");
  const kickoffPlaced = ko ? place(ko.createdAt) : null;
  const partViews = parts.map((p, i) => {
    const lineUp = p.anchorSec !== null ? "manual" : p.startedAt !== null ? "automatic" : null;
    return {
      videoId: p.videoId,
      part: i + 1,
      watchUrl: `https://www.youtube.com/watch?v=${p.videoId}`,
      embeddable: p.embeddable,
      lineUp,
      moments: all.filter((m) => m.videoId === p.videoId).length,
      // Staff line a part up by pausing on this moment (always offered, so a part can be nudged)
      lineUpWith: staff ? lineUpMoment(events, p, parts[i + 1]) : null,
    };
  });
  return {
    fixture: { ...fixture, homeScore: row.home_score, awayScore: row.away_score },
    // For the scoreboard drawn on videos made from the camera's recording
    brand: club ? { clubName: club.brand.clubName, primaryColor: club.brand.primaryColor, secondaryColor: club.brand.secondaryColor } : null,
    momentsFromKickOff: withConsent(fromKickOff),
    video,
    parts: partViews,
    kickoffSec: kickoffPlaced ? Math.round(kickoffPlaced.sec) : null,
    lineUp: partViews[0]?.lineUp ?? null,
    moments: staff ? withConsent(all) : all.filter((m) => !m.hidden),
    momentsTapped: tapped.length,
    // Tapped moments that aren't on a lined-up part yet (staff are asked to line it up)
    momentsWaiting: video ? tapped.length - all.length : 0,
    canEdit: staff,
  };
}

export async function handleListHighlights(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  try {
    const types = HIGHLIGHT_TYPES.map(() => "?").join(", ");
    const { results } = await env.DB.prepare(
      `SELECT f.id, f.opponent, f.fixture_date, f.home_team, f.away_team, f.home_score, f.away_score, f.youtube_live_id,
              (SELECT COUNT(*) FROM live_match_events e WHERE e.tenant_id = f.tenant_id AND e.fixture_id = f.id
                 AND e.deleted_at IS NULL AND e.type IN (${types})) AS moments
       FROM fixtures f
       WHERE f.tenant_id = ? AND f.youtube_live_id IS NOT NULL AND f.stream_source IS NOT NULL
         AND substr(f.fixture_date, 1, 10) >= date('now', '-180 days')
       ORDER BY f.fixture_date DESC LIMIT 30`,
    ).bind(...HIGHLIGHT_TYPES, claims.tenantId).all<Record<string, string | number | null>>();
    const matches = (results ?? []).filter((r) => Number(r.moments) > 0).map((r) => ({
      fixtureId: String(r.id),
      opponent: String(r.opponent),
      date: String(r.fixture_date).slice(0, 10),
      homeAway: r.home_team && r.home_team === r.opponent && r.away_team !== r.opponent ? "away" : "home",
      homeScore: r.home_score === null ? null : Number(r.home_score),
      awayScore: r.away_score === null ? null : Number(r.away_score),
      videoId: String(r.youtube_live_id),
      moments: Number(r.moments),
    }));
    return json({ success: true, data: matches }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "list", err);
  }
}

export async function handleGetHighlights(req: Request, env: Env, corsHdrs: Headers, fixtureId: string): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  try {
    const view = await highlightsView(env, claims, fixtureId);
    if (!view) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");
    return json({ success: true, data: view }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "get", err);
  }
}

export async function handlePutHighlights(req: Request, env: Env, corsHdrs: Headers, fixtureId: string): Promise<Response> {
  const claims = await member(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  if (!isStaff(claims)) return fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can edit the highlights.");
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return fail(corsHdrs, 400, "INVALID_BODY", "Couldn't read that request.");
  }
  try {
    const row = await loadVideo(env, claims.tenantId, fixtureId);
    if (!row) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");

    const validSec = (sec: unknown) => typeof sec === "number" && Number.isFinite(sec) && sec >= 0 && sec <= 6 * 3600;

    // The first part, lined up on kick-off (older apps send this)
    if ("kickoffSec" in body) {
      const sec = body.kickoffSec;
      if (sec !== null && !validSec(sec)) return fail(corsHdrs, 400, "VALIDATION", "Kick-off needs to be a time within the video.");
      const events = await loadEvents(env as never, claims.tenantId, fixtureId);
      const ko = events.find((e) => e.type === "kick_off");
      const first = (await loadParts(env, claims.tenantId, fixtureId))[0];
      if (first && ko) await setPartAnchor(env, claims.tenantId, fixtureId, first.videoId, sec === null ? null : { sec: sec as number, at: ko.createdAt });
      await env.DB.prepare(`UPDATE fixtures SET video_kickoff_sec = ? WHERE tenant_id = ? AND id = ?`)
        .bind(sec === null ? null : Math.round(sec as number), claims.tenantId, fixtureId).run();
    }

    // { lineUp: { videoId, eventId, sec } }: in that part, `sec` seconds in is where that moment happens
    if ("lineUp" in body) {
      const l = body.lineUp as Record<string, unknown> | null;
      if (!l || typeof l.videoId !== "string" || typeof l.eventId !== "string") return fail(corsHdrs, 400, "VALIDATION", "Which video and moment?");
      if (l.sec !== null && !validSec(l.sec)) return fail(corsHdrs, 400, "VALIDATION", "That needs to be a time within the video.");
      const events = await loadEvents(env as never, claims.tenantId, fixtureId);
      const e = events.find((x) => x.id === l.eventId);
      if (!e) return fail(corsHdrs, 404, "NOT_FOUND", "That moment isn't in this match.");
      const ok = await setPartAnchor(env, claims.tenantId, fixtureId, l.videoId, l.sec === null ? null : { sec: l.sec as number, at: e.createdAt });
      if (!ok) return fail(corsHdrs, 404, "NOT_FOUND", "That video isn't part of this match.");
    }

    if ("moment" in body) {
      const m = body.moment as Record<string, unknown> | null;
      if (!m || typeof m !== "object" || typeof m.id !== "string") return fail(corsHdrs, 400, "VALIDATION", "Which clip?");
      const events = await loadEvents(env as never, claims.tenantId, fixtureId);
      if (!events.some((e) => e.id === m.id)) return fail(corsHdrs, 404, "NOT_FOUND", "That moment isn't in this match.");
      const edits: HighlightEdits = parseEdits(row.highlight_edits);
      const next = { ...(edits[m.id] ?? {}) };
      // "Start 12 seconds before the tap, end 5 after"
      if (m.before !== undefined || m.after !== undefined) {
        const event = events.find((e) => e.id === m.id)!;
        const current = buildHighlights(events, fromKickOffPlacer(events, 100_000), "", edits).find((c) => c.id === m.id);
        const before = m.before === undefined ? current?.before : m.before;
        const after = m.after === undefined ? current?.after : m.after;
        if (typeof before !== "number" || typeof after !== "number" || !Number.isFinite(before) || !Number.isFinite(after) || before < 0 || after < 0 || before > MAX_SIDE || after > MAX_SIDE) {
          return fail(corsHdrs, 400, "VALIDATION", `Clips can start and end up to ${MAX_SIDE} seconds either side of the moment.`);
        }
        const shift = shiftFor(event.type, before, after);
        if (!shift) return fail(corsHdrs, 400, "VALIDATION", "That moment isn't a highlight.");
        next.start = shift.start;
        next.end = shift.end;
      }
      for (const key of ["start", "end"] as const) {
        if (m[key] === undefined) continue;
        if (typeof m[key] !== "number" || !Number.isFinite(m[key])) return fail(corsHdrs, 400, "VALIDATION", "Clip changes need to be in seconds.");
        next[key] = m[key] as number;
      }
      if (m.hidden !== undefined) next.hidden = m.hidden === true;
      edits[m.id] = next;
      // parseEdits clamps each change to a minute either way
      await env.DB.prepare(`UPDATE fixtures SET highlight_edits = ? WHERE tenant_id = ? AND id = ?`)
        .bind(JSON.stringify(parseEdits(JSON.stringify(edits))), claims.tenantId, fixtureId).run();
    }

    const view = await highlightsView(env, claims, fixtureId);
    return json({ success: true, data: view }, 200, corsHdrs);
  } catch (err) {
    return internalError(corsHdrs, "put", err);
  }
}
