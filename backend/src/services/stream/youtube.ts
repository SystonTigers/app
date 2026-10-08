/**
 * The club's YouTube channel: connecting it (Google sign-in, read-only access)
 * and finding the stream that's live on it right now.
 *
 * Needs YT_CLIENT_ID / YT_CLIENT_SECRET (a Google Cloud OAuth client with the
 * YouTube Data API enabled) and SOCIAL_TOKEN_KEY to encrypt the stored token.
 */

export interface YouTubeEnv {
  YT_CLIENT_ID?: string;
  YT_CLIENT_SECRET?: string;
  SOCIAL_TOKEN_KEY?: string;
}

export interface Broadcast {
  videoId: string;
  title: string;
  startedAt: number | null;
  privacy: "public" | "unlisted" | "private";
  embeddable: boolean;
}

/** Google said the connection is no good any more (revoked, password changed...). */
export class YouTubeAuthError extends Error {}

const SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const API = "https://www.googleapis.com/youtube/v3";

export function youtubeConfigured(env: YouTubeEnv): boolean {
  return !!(env.YT_CLIENT_ID && env.YT_CLIENT_SECRET && env.SOCIAL_TOKEN_KEY);
}

export function consentUrl(env: YouTubeEnv, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.YT_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    // Always ask, so Google returns a refresh token even if they connected before
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function tokenRequest(env: YouTubeEnv, params: Record<string, string>): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.YT_CLIENT_ID ?? "", client_secret: env.YT_CLIENT_SECRET ?? "", ...params }),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !body.access_token) {
    if (body.error === "invalid_grant") throw new YouTubeAuthError("Google no longer accepts this connection");
    throw new Error(`Google token request failed (${res.status}${body.error ? `: ${body.error}` : ""})`);
  }
  return { access_token: body.access_token, refresh_token: body.refresh_token, expires_in: body.expires_in };
}

/** After the admin approves: the long-lived refresh token and a first access token. */
export async function exchangeCode(env: YouTubeEnv, code: string, redirectUri: string): Promise<{ refreshToken: string; accessToken: string }> {
  const t = await tokenRequest(env, { code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  if (!t.refresh_token) throw new Error("Google didn't return a refresh token");
  return { refreshToken: t.refresh_token, accessToken: t.access_token };
}

export async function refreshAccessToken(env: YouTubeEnv, refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const t = await tokenRequest(env, { refresh_token: refreshToken, grant_type: "refresh_token" });
  return { accessToken: t.access_token, expiresIn: t.expires_in ?? 3600 };
}

async function apiGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" } });
  if (res.status === 401) throw new YouTubeAuthError("YouTube rejected the access token");
  if (!res.ok) throw new Error(`YouTube API ${path.split("?")[0]} failed (${res.status})`);
  return (await res.json()) as T;
}

/** The signed-in account's channel (null if it has none). */
export async function myChannel(accessToken: string): Promise<{ id: string; title: string } | null> {
  const body = await apiGet<{ items?: { id: string; snippet?: { title?: string } }[] }>(accessToken, "/channels?part=snippet&mine=true");
  const ch = body.items?.[0];
  return ch ? { id: ch.id, title: ch.snippet?.title ?? "YouTube channel" } : null;
}

/**
 * When a live stream (or a video that was one) started, from YouTube, or
 * null if it never was live or isn't visible to the club's account.
 */
export async function videoStartedAt(accessToken: string, videoId: string): Promise<number | null> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  const body = await apiGet<{ items?: { liveStreamingDetails?: { actualStartTime?: string } }[] }>(accessToken, `/videos?part=liveStreamingDetails&id=${videoId}`);
  const t = Date.parse(body.items?.[0]?.liveStreamingDetails?.actualStartTime ?? "");
  return Number.isFinite(t) ? t : null;
}

interface BroadcastItem {
  id: string;
  snippet?: { title?: string; actualStartTime?: string };
  status?: { privacyStatus?: string; lifeCycleStatus?: string };
  contentDetails?: { enableEmbed?: boolean };
}

/** Streams live on the channel right now, oldest first (costs 1 unit of the daily YouTube quota). */
export async function activeBroadcasts(accessToken: string): Promise<Broadcast[]> {
  const body = await apiGet<{ items?: BroadcastItem[] }>(accessToken, "/liveBroadcasts?part=snippet,status,contentDetails&broadcastStatus=active&broadcastType=all&maxResults=10");
  return (body.items || [])
    .filter((b) => /^[A-Za-z0-9_-]{11}$/.test(b.id))
    .map((b) => {
      const started = b.snippet?.actualStartTime ? Date.parse(b.snippet.actualStartTime) : NaN;
      const privacy = b.status?.privacyStatus === "public" || b.status?.privacyStatus === "private" ? b.status.privacyStatus : "unlisted";
      return { videoId: b.id, title: b.snippet?.title ?? "", startedAt: Number.isFinite(started) ? started : null, privacy, embeddable: b.contentDetails?.enableEmbed !== false } as Broadcast;
    })
    .sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));
}

/**
 * The video id from anything a manager might paste: a youtube.com/watch,
 * youtu.be, /live/, /embed/ or /shorts/ link, or the bare 11-character id.
 */
export function parseYouTubeVideoId(input: string): string | null {
  const text = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [first, second] = url.pathname.split("/").filter(Boolean);
    if (first === "watch") id = url.searchParams.get("v");
    else if (["live", "embed", "shorts", "v"].includes(first ?? "")) id = second ?? null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
