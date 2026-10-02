/**
 * Training sessions: staff plan them (date, time, place, focus, drills) and
 * tick who came; everyone at the club sees the plan.
 *
 *   GET    /api/v1/training/sessions                 members: sessions, newest first, with attendance counts
 *   POST   /api/v1/training/sessions                 staff: plan a session
 *   PUT    /api/v1/training/sessions/:id             staff: change it
 *   DELETE /api/v1/training/sessions/:id             staff: remove it (and its register)
 *   GET    /api/v1/training/sessions/:id/attendance  staff: the squad with who came
 *   PUT    /api/v1/training/sessions/:id/attendance  staff: { present: [playerIds] }
 *
 * Responses keep the older field names (session_date, session_time, team,
 * focus) that the website's training page reads.
 */
import { json } from "../services/util";
import { requireStaff, requireTenantJWT } from "../services/auth";
import { logJSON } from "../lib/log";

type Env = { DB: D1Database; [key: string]: unknown };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** "lib:drill-001" for the built-in library, "club:<id>" for a club's own drill */
const DRILL_REF = /^(lib|club):[\w-]{1,64}$/;
const MAX_DRILLS = 20;

export interface SessionInput {
  date: string;
  time: string | null;
  location: string | null;
  focus: string;
  notes: string | null;
  team: string | null;
  drills: string[];
}

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().replace(/\s+/g, " ").slice(0, max) : null);

