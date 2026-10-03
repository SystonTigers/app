/**
 * Drills: the club's own drills, everyone's favourites, and TikTok/Instagram/
 * YouTube links on any drill (built-in "lib:<id>" or the club's "club:<id>").
 *
 *   GET    /api/v1/training/drills                 members: { data: club drills, favourites: refs, links: { ref: [...] } }
 *   POST   /api/v1/training/drills                 staff: a new club drill
 *   PUT    /api/v1/training/drills/:id             staff: change a club drill
 *   DELETE /api/v1/training/drills/:id             staff: removes it with its links and favourites
 *   PUT    /api/v1/training/drill-favourites       members: { ref, favourite } -> { favourites }
 *   POST   /api/v1/training/drill-links            staff: { ref, url } -> the link with its preview
 *   DELETE /api/v1/training/drill-links/:id        staff
 */
import { json } from "../services/util";
import { requireStaff, requireTenantJWT, type TenantClaims } from "../services/auth";
import { isDrillRef, legacyDescription, readDrillInput, readVideoLink, storedList, type DrillInput } from "../services/drills";
import { linkPreview } from "../services/drillLinkPreview";
import { deleteMedia, keyFromMediaUrl, type MediaEnv } from "../services/media";

type Env = MediaEnv & { DB: D1Database; LINK_PREVIEWS?: string; [key: string]: unknown };

const MAX_LINKS_PER_DRILL = 10;
const MAX_CLUB_DRILLS = 500;

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function who(req: Request, env: Env, corsHdrs: Headers, staff: boolean): Promise<TenantClaims | Response> {
  try {
    return staff ? await requireStaff(req, env) : await requireTenantJWT(req, env);
  } catch (err) {
    const status = err instanceof Response ? err.status : 401;
    return status === 403 ? fail(corsHdrs, 403, "FORBIDDEN", "Only club staff can change drills.") : fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
}

async function body(req: Request): Promise<Record<string, unknown> | null> {
  const parsed = await req.json().catch(() => null);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
}

function userOf(claims: TenantClaims): string {
  return claims.userId || claims.sub || "";
}

/** A club drill as the app and website show it. */
function drillView(r: Record<string, unknown>) {
  const legacy = legacyDescription(String(r.description ?? ""));
  return {
    id: String(r.id),
    ref: `club:${r.id}`,
    name: String(r.title ?? ""),
    category: String(r.category ?? ""),
    duration: `${Number(r.duration_minutes ?? 0)} mins`,
    durationMinutes: Number(r.duration_minutes ?? 0),
    players: (r.players as string | null) ?? legacy.players ?? "Any",
    difficulty: (r.difficulty as string | null) ?? legacy.difficulty ?? "intermediate",
    equipment: storedList(r.equipment),
    focus: storedList(r.focus),
    description: legacy.description,
    setup: (r.setup as string | null) ?? null,
    steps: storedList(r.steps),
    coachingPoints: storedList(r.coaching_points),
    diagramUrl: (r.diagram_url as string | null) ?? null,
    createdBy: (r.created_by as string | null) ?? null,
  };
}

function linkView(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    ref: String(r.drill_ref),
    url: String(r.url),
    platform: String(r.platform),
    title: (r.title as string | null) ?? null,
    author: (r.author as string | null) ?? null,
    thumbnailUrl: (r.thumbnail_url as string | null) ?? null,
  };
}

async function loadDrill(env: Env, tenantId: string, id: string): Promise<Record<string, unknown> | null> {
  return env.DB.prepare(`SELECT * FROM training_drills WHERE id = ? AND tenant_id = ?`).bind(id, tenantId).first<Record<string, unknown>>();
}

function drillColumns(d: DrillInput): unknown[] {
  return [
    d.name, d.category, d.durationMinutes, JSON.stringify(d.equipment), d.description, d.players, d.difficulty,
    JSON.stringify(d.focus), JSON.stringify(d.steps), JSON.stringify(d.coachingPoints), d.setup,
  ];
}

