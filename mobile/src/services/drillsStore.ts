/**
 * The club's drills, my favourite drills and video links, shared by the Drill
 * Library, the drill page and the session planner. Loaded once per club and
 * kept in step as people change things (favourites update straight away).
 */
import { useSyncExternalStore } from 'react';
import { apiClient } from './api';
import { getTenantId } from './club';
import type { ClubDrill, DrillLink } from '../utils/drills';

export interface DrillsState {
  club: ClubDrill[];
  favourites: string[];
  links: Record<string, DrillLink[]>;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

const EMPTY: DrillsState = { club: [], favourites: [], links: {}, loaded: false, loading: false, error: null };
let state: DrillsState = EMPTY;
let tenant: string | null = null;
const listeners = new Set<() => void>();

function set(next: Partial<DrillsState>): void {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDrills(): DrillsState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Loads (or reloads) the club's drills. Another club's drills are never shown. */
export async function loadDrills(force = false): Promise<void> {
  const current = getTenantId();
  if (current !== tenant) {
    tenant = current;
    state = EMPTY;
  } else if ((state.loaded && !force) || state.loading) {
    return;
  }
  set({ loading: true });
  try {
    const res = (await apiClient.get('/api/v1/training/drills')).data as { data: ClubDrill[]; favourites?: string[]; links?: Record<string, DrillLink[]> };
    if (tenant !== current) return;
    set({ club: res.data ?? [], favourites: res.favourites ?? [], links: res.links ?? {}, loaded: true, loading: false, error: null });
  } catch {
    if (tenant !== current) return;
    // The built-in drills still work without the club's own
    set({ loading: false, error: "Your club's drills and favourites couldn't load. Pull down to try again." });
  }
}

/** Star or un-star a drill for me. Shows straight away; puts it back if saving fails. */
export async function setFavourite(ref: string, favourite: boolean): Promise<void> {
  const before = state.favourites;
  set({ favourites: favourite ? [ref, ...before.filter((r) => r !== ref)] : before.filter((r) => r !== ref) });
  try {
    const res = await apiClient.put('/api/v1/training/drill-favourites', { ref, favourite });
    set({ favourites: res.data.data.favourites });
  } catch (err) {
    set({ favourites: before });
    throw err;
  }
}

/** Staff: add or change a club drill. Returns the saved drill. */
export async function saveDrill(id: string | null, body: Record<string, unknown>): Promise<ClubDrill> {
  const res = id ? await apiClient.put(`/api/v1/training/drills/${encodeURIComponent(id)}`, body) : await apiClient.post('/api/v1/training/drills', body);
  const saved = res.data.data as ClubDrill;
  const club = [...state.club.filter((d) => d.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  set({ club });
  return saved;
}

export async function removeDrill(id: string): Promise<void> {
  await apiClient.delete(`/api/v1/training/drills/${encodeURIComponent(id)}`);
  const ref = `club:${id}`;
  const { [ref]: _gone, ...links } = state.links;
  set({ club: state.club.filter((d) => d.id !== id), favourites: state.favourites.filter((r) => r !== ref), links });
}

/** Staff: a TikTok, Instagram or YouTube link on a drill. */
export async function addLink(ref: string, url: string): Promise<DrillLink> {
  const link = (await apiClient.post('/api/v1/training/drill-links', { ref, url }, { timeout: 20000 })).data.data as DrillLink;
  set({ links: { ...state.links, [ref]: [...(state.links[ref] ?? []), link] } });
  return link;
}

export async function removeLink(link: DrillLink): Promise<void> {
  await apiClient.delete(`/api/v1/training/drill-links/${encodeURIComponent(link.id)}`);
  set({ links: { ...state.links, [link.ref]: (state.links[link.ref] ?? []).filter((l) => l.id !== link.id) } });
}
