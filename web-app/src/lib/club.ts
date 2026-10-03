import { API_BASE } from './session';

export interface ClubInfo {
  slug: string;
  name: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  badgeUrl: string | null;
}

/** "riverside-rovers" -> "Riverside Rovers" (used if the club can't be loaded). */
export function nameFromSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * The club's display name, colours and badge, or null when there is no club
 * at that address (the API answers 404). If the API can't be reached the
 * page still works, named from the URL.
 */
export async function findClub(slug: string): Promise<ClubInfo | null> {
  const fallback: ClubInfo = { slug, name: nameFromSlug(slug), primaryColor: null, secondaryColor: null, badgeUrl: null };
  try {
    const res = await fetch(`${API_BASE}/public/${encodeURIComponent(slug)}/info`, { cache: 'no-store' });
    if (res.status === 404) return null;
    if (!res.ok) return fallback;
    const body = await res.json();
    return body?.data?.name ? { ...fallback, ...body.data } : fallback;
  } catch {
    return fallback;
  }
}

/** The club's display name and colours. Never throws: falls back to the URL. */
export async function getClubInfo(slug: string): Promise<ClubInfo> {
  return (await findClub(slug)) ?? { slug, name: nameFromSlug(slug), primaryColor: null, secondaryColor: null, badgeUrl: null };
}

export interface LiveMatch {
  opponent: string;
  homeAway: 'home' | 'away' | string;
  status: 'live' | 'half_time' | 'full_time' | string;
  minute: number | null;
  ourScore: number;
  theirScore: number;
  events: Array<{ type: string; minute: number | null; player: string | null }>;
}

/** Live and just-finished matches (from Match Centre). Never throws. */
export async function getLiveMatches(slug: string): Promise<LiveMatch[]> {
  try {
    const res = await fetch(`${API_BASE}/public/${encodeURIComponent(slug)}/live`, { cache: 'no-store' });
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body?.data) ? (body.data as LiveMatch[]) : [];
  } catch {
    return [];
  }
}

export interface LatestMotm {
  match: { opponent: string; date: string; ourScore: number | null; theirScore: number | null } | null;
  winners: Array<{ name: string; number: number | null; photoUrl: string | null }>;
  closedAt: string | null;
}

/** The club's most recent Man of the Match winner(s), or null. Never throws. */
export async function getLatestMotm(slug: string): Promise<LatestMotm | null> {
  try {
    const res = await fetch(`${API_BASE}/public/${encodeURIComponent(slug)}/motm/latest`, { cache: 'no-store' });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data?.winners?.length ? (body.data as LatestMotm) : null;
  } catch {
    return null;
  }
}
