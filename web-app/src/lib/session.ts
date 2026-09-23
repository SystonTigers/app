/**
 * Browser session helpers.
 *
 * Pages in this app read the signed-in user's token from several historical
 * localStorage keys ('user_token', 'token', 'session_token'). Saving through
 * here keeps them all in step so every page sees the same session.
 */

/** The backend Worker. Baked in at build time (see next.config.js). */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'https://app-production.team-platform-2025.workers.dev';

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  tenant_id?: string;
  tenant_slug?: string | null;
  roles?: string[];
}

const TOKEN_KEYS = ['user_token', 'token', 'session_token'] as const;
const STAFF_ROLES = ['owner', 'tenant_admin', 'admin', 'manager', 'platform_admin'];

/** The web app's role label for a set of backend roles. */
export function roleLabel(roles: string[] = []): 'manager' | 'coach' | 'parent' {
  if (roles.some((r) => STAFF_ROLES.includes(r))) return 'manager';
  if (roles.includes('coach')) return 'coach';
  return 'parent';
}

export function saveSession(token: string, user: SessionUser): void {
  try {
    TOKEN_KEYS.forEach((k) => localStorage.setItem(k, token));
    localStorage.setItem('user_data', JSON.stringify(user));
    localStorage.setItem('user_role', roleLabel(user.roles));
    if (user.tenant_id) localStorage.setItem('tenant_id', user.tenant_id);
  } catch {
    // Storage blocked (private mode): the current page still works with the in-memory token.
  }
}

export function getSessionToken(): string | null {
  try {
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
  } catch {
    // Storage blocked
  }
  return null;
}

export function clearSession(): void {
  try {
    [...TOKEN_KEYS, 'user_data', 'user_role', 'tenant_id', 'player_id', 'admin_token'].forEach((k) =>
      localStorage.removeItem(k),
    );
  } catch {
    // Storage blocked
  }
}

/** Where a signed-in user should land. */
export function homeFor(user: SessionUser): string {
  if (!user.tenant_slug) return '/join';
  return roleLabel(user.roles) === 'manager' ? `/${user.tenant_slug}/admin` : `/${user.tenant_slug}`;
}

/** Read `{ error: { message } }` from a backend response, falling back to a friendly default. */
export async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message || (typeof data?.error === 'string' ? data.error : '') || fallback;
  } catch {
    return fallback;
  }
}
