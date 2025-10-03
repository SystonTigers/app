// backend/src/services/galleryKV.ts
import type { Env } from "../types";
import { kvGetJSON, kvPutJSON, kvListJSON, assert, id, badReq } from "./util";

export interface Album {
  albumId: string;
  tenantId: string;
  teamId?: string;
  eventId?: string;
  title: string;
  createdBy: string;
  createdAt: number;
}

export interface MediaObj {
  id: string;
  r2Key: string;
  uploaderId: string;
  playerTags: string[];
  consentCheck: boolean;
  ts: number;
}

const ALBUM_KEY = (tenant: string, albumId: string) => `gallery/album/${tenant}/${albumId}`;
const ALBUM_PREFIX = (tenant: string) => `gallery/album/${tenant}/`;
const OBJ_KEY = (tenant: string, albumId: string, id: string) => `gallery/object/${tenant}/${albumId}/${id}`;
const OBJ_PREFIX = (tenant: string, albumId: string) => `gallery/object/${tenant}/${albumId}/`;

export async function createAlbum(
  env: Env,
  args: {
    tenant: string;
    title: string;
    teamId?: string;
    eventId?: string;
    createdBy: string;
  }
) {
  assert(args.tenant && args.title, "tenant + title required");
  const album: Album = {
    albumId: id(),
    tenantId: args.tenant,
    title: args.title,
    teamId: args.teamId,
    eventId: args.eventId,
    createdBy: args.createdBy,
    createdAt: Date.now(),
  };
  await kvPutJSON(env.KV_IDEMP, ALBUM_KEY(args.tenant, album.albumId), album);
  return album;
}

export async function listAlbums(env: Env, tenant: string, teamId?: string) {
  const all = await kvListJSON<Album>(env.KV_IDEMP, ALBUM_PREFIX(tenant));
  return teamId ? all.filter((a) => a.teamId === teamId) : all;
}

// STEP 1: client asks for a signed PUT URL -> uploads directly to R2
export async function getUploadUrl(
  env: Env,
  args: {
    tenant: string;
    albumId: string;
    contentType: string;
    uploaderId: string;
  }
) {
  const allowed = (env.GALLERY_ALLOWED || "image/jpeg,image/png,image/webp").split(",");
  if (!allowed.includes(args.contentType)) throw badReq("unsupported content-type");

  const key = `media/${args.tenant}/${args.albumId}/${Date.now()}-${id()}`;
  // Workers R2 doesn't do signed URL natively; emulate with private PUT via backend
  // Simple MVP: the client POSTS the binary to /api/v1/gallery/upload with a short one-time token
  // Or (easier): do unsigned PUT via backend fetch. For now return a placeholder plan:
  return { r2Key: key, uploadVia: "POST /api/v1/gallery/albums/:albumId/upload (multipart/form-data)" };
}

// STEP 2 (MVP): backend receives a small image file and writes to R2 (no presign)
// NOTE: For production, add size checks and virus scanning if needed.
export async function uploadBinary(
  env: Env,
  args: {
    tenant: string;
    albumId: string;
    file: ArrayBuffer;
    contentType: string;
  }
) {
  const key = `media/${args.tenant}/${args.albumId}/${Date.now()}-${id()}`;
  await env.R2_MEDIA.put(key, args.file, { httpMetadata: { contentType: args.contentType } });
  return { r2Key: key };
}

// STEP 3: Commit metadata entry
export async function commitMedia(
  env: Env,
  args: {
    tenant: string;
    albumId: string;
    r2Key: string;
    uploaderId: string;
    playerTags?: string[];
    consentCheck?: boolean;
  }
) {
  const m: MediaObj = {
    id: id(),
    r2Key: args.r2Key,
    uploaderId: args.uploaderId,
    playerTags: args.playerTags ?? [],
    consentCheck: !!args.consentCheck,
    ts: Date.now(),
  };
  await kvPutJSON(env.KV_IDEMP, OBJ_KEY(args.tenant, args.albumId, m.id), m);
  return m;
}

export async function listMedia(
  env: Env,
  args: { tenant: string; albumId: string; respectConsent?: boolean }
) {
  const objs = await kvListJSON<MediaObj>(env.KV_IDEMP, OBJ_PREFIX(args.tenant, args.albumId));
  // TODO: if respectConsent, filter out objects tagged with players where mediaConsent=false (look up players service)
  return objs.sort((a, b) => a.ts - b.ts);
}

// Generate a temporary GET URL (signed by R2) — Workers R2 supports presigned URLs for GET
export async function getViewUrl(env: Env, r2Key: string, expiresSec = 300) {
  // Not yet supported in R2 GA to presign in-worker; simplest is stream through Worker:
  // GET /api/v1/gallery/file?key=... and backend does env.R2_MEDIA.get(key) and streams to client.
  return { url: `/api/v1/gallery/file?key=${encodeURIComponent(r2Key)}` };
}
