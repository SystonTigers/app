/**
 * Players' cut-out photos for post graphics (staff only; see services/playerCutouts.ts).
 *
 *   GET    /api/v1/squad/cutouts             every player with their cut-out, photo and photo consent
 *   PUT    /api/v1/players/:id/cutout        the PNG as the body (image/png), or a form field `cutout`
 *   DELETE /api/v1/players/:id/cutout
 */
import { json } from "../services/util";
import { requireTenantJWT } from "../services/auth";
import { CutoutError, listCutouts, MAX_CUTOUT_BYTES, removeCutout, saveCutout } from "../services/playerCutouts";
import type { MediaEnv } from "../services/media";

type Env = MediaEnv & { DB: D1Database; [key: string]: unknown };

function fail(corsHdrs: Headers, status: number, code: string, message: string): Response {
  return json({ success: false, error: { code, message } }, status, corsHdrs);
}

async function run(req: Request, env: Env, corsHdrs: Headers, where: string, work: (tenantId: string) => Promise<unknown>): Promise<Response> {
  let tenantId: string;
  try {
    tenantId = (await requireTenantJWT(req, env)).tenantId;
  } catch {
    return fail(corsHdrs, 401, "UNAUTHORIZED", "Please log in again.");
  }
  try {
    return json({ success: true, data: await work(tenantId) }, 200, corsHdrs);
  } catch (err) {
    if (err instanceof CutoutError) return fail(corsHdrs, err.status, err.code, err.message);
    console.error(JSON.stringify({ level: "error", msg: "player_cutout_error", where, tenantId, error: err instanceof Error ? err.message : String(err) }));
    return fail(corsHdrs, 500, "INTERNAL", "Something went wrong. Please try again.");
  }
}

/** The uploaded PNG, from a raw body or a multipart field. */
async function readUpload(req: Request): Promise<Uint8Array> {
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_CUTOUT_BYTES + 64 * 1024) throw new CutoutError(413, "TOO_LARGE", "That picture is too big (4 MB at most).");
  const type = (req.headers.get("content-type") || "").toLowerCase();
  if (type.startsWith("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("cutout");
    if (!file || typeof file === "string") throw new CutoutError(400, "NO_IMAGE", "No picture was sent.");
    return new Uint8Array(await (file as File).arrayBuffer());
  }
  return new Uint8Array(await req.arrayBuffer());
}

export function handleListCutouts(req: Request, env: Env, corsHdrs: Headers): Promise<Response> {
  return run(req, env, corsHdrs, "list", (tenantId) => listCutouts(env, tenantId));
}

export function handleSaveCutout(req: Request, env: Env, corsHdrs: Headers, playerId: string): Promise<Response> {
  return run(req, env, corsHdrs, "save", async (tenantId) => {
    const bytes = await readUpload(req);
    return { playerId, cutoutUrl: await saveCutout(env, req.url, tenantId, playerId, bytes) };
  });
}

export function handleRemoveCutout(req: Request, env: Env, corsHdrs: Headers, playerId: string): Promise<Response> {
  return run(req, env, corsHdrs, "remove", async (tenantId) => {
    await removeCutout(env, tenantId, playerId);
    return { playerId, cutoutUrl: null };
  });
}
