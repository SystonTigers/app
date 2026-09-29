'use client';

/**
 * Browser side of the owner panel: calls our own /api/owner routes (the
 * session cookie goes with them automatically) and sends the owner to the
 * sign-in page when the session has ended.
 */
import type { OwnerAction, OwnerAuditEntry, OwnerClub, OwnerClubDetail, OwnerMember, OwnerMoney, OwnerOverview } from './types';

export class OwnerApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/owner/${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
      cache: 'no-store',
    });
  } catch {
    throw new OwnerApiError(0, "Couldn't reach the server. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => null)) as { success?: boolean; data?: T; error?: { message?: string } } | null;
  if (res.status === 401) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/owner/login?next=${next}`;
    throw new OwnerApiError(401, 'Please sign in again.');
  }
  if (!res.ok || !body?.success) {
    throw new OwnerApiError(res.status, body?.error?.message || 'Something went wrong. Please try again.');
  }
  return body.data as T;
}

export const ownerApi = {
  overview: () => call<OwnerOverview>('overview'),
  money: () => call<OwnerMoney>('money'),
  history: () => call<OwnerAuditEntry[]>('history'),
  members: (q: string) => call<OwnerMember[]>(`members?q=${encodeURIComponent(q)}`),
  clubs: (q = '', status = '') => call<OwnerClub[]>(`clubs?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`),
  club: (id: string) => call<OwnerClubDetail>(`clubs/${encodeURIComponent(id)}`),
  act: (id: string, action: OwnerAction) =>
    call<{ detail: string; club: OwnerClubDetail }>(`clubs/${encodeURIComponent(id)}/actions`, { method: 'POST', body: JSON.stringify(action) }),
  logout: () => fetch('/api/owner/logout', { method: 'POST' }).catch(() => undefined),
};