export async function handleListClubDrills(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await who(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  const category = new URL(req.url).searchParams.get("category");
  const filter = category && category !== "All" ? " AND category = ?" : "";
  const [drills, favourites, links] = await env.DB.batch([
    env.DB.prepare(`SELECT * FROM training_drills WHERE tenant_id = ?${filter} ORDER BY title COLLATE NOCASE`).bind(...(filter ? [claims.tenantId, category] : [claims.tenantId])),
    env.DB.prepare(`SELECT drill_ref FROM drill_favourites WHERE tenant_id = ? AND user_id = ? ORDER BY created_at DESC`).bind(claims.tenantId, userOf(claims)),
    env.DB.prepare(`SELECT * FROM drill_links WHERE tenant_id = ? ORDER BY created_at`).bind(claims.tenantId),
  ]);
  const byRef: Record<string, ReturnType<typeof linkView>[]> = {};
  for (const r of (links.results ?? []) as Record<string, unknown>[]) (byRef[String(r.drill_ref)] ??= []).push(linkView(r));
  return json({
    success: true,
    data: ((drills.results ?? []) as Record<string, unknown>[]).map(drillView),
    favourites: ((favourites.results ?? []) as Array<{ drill_ref: string }>).map((r) => r.drill_ref),
    links: byRef,
  }, 200, corsHdrs);
}

export async function handleCreateClubDrill(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await who(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const input = readDrillInput((await body(req)) ?? {});
  if ("error" in input) return fail(corsHdrs, 400, "VALIDATION", input.error);
  const count = await env.DB.prepare(`SELECT COUNT(*) AS n FROM training_drills WHERE tenant_id = ?`).bind(claims.tenantId).first<{ n: number }>();
  if (Number(count?.n ?? 0) >= MAX_CLUB_DRILLS) return fail(corsHdrs, 409, "LIMIT", `Your club has ${MAX_CLUB_DRILLS} drills. Remove some you no longer use first.`);
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO training_drills (id, tenant_id, title, category, duration_minutes, equipment, description, players, difficulty, focus, steps, coaching_points, setup, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, claims.tenantId, ...drillColumns(input.value), userOf(claims) || "staff", now, now).run();
  console.log(JSON.stringify({ event: "club_drill", outcome: "created", tenant: claims.tenantId, id }));
  return json({ success: true, id, data: drillView((await loadDrill(env, claims.tenantId, id)) ?? {}) }, 201, corsHdrs);
}

export async function handleUpdateClubDrill(req: Request, env: Env, corsHdrs: Headers, id: string): Promise<Response> {
  const claims = await who(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  if (!(await loadDrill(env, claims.tenantId, id))) return fail(corsHdrs, 404, "NOT_FOUND", "That drill has been removed.");
  const input = readDrillInput((await body(req)) ?? {});
  if ("error" in input) return fail(corsHdrs, 400, "VALIDATION", input.error);
  await env.DB.prepare(
    `UPDATE training_drills SET title = ?, category = ?, duration_minutes = ?, equipment = ?, description = ?, players = ?, difficulty = ?,
       focus = ?, steps = ?, coaching_points = ?, setup = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`,
  ).bind(...drillColumns(input.value), Date.now(), id, claims.tenantId).run();
  return json({ success: true, data: drillView((await loadDrill(env, claims.tenantId, id)) ?? {}) }, 200, corsHdrs);
}

async function removeLinkPictures(env: Env, rows: Array<{ thumbnail_url: string | null }>, tenantId: string): Promise<void> {
  for (const r of rows) {
    const key = r.thumbnail_url ? keyFromMediaUrl(env, r.thumbnail_url) : null;
    if (key?.startsWith(`drills/${tenantId}/`)) await deleteMedia(env, key).catch(() => undefined);
  }
}

export async function handleDeleteClubDrill(req: Request, env: Env, corsHdrs: Headers, id: string): Promise<Response> {
  const claims = await who(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const ref = `club:${id}`;
  const { results: links } = await env.DB.prepare(`SELECT thumbnail_url FROM drill_links WHERE tenant_id = ? AND drill_ref = ?`).bind(claims.tenantId, ref).all<{ thumbnail_url: string | null }>();
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM training_drills WHERE id = ? AND tenant_id = ?`).bind(id, claims.tenantId),
    env.DB.prepare(`DELETE FROM drill_links WHERE tenant_id = ? AND drill_ref = ?`).bind(claims.tenantId, ref),
    env.DB.prepare(`DELETE FROM drill_favourites WHERE tenant_id = ? AND drill_ref = ?`).bind(claims.tenantId, ref),
  ]);
  await removeLinkPictures(env, links ?? [], claims.tenantId);
  return json({ success: true }, 200, corsHdrs);
}

/** Built-in refs are fine as they are; club refs must be one of this club's drills. */
async function drillExists(env: Env, tenantId: string, ref: string): Promise<boolean> {
  if (ref.startsWith("lib:")) return true;
  return !!(await loadDrill(env, tenantId, ref.slice(5)));
}

export async function handleSetDrillFavourite(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await who(req, env, corsHdrs, false);
  if (claims instanceof Response) return claims;
  const input = await body(req);
  const ref = input?.ref;
  if (!isDrillRef(ref) || typeof input?.favourite !== "boolean") return fail(corsHdrs, 400, "VALIDATION", "Choose a drill.");
  const user = userOf(claims);
  if (input.favourite) {
    if (!(await drillExists(env, claims.tenantId, ref))) return fail(corsHdrs, 404, "NOT_FOUND", "That drill has been removed.");
    await env.DB.prepare(`INSERT OR IGNORE INTO drill_favourites (tenant_id, user_id, drill_ref, created_at) VALUES (?, ?, ?, ?)`)
      .bind(claims.tenantId, user, ref, Date.now()).run();
  } else {
    await env.DB.prepare(`DELETE FROM drill_favourites WHERE tenant_id = ? AND user_id = ? AND drill_ref = ?`).bind(claims.tenantId, user, ref).run();
  }
  const { results } = await env.DB.prepare(`SELECT drill_ref FROM drill_favourites WHERE tenant_id = ? AND user_id = ? ORDER BY created_at DESC`)
    .bind(claims.tenantId, user).all<{ drill_ref: string }>();
  return json({ success: true, data: { favourites: (results ?? []).map((r) => r.drill_ref) } }, 200, corsHdrs);
}

export async function handleAddDrillLink(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  const claims = await who(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const input = await body(req);
  const ref = input?.ref;
  if (!isDrillRef(ref)) return fail(corsHdrs, 400, "VALIDATION", "Choose a drill.");
  const link = readVideoLink(input?.url);
  if (!link) return fail(corsHdrs, 400, "VALIDATION", "Paste a TikTok, Instagram or YouTube video link (Share → Copy link).");
  if (!(await drillExists(env, claims.tenantId, ref))) return fail(corsHdrs, 404, "NOT_FOUND", "That drill has been removed.");
  const existing = await env.DB.prepare(`SELECT COUNT(*) AS n, SUM(url = ?) AS same FROM drill_links WHERE tenant_id = ? AND drill_ref = ?`)
    .bind(link.url, claims.tenantId, ref).first<{ n: number; same: number | null }>();
  if (Number(existing?.same ?? 0) > 0) return fail(corsHdrs, 409, "DUPLICATE", "That video is already on this drill.");
  if (Number(existing?.n ?? 0) >= MAX_LINKS_PER_DRILL) return fail(corsHdrs, 409, "LIMIT", `A drill can have up to ${MAX_LINKS_PER_DRILL} videos.`);

  const id = crypto.randomUUID();
  const preview = await linkPreview(env, req.url, link, `drills/${claims.tenantId}/links/${id}`);
  await env.DB.prepare(
    `INSERT OR IGNORE INTO drill_links (id, tenant_id, drill_ref, url, platform, title, author, thumbnail_url, added_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, claims.tenantId, ref, link.url, link.platform, preview.title, preview.author, preview.thumbnailUrl, userOf(claims) || null, Date.now()).run();
  const saved = await env.DB.prepare(`SELECT * FROM drill_links WHERE tenant_id = ? AND drill_ref = ? AND url = ?`).bind(claims.tenantId, ref, link.url).first<Record<string, unknown>>();
  console.log(JSON.stringify({ event: "drill_link", outcome: "added", tenant: claims.tenantId, platform: link.platform, preview: !!preview.title }));
  return json({ success: true, data: linkView(saved ?? {}) }, 201, corsHdrs);
}

export async function handleDeleteDrillLink(req: Request, env: Env, corsHdrs: Headers, id: string): Promise<Response> {
  const claims = await who(req, env, corsHdrs, true);
  if (claims instanceof Response) return claims;
  const row = await env.DB.prepare(`SELECT thumbnail_url FROM drill_links WHERE id = ? AND tenant_id = ?`).bind(id, claims.tenantId).first<{ thumbnail_url: string | null }>();
  if (!row) return json({ success: true }, 200, corsHdrs);
  await env.DB.prepare(`DELETE FROM drill_links WHERE id = ? AND tenant_id = ?`).bind(id, claims.tenantId).run();
  await removeLinkPictures(env, [row], claims.tenantId);
  return json({ success: true }, 200, corsHdrs);
}
