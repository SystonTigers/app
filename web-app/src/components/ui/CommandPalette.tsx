'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from './Icon';
import { clubNav } from './clubNav';
import { useSignedIn } from './Page';
import { canAccessAdmin, useUserRole } from '@/hooks/useUserRole';

interface Destination {
    label: string;
    href: string;
    icon: IconName;
}

/**
 * Quick jump to any club page: Ctrl+K / ⌘K on a computer, or the search
 * button in the club nav. Lists the same pages as the nav (clubNav), plus
 * Club admin for staff.
 */
export function CommandPalette({ tenant }: { tenant: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();
    const signedIn = useSignedIn();
    const { role } = useUserRole();

    const destinations = useMemo<Destination[]>(() => {
        const { main, more } = clubNav(tenant, !!signedIn);
        const all: Destination[] = [...main, ...more];
        if (canAccessAdmin(role)) all.push({ label: 'Club admin', href: `/${tenant}/admin`, icon: 'settings' });
        return all;
    }, [tenant, signedIn, role]);

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? destinations.filter((d) => d.label.toLowerCase().includes(q)) : destinations;
    }, [destinations, query]);

    const close = useCallback(() => {
        setIsOpen(false);
        setQuery('');
        setSelected(0);
    }, []);

    const go = useCallback((d: Destination) => {
        router.push(d.href);
        close();
    }, [router, close]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') close();
        };
        const onOpen = () => setIsOpen(true);
        document.addEventListener('keydown', onKey);
        window.addEventListener(OPEN_EVENT, onOpen);
        return () => {
            document.removeEventListener('keydown', onKey);
            window.removeEventListener(OPEN_EVENT, onOpen);
        };
    }, [close]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    const onInputKey = (e: React.KeyboardEvent) => {
        if (!matches.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelected((i) => (i + 1) % matches.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelected((i) => (i - 1 + matches.length) % matches.length);
        } else if (e.key === 'Enter') {
            go(matches[Math.min(selected, matches.length - 1)]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Go to a page">
            <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Close" onClick={close} />
            <div className="absolute left-1/2 top-[12%] -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg bg-surface border border-border shadow-2xl chamfer-lg overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
                    <Icon name="search" className="w-5 h-5 text-muted shrink-0" />
                    <label htmlFor="command-search" className="sr-only">Go to a page</label>
                    <input
                        id="command-search"
                        ref={inputRef}
                        type="text"
                        autoComplete="off"
                        placeholder="Go to a page…"
                        className="flex-1 bg-transparent text-lg outline-none text-foreground placeholder:text-muted"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                        onKeyDown={onInputKey}
                    />
                    <kbd className="hidden sm:block px-2 py-1 text-xs bg-surface-raised border border-border text-muted font-mono">Esc</kbd>
                </div>
                <ul className="max-h-[60vh] overflow-y-auto p-2" role="listbox" aria-label="Pages">
                    {matches.length === 0 ? (
                        <li className="p-8 text-center text-muted">No page called that. Try “fixtures” or “table”.</li>
                    ) : (
                        matches.map((d, i) => (
                            <li key={d.href} role="option" aria-selected={i === selected}>
                                <button
                                    type="button"
                                    onClick={() => go(d)}
                                    onMouseEnter={() => setSelected(i)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors ${i === selected ? 'bg-brand/15 text-brand' : 'text-foreground hover:bg-surface-raised'}`}
                                >
                                    <Icon name={d.icon} className="w-5 h-5 shrink-0" />
                                    <span className="font-bold">{d.label}</span>
                                    <Icon name="arrowRight" className={`w-4 h-4 ml-auto ${i === selected ? 'opacity-100' : 'opacity-0'}`} />
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}

const OPEN_EVENT = 'boost-huddle:open-search';

/** A search button for headers: opens the palette above. */
export function CommandPaletteTrigger() {
    return (
        <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
            className="btn btn-ghost btn-sm"
            aria-label="Go to a page"
        >
            <Icon name="search" className="w-4 h-4" />
            <kbd className="hidden lg:inline text-xs font-mono normal-case">Ctrl K</kbd>
        </button>
    );
}
