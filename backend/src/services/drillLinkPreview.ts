/**
 * Title, account and picture for a TikTok or YouTube link, from their public
 * oEmbed endpoints. TikTok's picture links expire, so the picture is copied to
 * R2 (drills/<tenant>/links/). Instagram needs a Meta app token for oEmbed, so
 * its links show without a picture. Any failure just means no preview.
 */
import { oembedUrl, type VideoPlatform } from "./drills";
import { mediaUrl, putMedia, type MediaEnv } from "./media";

export interface LinkPreview {
  title: string | null;
  author: string | null;
  thumbnailUrl: string | null;
}

const TIMEOUT_MS = 5000;
const MAX_PICTURE_BYTES = 1024 * 1024;
const PICTURE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const NONE: LinkPreview = { title: null, author: null, thumbnailUrl: null };

async function get(url: string, fetcher: typeof fetch): Promise<Response | null> {
  try {
    const res = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "BoostHuddle/1.0 (+link preview)" } });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

function clean(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.replace(/\s+/g, " ").trim().slice(0, max) : null;
}

/** Copies the picture into our storage so it keeps working; null if it can't. */
async function keepPicture(env: MediaEnv, requestUrl: string, key: string, src: string, fetcher: typeof fetch): Promise<string | null> {
  if (!env.R2_MEDIA || !/^https:\/\//.test(src)) return null;
  const res = await get(src, fetcher);
  const type = (res?.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = PICTURE_TYPES[type];
  if (!res || !ext) return null;
  const bytes = await res.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_PICTURE_BYTES) return null;
  await putMedia(env, `${key}.${ext}`, bytes, type);
  return mediaUrl(env, requestUrl, `${key}.${ext}`);
}

/**
 * The preview for a link. `pictureKey` is where to keep the picture (no
 * extension). Set LINK_PREVIEWS=off to skip the lookups (tests).
 */
export async function linkPreview(
  env: MediaEnv & { LINK_PREVIEWS?: string },
  requestUrl: string,
  link: { url: string; platform: VideoPlatform },
  pictureKey: string,
  fetcher: typeof fetch = fetch,
): Promise<LinkPreview> {
  const endpoint = oembedUrl(link);
  if (!endpoint || env.LINK_PREVIEWS === "off") return NONE;
  const res = await get(endpoint, fetcher);
  if (!res) return NONE;
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) return NONE;
  const picture = clean(data.thumbnail_url, 1000);
  return {
    title: clean(data.title, 200),
    author: clean(data.author_name, 80),
    thumbnailUrl: picture ? await keepPicture(env, requestUrl, pictureKey, picture, fetcher).catch(() => null) : null,
  };
}
