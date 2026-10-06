'use client';

/**
 * The club admin's own navigation: one row of links that scrolls sideways on
 * phones (so every admin page is reachable at any width), with the current
 * page highlighted and scrolled into view.
 */
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';

interface AdminLink {
    label: string;
    path: string;
    icon: IconName;
    /** Other admin pages that belong under this link (e.g. a player's page under Squad). */
    also?: string[];
}

const LINKS: AdminLink[] = [
    { label: 'Dashboard', path: '', icon: 'home' },
    { label: 'Squad', path: '/squad', icon: 'users', also: ['/players'] },
    { label: 'Fixtures', path: '/fixtures', icon: 'calendar' },
    { label: 'Results', path: '/results', icon: 'trophy' },
    { label: 'Table', path: '/table', icon: 'table' },
    { label: 'Events', path: '/calendar', icon: 'flag' },
    { label: 'News', path: '/feed', icon: 'news' },
    { label: 'Goal of the Month', path: '/gotm', icon: 'star' },
    { label: 'Predictions', path: '/lms', icon: 'vote' },
    { label: 'Seasons', path: '/seasons', icon: 'history' },
    { label: 'Opponents', path: '/opponents', icon: 'shield' },
    { label: 'Import', path: '/import', icon: 'upload' },
    { label: 'Settings', path: '/settings', icon: 'settings' },
    { label: 'Billing', path: '/billing', icon: 'card' },
];

export function AdminNav({ tenant }: { tenant: string }) {
    const pathname = usePathname() ?? '';
    const base = `/${tenant}/admin`;
    const activeRef = useRef<HTMLAnchorElement>(null);

    const isActive = (link: AdminLink) => {
        if (!link.path) return pathname === base || pathname === `${base}/`;
        return [link.path, ...(link.also ?? [])].some((p) => pathname.startsWith(`${base}${p}`));
    };

    // Keep the current page's link in view on phones
    useEffect(() => {
        activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }, [pathname]);

    return (
        <nav aria-label="Club admin" className="relative">
            <ul className="flex gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                {LINKS.map((link) => {
                    const active = isActive(link);
                    return (
                        <li key={link.label} className="shrink-0">
                            <Link
                                ref={active ? activeRef : undefined}
                                href={`${base}${link.path}`}
                                aria-current={active ? 'page' : undefined}
                                className={`flex items-center gap-2 h-11 px-3 font-display text-[15px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${active
                                    ? 'text-brand border-brand'
                                    : 'text-gray-300 border-transparent hover:text-foreground'
                                    }`}
                            >
                                <Icon name={link.icon} className="w-4 h-4" />
                                {link.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
            {/* Fade on the right edge hints that the row scrolls */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 -right-4 sm:right-0 w-10 bg-gradient-to-l from-surface to-transparent" />
        </nav>
    );
}
