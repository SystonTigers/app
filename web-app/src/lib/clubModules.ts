'use client';

/**
 * The club extras (Subs and fees, Signing on, Shop) switched on for a club,
 * shared by the admin nav, the extras' pages and the Club extras settings
 * card, so switching one on shows its link straight away.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { findClub, NO_MODULES, type ClubModule, type ClubModules } from './club';

const known = new Map<string, ClubModules>();
const loading = new Set<string>();
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Load a club's extras once per page visit. A club that can't be loaded counts as having none on. */
function load(tenant: string): void {
    if (known.has(tenant) || loading.has(tenant)) return;
    loading.add(tenant);
    findClub(tenant)
        .then((club) => known.set(tenant, club?.modules ?? NO_MODULES))
        .catch(() => known.set(tenant, NO_MODULES))
        .finally(() => {
            loading.delete(tenant);
            notify();
        });
}

/** After a club admin saves a switch: everything on the page sees the change. */
export function setClubModule(tenant: string, module: ClubModule, on: boolean): void {
    known.set(tenant, { ...(known.get(tenant) ?? NO_MODULES), [module]: on });
    notify();
}

/** The club's extras, or null while they load. */
export function useClubModules(tenant: string): ClubModules | null {
    useEffect(() => {
        if (tenant) load(tenant);
    }, [tenant]);
    return useSyncExternalStore(subscribe, () => known.get(tenant) ?? null, () => null);
}