/** Checks a session from the app or website; partial for updates. */
export function parseSession(body: unknown, partial: boolean): Partial<SessionInput> | string {
  if (!body || typeof body !== "object") return "Send the session as JSON.";
  const b = body as Record<string, unknown>;
  const out: Partial<SessionInput> = {};
  if (b.date !== undefined || !partial) {
    const date = typeof b.date === "string" ? b.date.trim().slice(0, 10) : "";
    if (!DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return "Choose the session date.";
    out.date = date;
  }
  if (b.time !== undefined) {
    const time = typeof b.time === "string" ? b.time.trim() : "";
    if (time && !TIME.test(time)) return "Enter the time as HH:MM, for example 18:30.";
    out.time = time || null;
  }
  if (b.focus !== undefined || b.title !== undefined || !partial) out.focus = text(b.focus ?? b.title, 80) ?? "Training";
  if (b.location !== undefined) out.location = text(b.location, 120);
  if (b.notes !== undefined) out.notes = text(b.notes, 1000);
  if (b.team !== undefined) out.team = text(b.team, 60);
  if (b.drills !== undefined) {
    if (!Array.isArray(b.drills)) return "Drills must be a list.";
    if (b.drills.some((d) => typeof d !== "string" || !DRILL_REF.test(d))) return "One of those drills wasn't recognised.";
    const refs = [...new Set(b.drills as string[])];
    if (refs.length > MAX_DRILLS) return `A session can have up to ${MAX_DRILLS} drills.`;
    out.drills = refs;
  }
  return out;
}

interface PlanRow {
  id: string; title: string; scheduled_date: string; description: string | null; start_time: string | null;
  location: string | null; notes: string | null; drill_refs: string | null; present: number | null; marked: number | null;
}

function legacyMeta(description: string | null): Record<string, unknown> {
  try {
    const v = JSON.parse(description || "{}");
    return v && typeof v === "object" ? v as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function sessionOut(r: PlanRow) {
  const meta = legacyMeta(r.description);
  let drills: string[] = [];
  try { drills = JSON.parse(r.drill_refs || "[]"); } catch { drills = []; }
  const time = r.start_time ?? (typeof meta.time === "string" ? meta.time : "");
  return {
    id: r.id,
    session_date: String(r.scheduled_date).slice(0, 10),
    session_time: time,
    team: typeof meta.team === "string" ? meta.team : "First Team",
    focus: r.title,
    location: r.location,
    notes: r.notes,
    drills,
    status: typeof meta.status === "string" ? meta.status : "planned",
    attendance: { present: Number(r.present) || 0, marked: Number(r.marked) || 0 },
  };
}

const SELECT = `
  SELECT p.*,
    (SELECT COUNT(*) FROM training_attendance a WHERE a.tenant_id = p.tenant_id AND a.plan_id = p.id AND a.present = 1) AS present,
    (SELECT COUNT(*) FROM training_attendance a WHERE a.tenant_id = p.tenant_id AND a.plan_id = p.id) AS marked
  FROM training_plans p`;

async function staffClaims(req: Request, env: Env, corsHdrs: Headers): Promise<{ tenantId: string; sub?: string } | Response> {
  try {
    return await requireStaff(req, env);
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can plan training.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

export async function handleListTrainingSessions(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  let tenantId: string;
  try {
    tenantId = (await requireTenantJWT(req, env)).tenantId;
  } catch {
    return fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
  const { results } = await env.DB.prepare(`${SELECT} WHERE p.tenant_id = ? ORDER BY p.scheduled_date DESC, p.start_time DESC LIMIT 200`).bind(tenantId).all<PlanRow>();
  return json({ success: true, data: (results ?? []).map(sessionOut) }, 200, corsHdrs);
}

export async function handleCreateTrainingSession(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await staffClaims(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const input = parseSession(await req.json().catch(() => null), false);
  if (typeof input === "string") return fail(corsHdrs, 400, "INVALID", input);
  const id = crypto.randomUUID();
  const now = Date.now();
  // description keeps the older JSON the website reads (time, team, status)
  const description = JSON.stringify({ time: input.time ?? "", team: input.team ?? "First Team", status: "planned" });
  await env.DB.prepare(
    `INSERT INTO training_plans (id, tenant_id, title, scheduled_date, description, start_time, location, notes, drill_refs, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, claims.tenantId, input.focus, input.date, description, input.time ?? null, input.location ?? null, input.notes ?? null,
    JSON.stringify(input.drills ?? []), claims.sub ?? "staff", now, now).run();
  logJSON({ level: "info", msg: "training_session_created", tenant: claims.tenantId, id });
  const row = await env.DB.prepare(`${SELECT} WHERE p.id = ? AND p.tenant_id = ?`).bind(id, claims.tenantId).first<PlanRow>();
  return json({ success: true, id, data: row ? sessionOut(row) : null }, 201, corsHdrs);
}

export async function handleUpdateTrainingSession(req: Request, env: Env, corsHdrs: Headers, id: string): Promise<Response> {
  const claims = await staffClaims(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const input = parseSession(await req.json().catch(() => null), true);
  if (typeof input === "string") return fail(corsHdrs, 400, "INVALID", input);
  const existing = await env.DB.prepare(`SELECT description FROM training_plans WHERE id = ? AND tenant_id = ?`).bind(id, claims.tenantId).first<{ description: string | null }>();
  if (!existing) return fail(corsHdrs, 404, "NOT_FOUND", "Session not found");
  const meta = legacyMeta(existing.description);
  if (input.time !== undefined) meta.time = input.time ?? "";
  if (input.team !== undefined) meta.team = input.team ?? "First Team";
  await env.DB.prepare(
    `UPDATE training_plans SET
       title = COALESCE(?, title), scheduled_date = COALESCE(?, scheduled_date), description = ?,
       start_time = CASE WHEN ? THEN ? ELSE start_time END,
       location = CASE WHEN ? THEN ? ELSE location END,
       notes = CASE WHEN ? THEN ? ELSE notes END,
       drill_refs = COALESCE(?, drill_refs), updated_at = ?
     WHERE id = ? AND tenant_id = ?`,
  ).bind(
    input.focus ?? null, input.date ?? null, JSON.stringify(meta),
    input.time !== undefined ? 1 : 0, input.time ?? null,
    input.location !== undefined ? 1 : 0, input.location ?? null,
    input.notes !== undefined ? 1 : 0, input.notes ?? null,
    input.drills ? JSON.stringify(input.drills) : null, Date.now(), id, claims.tenantId,
  ).run();
  const row = await env.DB.prepare(`${SELECT} WHERE p.id = ? AND p.tenant_id = ?`).bind(id, claims.tenantId).first<PlanRow>();
  return json({ success: true, data: row ? sessionOut(row) : null }, 200, corsHdrs);
}

export async function handleDeleteTrainingSession(req: Request, env: Env, corsHdrs: Headers, id: string): Promise<Response> {
  const claims = await staffClaims(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM training_attendance WHERE tenant_id = ? AND plan_id = ?`).bind(claims.tenantId, id),
    env.DB.prepare(`DELETE FROM training_plan_drills WHERE plan_id = ? AND plan_id IN (SELECT id FROM training_plans WHERE id = ? AND tenant_id = ?)`).bind(id, id, claims.tenantId),
    env.DB.prepare(`DELETE FROM training_plans WHERE id = ? AND tenant_id = ?`).bind(id, claims.tenantId),
  ]);
  return json({ success: true }, 200, corsHdrs);
}

export async function handleGetTrainingAttendance(req: Request, env: Env, corsHdrs: Headers, id: string): Promise<Response> {
  const claims = await staffClaims(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const plan = await env.DB.prepare(`SELECT id FROM training_plans WHERE id = ? AND tenant_id = ?`).bind(id, claims.tenantId).first();
  if (!plan) return fail(corsHdrs, 404, "NOT_FOUND", "Session not found");
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.name, s.number, a.present
     FROM squad s LEFT JOIN training_attendance a ON a.tenant_id = s.tenant_id AND a.plan_id = ? AND a.player_id = s.id
     WHERE s.tenant_id = ? ORDER BY s.name`,
  ).bind(id, claims.tenantId).all<{ id: string; name: string; number: number | null; present: number | null }>();
  const players = (results ?? []).map((r) => ({ id: r.id, name: r.name, number: r.number, present: r.present === null ? null : r.present === 1 }));
  return json({ success: true, data: { players } }, 200, corsHdrs);
}

export async function handleSetTrainingAttendance(req: Request, env: Env, corsHdrs: Headers, id: string): Promise<Response> {
  const claims = await staffClaims(req, env, corsHdrs);
  if (claims instanceof Response) return claims;
  const body = await req.json().catch(() => null) as { present?: unknown } | null;
  if (!body || !Array.isArray(body.present) || body.present.some((p) => typeof p !== "string")) return fail(corsHdrs, 400, "INVALID", "Send the players who came as a list.");
  const plan = await env.DB.prepare(`SELECT id FROM training_plans WHERE id = ? AND tenant_id = ?`).bind(id, claims.tenantId).first();
  if (!plan) return fail(corsHdrs, 404, "NOT_FOUND", "Session not found");
  const present = new Set(body.present as string[]);
  const { results } = await env.DB.prepare(`SELECT id FROM squad WHERE tenant_id = ?`).bind(claims.tenantId).all<{ id: string }>();
  const squad = (results ?? []).map((r) => r.id);
  const now = Date.now();
  // Everyone in the squad gets a mark: came or didn't
  const statements = squad.map((playerId) => env.DB.prepare(
    `INSERT INTO training_attendance (tenant_id, plan_id, player_id, present, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(tenant_id, plan_id, player_id) DO UPDATE SET present = excluded.present, updated_at = excluded.updated_at`,
  ).bind(claims.tenantId, id, playerId, present.has(playerId) ? 1 : 0, now));
  if (statements.length) await env.DB.batch(statements);
  const came = squad.filter((p) => present.has(p)).length;
  logJSON({ level: "info", msg: "training_attendance_set", tenant: claims.tenantId, id, present: came });
  return json({ success: true, data: { present: came, marked: squad.length } }, 200, corsHdrs);
}
