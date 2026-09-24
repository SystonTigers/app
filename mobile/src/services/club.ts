import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, TENANT_ID as BUILD_CLUB_SLUG } from '../config';

/**
 * The club this app is showing.
 *
 * One app serves every club: people pick theirs on the "Find your club" screen
 * (or it comes from their account when they log in). A build can be locked to
 * one club by setting EXPO_PUBLIC_TENANT_ID, in which case the picker is skipped.
 *
 * The club is kept in memory for the API client (getTenantId) and saved to
 * AsyncStorage so the app reopens on the same club. It isn't secret.
 */

export interface Club {
  slug: string;
  name: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  badgeUrl: string | null;
}

export type ClubSummary = Pick<Club, 'slug' | 'name' | 'primaryColor' | 'badgeUrl'>;

const STORAGE_KEY = '@current_club';

/** Set when this build is locked to one club. */
export const LOCKED_CLUB_SLUG = BUILD_CLUB_SLUG;

let current: Club | null = null;
const listeners = new Set<(club: Club | null) => void>();

/** Slug of the current club, for API calls. Empty until a club is chosen. */
export function getTenantId(): string {
  return current?.slug || LOCKED_CLUB_SLUG || '';
}

export function getCurrentClub(): Club | null {
  return current;
}

export function subscribeToClub(listener: (club: Club | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isClub(value: unknown): value is Club {
  return !!value && typeof value === 'object' && typeof (value as Club).slug === 'string' && typeof (value as Club).name === 'string';
}

export async function setCurrentClub(club: Club | null): Promise<void> {
  current = club;
  try {
    if (club) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(club));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Could not save the chosen club', error);
  }
  listeners.forEach((listener) => listener(club));
}

/** Club details (name, colours, badge) by web address. Null if there's no such club. */
export async function fetchClubInfo(slug: string): Promise<Club | null> {
  const clean = slug.trim().toLowerCase();
  if (!clean) return null;
  const res = await fetch(`${API_BASE_URL}/public/${encodeURIComponent(clean)}/info`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Couldn't load the club (${res.status})`);
  const body = await res.json();
  const data = body?.data;
  if (!data?.slug) return null;
  return {
    slug: data.slug,
    name: data.name || data.slug,
    primaryColor: data.primaryColor ?? null,
    secondaryColor: data.secondaryColor ?? null,
    badgeUrl: data.badgeUrl ?? null,
  };
}

/** Clubs whose name or web address contains the search text. */
export async function searchClubs(query: string): Promise<ClubSummary[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const res = await fetch(`${API_BASE_URL}/api/v1/clubs/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const body = await res.json();
  return Array.isArray(body?.data) ? body.data : [];
}

/**
 * Restore the club chosen last time (or the locked club) at app start.
 * Refreshes its name/colours in the background when online.
 */
export async function loadStoredClub(): Promise<Club | null> {
  let stored: Club | null = null;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    stored = isClub(parsed) ? parsed : null;
  } catch {
    stored = null;
  }

  // A locked build always uses its own club
  if (LOCKED_CLUB_SLUG && stored?.slug !== LOCKED_CLUB_SLUG) {
    stored = { slug: LOCKED_CLUB_SLUG, name: LOCKED_CLUB_SLUG, primaryColor: null, secondaryColor: null, badgeUrl: null };
  }

  current = stored;
  listeners.forEach((listener) => listener(stored));

  if (stored) {
    fetchClubInfo(stored.slug)
      .then((fresh) => {
        if (fresh && current?.slug === fresh.slug) {
          return setCurrentClub(fresh);
        }
        return undefined;
      })
      .catch(() => {
        // Offline: keep the saved details
      });
  }
  return stored;
}
