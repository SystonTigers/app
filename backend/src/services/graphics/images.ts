/**
 * Fetches the pictures a graphic needs (badges, photos, sponsor logo) and
 * turns them into data URIs the renderer can embed. Our own media is read
 * straight from R2; other addresses are fetched with a time and size limit.
 * Anything that fails is left out (badges fall back to initials).
 */
import { keyFromMediaUrl } from "../media";
import type { ImageMap } from "./types";

const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 5000;

export interface ImageEnv {
  R2_MEDIA?: R2Bucket;
  R2_PUBLIC_URL?: string;
}

/** The image type from its first bytes, or null for anything the renderer can't draw (WebP, SVG...). */
export function imageMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  // WebP and SVG aren't supported by the renderer; those fall back to initials
  return null;
}

export function toDataUri(bytes: Uint8Array, mime: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return `data:${mime};base64,${btoa(binary)}`;
}

async function readBytes(env: ImageEnv, url: string, fetchImpl: typeof fetch): Promise<Uint8Array | null> {
  const key = keyFromMediaUrl(env, url);
  if (key && env.R2_MEDIA) {
    const obj = await env.R2_MEDIA.get(key);
    if (!obj || obj.size > MAX_BYTES) return null;
    return new Uint8Array(await obj.arrayBuffer());
  }
  if (!/^https:\/\//i.test(url)) return null;
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "follow" });
  if (!res.ok) return null;
  const length = Number(res.headers.get("content-length") || 0);
  if (length > MAX_BYTES) return null;
  const buf = new Uint8Array(await res.arrayBuffer());
  return buf.length > MAX_BYTES ? null : buf;
}

/** Load every URL (in parallel). Unreachable or unsupported images map to null. */
export async function loadImages(env: ImageEnv, urls: string[], fetchImpl: typeof fetch = fetch): Promise<ImageMap> {
  const entries = await Promise.all(urls.map(async (url): Promise<[string, string | null]> => {
    if (url.startsWith("data:image/")) return [url, url];
    try {
      const bytes = await readBytes(env, url, fetchImpl);
      const mime = bytes ? imageMime(bytes) : null;
      return [url, bytes && mime ? toDataUri(bytes, mime) : null];
    } catch {
      return [url, null];
    }
  }));
  return new Map(entries);
}
