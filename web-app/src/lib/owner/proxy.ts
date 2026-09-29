/**
 * Server-side helpers for the owner panel's same-origin API (/api/owner/*).
 * The session token lives in an HttpOnly cookie that only these routes see;
 * the browser never reads it. Only the owner panel's own backend calls are
 * forwarded (an allow-list), so this can't be used as an open proxy.
 */

export const OWNER_COOKIE = 'bh_owner';
export const OWNER_COOKIE_PATH = '/api/owner';

/** The backend Worker (wrangler var at runtime, else the build-time public base). */
export function backendBase(): string {
  return (
    process.env.BACKEND_API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE ||
    'https://app-production.team-platform-2025.workers.dev'
  ).replace(/\/+$/, '');
}

const ID = /^[A-Za-z0-9_-]{1,80}$/;
const GET_PAGES = new Set(['overview', 'money', 'history', 'members', 'clubs']);

/**
 * Map /api/owner/<segments> to the backend path it may reach, or null when
 * it isn't one of the owner panel's calls.
 */
export function ownerBackendPath(method: string, segments: string[]): string | null {
  const [first, id, action, ...rest] = segments;
  if (rest.length) return null;
  if (method === 'GET') {
    if (segments.length === 1 && GET_PAGES.has(first)) return `/api/v1/owner/${first}`;
    if (segments.length === 2 && first === 'clubs' && ID.test(id)) return `/api/v1/owner/clubs/${id}`;
    return null;
  }
  if (method === 'POST') {
    if (segments.length === 3 && first === 'clubs' && ID.test(id) && action === 'actions') return `/api/v1/owner/clubs/${id}/actions`;
    return null;
  }
  return null;
}

/** Query parameters the owner pages use; anything else is dropped. */
export function ownerQuery(search: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const key of ['q', 'status']) {
    const value = search.get(key);
    if (value) out.set(key, value.slice(0, 100));
  }
  const qs = out.toString();
  return qs ? `?${qs}` : '';
}

/**
 * State-changing requests must come from our own pages: the cookie is
 * SameSite=Strict already, and this also checks Origin when the browser sends it.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return req.headers.get('sec-fetch-site') !== 'cross-site';
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict' as const,
    path: OWNER_COOKIE_PATH,
    maxAge: Math.max(0, Math.floor(maxAgeSeconds)),
  };
}
