/**
 * Match line-ups.
 *
 *   GET  /api/v1/fixtures/:id/lineup           members
 *   PUT  /api/v1/fixtures/:id/lineup           staff: { teamSize, starters: [ids], subs: [ids], makeClubDefault? }
 *   POST /api/v1/fixtures/:id/lineup/publish   staff: posts the team news (app, Facebook, Instagram)
 */
import { json } from "../services/util";
import { requireStaff, requireTenantJWT, type TenantClaims } from "../services/auth";
import { getLineup, lineupProblem, saveLineup } from "../services/lineup";
import { loadFixture } from "../services/liveMatch";
import { drawAndPostSoon, queuePost } from "../services/social/jobs";

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
      ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can pick the team.")
      : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

function ids(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((v) => typeof v === "string") ? (value as string[]) : null;
}

export async function handleGetLineup(req: Request, env: Env, corsHdrs: Headers, fixtureId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  if (!(await loadFixture(env, claims.tenantId, fixtureId))) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");
  return json({ success: true, data: await getLineup(env, claims.tenantId, fixtureId) }, 200, corsHdrs);
}

export async function handleSaveLineup(req: Request, env: Env, corsHdrs: Headers, fixtureId: string): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  if (!(await loadFixture(env, claims.tenantId, fixtureId))) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");

  const body = (await req.json().catch(() => ({}))) as { teamSize?: unknown; starters?: unknown; subs?: unknown; makeClubDefault?: unknown };
  const starters = ids(body.starters);
  const subs = ids(body.subs ?? []);
  if (!starters || !subs) return fail(corsHdrs, 400, "VALIDATION", "Send the starting players and subs as lists of player ids.");
  const problem = lineupProblem(body.teamSize, starters, subs);
  if (problem) return fail(corsHdrs, 400, "VALIDATION", problem);

  const all = [...starters, ...subs];
  const { results } = await env.DB.prepare(`SELECT id FROM squad WHERE tenant_id = ? AND id IN (${all.map(() => "?").join(",")})`)
    .bind(claims.tenantId, ...all).all<{ id: string }>();
  if ((results || []).length !== all.length) return fail(corsHdrs, 400, "VALIDATION", "Some of those players aren't in your squad.");

  await saveLineup(env, claims.tenantId, fixtureId, body.teamSize as number, starters, subs, body.makeClubDefault === true);
  return json({ success: true, data: await getLineup(env, claims.tenantId, fixtureId) }, 200, corsHdrs);
}

export async function handlePublishLineup(req: Request, env: Env, corsHdrs: Headers, fixtureId: string, ctx?: ExecutionContext): Promise<Response> {
  const claims = await authenticate(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const fixture = await loadFixture(env, claims.tenantId, fixtureId);
  if (!fixture) return fail(corsHdrs, 404, "NOT_FOUND", "Match not found.");
  const lineup = await getLineup(env, claims.tenantId, fixtureId);
  if (lineup.starters.length !== lineup.teamSize) return fail(corsHdrs, 409, "NOT_READY", "Pick the starting players first.");

  // Each publish is its own post, so an updated team sheet can be posted again
  const newPost = await queuePost(env as never, {
    tenantId: claims.tenantId,
    fixtureId,
    sourceType: "lineup",
    sourceId: `${fixtureId}:${Date.now()}`,
    match: {
      opponent: fixture.opponent, homeAway: fixture.homeAway, ourScore: 0, theirScore: 0,
      competition: fixture.competition, date: fixture.date, time: fixture.time, venue: fixture.venue,
    },
    input: {
      kind: "lineup",
      minute: null,
      lineup: {
        teamSize: lineup.teamSize,
        kickOff: fixture.time,
        venue: fixture.venue,
        starters: lineup.starters.map((p) => ({ name: p.name, number: p.number })),
        subs: lineup.subs.map((p) => ({ name: p.name, number: p.number })),
      },
    },
  });
  if (!newPost) return fail(corsHdrs, 409, "NOT_POSTED", "Line-up posts are switched off in your settings.");
  drawAndPostSoon(env as never, ctx, claims.tenantId, newPost);
  return json({ success: true, data: { newPost } }, 201, corsHdrs);
}
