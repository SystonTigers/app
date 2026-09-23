/**
 * Media storage (photos, headshots, badges) in the R2_MEDIA bucket.
 *
 * URLs: if R2_PUBLIC_URL is set (a public bucket / custom domain) we link to it
 * directly; otherwise files are served back through this worker at
 * GET /api/v1/media/<key>, which works with a private bucket and no extra setup.
 */

/** Key prefixes the public media route will serve. Anything else is 404. */
export const PUBLIC_MEDIA_PREFIXES = ["gallery/", "headshots/", "players/", "badges/", "sponsors/", "products/"] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
};

export class MediaError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

interface MediaEnv {
  R2_MEDIA?: R2Bucket;
  R2_PUBLIC_URL?: string;
}

function bucket(env: MediaEnv): R2Bucket {
  if (!env.R2_MEDIA) {
    throw new MediaError("Media storage is not configured (R2_MEDIA binding missing)", 503);
  }
  return env.R2_MEDIA;
}

/**
 * Validate an uploaded image and return its canonical file extension.
 * Throws MediaError(400/413) for missing, non-image or oversized files.
 */
export function validateImage(file: unknown): { file: File; ext: string } {
  if (!file || typeof file === "string" || typeof (file as File).arrayBuffer !== "function") {
    throw new MediaError("No image file provided", 400);
  }
  const f = file as File;
  const ext = IMAGE_TYPES[(f.type || "").toLowerCase()];
  if (!ext) {
    throw new MediaError("Unsupported image type (use JPEG, PNG, WebP, HEIC or GIF)", 400);
  }
  if (f.size > MAX_IMAGE_BYTES) {
    throw new MediaError("Image is too large (max 10 MB)", 413);
  }
  if (f.size === 0) {
    throw new MediaError("Image file is empty", 400);
  }
  return { file: f, ext };
}

/** Store an object in R2_MEDIA. */
export async function putMedia(env: MediaEnv, key: string, body: ArrayBuffer | ReadableStream, contentType: string): Promise<void> {
  await bucket(env).put(key, body, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
  });
}

/** Delete an object; missing objects are ignored. */
export async function deleteMedia(env: MediaEnv, key: string): Promise<void> {
  await bucket(env).delete(key);
}

/** Public URL for a stored key. `requestUrl` supplies the worker origin when no public bucket URL is set. */
export function mediaUrl(env: MediaEnv, requestUrl: string, key: string): string {
  const base = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  if (base) {
    return `${base}/${key}`;
  }
  const origin = new URL(requestUrl).origin;
  return `${origin}/api/v1/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Recover the storage key from a URL produced by mediaUrl(), or null if it isn't ours. */
export function keyFromMediaUrl(env: MediaEnv, url: string): string | null {
  const base = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  if (base && url.startsWith(`${base}/`)) {
    return url.slice(base.length + 1);
  }
  const marker = "/api/v1/media/";
  const idx = url.indexOf(marker);
  if (idx === -1) {
    return null;
  }
  return url.slice(idx + marker.length).split("/").map(decodeURIComponent).join("/");
}

/** GET /api/:v/media/<key> - stream a public media object from R2. */
export async function handleGetMedia(req: Request, env: MediaEnv): Promise<Response> {
  const path = new URL(req.url).pathname;
  const match = path.match(/^\/api\/[^/]+\/media\/(.+)$/);
  const key = match ? match[1].split("/").map(decodeURIComponent).join("/") : "";

  if (!key || key.includes("..") || !PUBLIC_MEDIA_PREFIXES.some((p) => key.startsWith(p))) {
    return new Response("Not Found", { status: 404 });
  }
  if (!env.R2_MEDIA) {
    return new Response("Media storage not configured", { status: 503 });
  }

  const object = await env.R2_MEDIA.get(key);
  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}
