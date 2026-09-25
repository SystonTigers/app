/**
 * Facebook Pages and Instagram (business accounts) through Meta's Graph API.
 *
 * Settings: META_APP_ID and META_LOGIN_CONFIG_ID (vars), META_APP_SECRET
 * (secret), optional META_GRAPH_VERSION. Page tokens from a long-lived user
 * token don't expire unless the person removes the app or changes password.
 */

export interface MetaEnv {
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  META_LOGIN_CONFIG_ID?: string;
  META_GRAPH_VERSION?: string;
}

/** Permissions requested when there's no Facebook Login for Business configuration. */
const SCOPES = ["pages_show_list", "pages_manage_posts", "pages_read_engagement", "instagram_basic", "instagram_content_publish", "business_management"];

export class MetaError extends Error {
  constructor(message: string, readonly code?: number, readonly status?: number) {
    super(message);
  }
  /** The connection needs reconnecting (token expired or permission removed). */
  get needsReconnect(): boolean {
    return this.code === 190 || this.code === 10 || this.code === 200;
  }
}

function version(env: MetaEnv): string {
  return env.META_GRAPH_VERSION || "v23.0";
}

export function metaConfigured(env: MetaEnv): boolean {
  return !!(env.META_APP_ID && env.META_APP_SECRET);
}

export function loginUrl(env: MetaEnv, redirectUri: string, state: string): string {
  const params = new URLSearchParams({ client_id: env.META_APP_ID ?? "", redirect_uri: redirectUri, state, response_type: "code" });
  if (env.META_LOGIN_CONFIG_ID) params.set("config_id", env.META_LOGIN_CONFIG_ID);
  else params.set("scope", SCOPES.join(","));
  return `https://www.facebook.com/${version(env)}/dialog/oauth?${params}`;
}

async function graph<T>(env: MetaEnv, path: string, init: RequestInit = {}, fetchImpl: typeof fetch = fetch): Promise<T> {
  const url = path.startsWith("http") ? path : `https://graph.facebook.com/${version(env)}${path}`;
  const res = await fetchImpl(url, init);
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: number } } & T;
  if (!res.ok || body.error) {
    throw new MetaError(body.error?.message || `Facebook returned ${res.status}`, body.error?.code, res.status);
  }
  return body;
}

function form(fields: Record<string, string>): RequestInit {
  return { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields).toString() };
}

/** Code from the login redirect -> long-lived user token. */
export async function exchangeCode(env: MetaEnv, code: string, redirectUri: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const short = await graph<{ access_token: string }>(env, `/oauth/access_token?${new URLSearchParams({
    client_id: env.META_APP_ID ?? "", client_secret: env.META_APP_SECRET ?? "", redirect_uri: redirectUri, code,
  })}`, {}, fetchImpl);
  const long = await graph<{ access_token: string }>(env, `/oauth/access_token?${new URLSearchParams({
    grant_type: "fb_exchange_token", client_id: env.META_APP_ID ?? "", client_secret: env.META_APP_SECRET ?? "", fb_exchange_token: short.access_token,
  })}`, {}, fetchImpl);
  return long.access_token;
}

export interface MetaPage {
  id: string;
  name: string;
  accessToken: string;
  instagram: { id: string; username: string | null } | null;
}

export async function listPages(env: MetaEnv, userToken: string, fetchImpl: typeof fetch = fetch): Promise<MetaPage[]> {
  const res = await graph<{ data: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }> }>(
    env,
    `/me/accounts?${new URLSearchParams({ fields: "id,name,access_token,instagram_business_account{id,username}", limit: "100", access_token: userToken })}`,
    {},
    fetchImpl,
  );
  return (res.data || []).map((p) => ({
    id: p.id,
    name: p.name,
    accessToken: p.access_token,
    instagram: p.instagram_business_account ? { id: p.instagram_business_account.id, username: p.instagram_business_account.username ?? null } : null,
  }));
}

/** Photo post when there's an image, otherwise a text post. Returns the post id. */
export async function publishFacebook(env: MetaEnv, pageId: string, token: string, caption: string, imageUrl: string | null, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (imageUrl) {
    const res = await graph<{ id: string; post_id?: string }>(env, `/${pageId}/photos`, form({ url: imageUrl, caption, access_token: token }), fetchImpl);
    return res.post_id ?? res.id;
  }
  const res = await graph<{ id: string }>(env, `/${pageId}/feed`, form({ message: caption, access_token: token }), fetchImpl);
  return res.id;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Instagram needs an image: create the post, then publish it once Instagram has fetched the image. */
export async function publishInstagram(env: MetaEnv, igUserId: string, token: string, caption: string, imageUrl: string, fetchImpl: typeof fetch = fetch, delayMs = 2000): Promise<string> {
  const container = await graph<{ id: string }>(env, `/${igUserId}/media`, form({ image_url: imageUrl, caption, access_token: token }), fetchImpl);
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await graph<{ id: string }>(env, `/${igUserId}/media_publish`, form({ creation_id: container.id, access_token: token }), fetchImpl);
      return res.id;
    } catch (err) {
      // 9007: the image is still being processed
      if (err instanceof MetaError && err.code === 9007 && attempt < 4) {
        await wait(delayMs);
        continue;
      }
      throw err;
    }
  }
}

export async function deleteFacebookPost(env: MetaEnv, postId: string, token: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  await graph(env, `/${postId}?${new URLSearchParams({ access_token: token })}`, { method: "DELETE" }, fetchImpl);
}
