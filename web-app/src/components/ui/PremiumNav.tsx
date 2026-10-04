'use client';

/**
 * The club site's navigation: a header (links on wide screens), a bottom bar
 * on phones and tablets, and one menu sheet both open.
 *
 * Visitors only see pages that work without logging in; members also get the
 * members-only pages, and staff get Admin.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationCenter } from './NotificationCenter';
import { Icon } from './Icon';
import { clubNav } from './clubNav';
import { CommandPaletteTrigger } from './CommandPalette';
import { ClubBadge } from './Brand';
import { useUserRole, canAccessAdmin } from '@/hooks/useUserRole';
import { TenantSwitcher } from '../TenantSwitcher';
import { clubAppLink } from '@/lib/app-link';

interface PremiumNavProps {
    tenant: string;
    teamName: string;
    badgeUrl?: string | null;
}

export function PremiumNav({ tenant, teamName, badgeUrl }: PremiumNavProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const pathname = usePathname() ?? '';
    const { role, isLoggedIn } = useUserRole();
    const { main, more } = clubNav(tenant, isLoggedIn);
    const showAdmin = canAccessAdmin(role);

    // Close menus when the page changes
    useEffect(() => {
        setMenuOpen(false);
        setMoreOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [menuOpen]);

    const isActive = (href: string) => (href === `/${tenant}` ? pathname === href : pathname.startsWith(href));
    const moreActive = more.some((i) => isActive(i.href));
    const loginHref = `/login?next=${encodeURIComponent(pathname || `/${tenant}`)}`;

    return (
        <>
            <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border">
                <div className="container flex items-center justify-between gap-4 h-16">
                    <Link href={`/${tenant}`} className="flex items-center gap-3 min-w-0 group">
                        <ClubBadge name={teamName} badgeUrl={badgeUrl} size={40} className="transition-transform group-hover:scale-105" />
                        <span className="font-display text-xl font-extrabold uppercase italic tracking-wide truncate max-w-[52vw] lg:max-w-[150px] xl:max-w-[240px]">
                            {teamName}
                        </span>
                    </Link>

                    {/* Wide screens: the links themselves */}
                    <nav aria-label="Club" className="hidden lg:flex items-center gap-0.5">
                        {main.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive(item.href) ? 'page' : undefined}
                                className={`px-3 py-2 font-display text-[15px] font-bold uppercase tracking-wider transition-colors border-b-2 ${isActive(item.href)
                                    ? 'text-brand border-brand'
                                    : 'text-gray-300 border-transparent hover:text-foreground'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                        <div className="relative" onMouseLeave={() => setMoreOpen(false)}>
                            <button
                                type="button"
                                aria-expanded={moreOpen}
                                onClick={() => setMoreOpen((o) => !o)}
                                onMouseEnter={() => setMoreOpen(true)}
                                className={`px-3 py-2 font-display text-[15px] font-bold uppercase tracking-wider flex items-center gap-1 border-b-2 transition-colors ${moreActive ? 'text-brand border-brand' : 'text-gray-300 border-transparent hover:text-foreground'}`}
                            >
                                More <Icon name="chevronDown" className="w-4 h-4" />
                            </button>
                            {moreOpen && (
                                <div className="absolute top-full right-0 pt-2 w-56 z-50">
                                    <div className="bg-surface border border-border shadow-2xl p-2 chamfer-sm">
                                        {more.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-colors ${isActive(item.href) ? 'bg-brand/10 text-brand' : 'text-gray-200 hover:bg-surface-raised hover:text-foreground'}`}
                                            >
                                                <Icon name={item.icon} className="w-4 h-4 text-brand" />
                                                {item.label}
                                            </Link>
                                        ))}
                                        {!isLoggedIn && (
                                            <p className="px-3 pt-2 pb-1 text-xs text-muted border-t border-border mt-1">
                                                Log in to see the gallery, training and team talk.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </nav>

                    <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden lg:inline-flex"><CommandPaletteTrigger /></span>
                        {isLoggedIn ? (
                            <>
                                <NotificationCenter />
                                <TenantSwitcher />
                                {showAdmin && (
                                    <Link href={`/${tenant}/admin`} className="hidden sm:inline-flex btn btn-sm btn-secondary">
                                        <Icon name="settings" className="w-4 h-4" />
                                        <span className="hidden xl:inline">Admin</span>
                                    </Link>
                                )}
                            </>
                        ) : (
                            <>
                                <Link href={loginHref} className="hidden sm:inline-flex btn btn-sm btn-ghost">Log in</Link>
                                <a href={clubAppLink(tenant)} className="hidden sm:inline-flex btn btn-sm btn-primary">Get the app</a>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={() => setMenuOpen(true)}
                            className="lg:hidden p-2 text-gray-200 hover:text-brand"
                            aria-label="Open menu"
                            aria-expanded={menuOpen}
                        >
                            <Icon name="menu" className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Phones and tablets: bottom bar */}
            <nav aria-label="Club shortcuts" className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-background/95 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]">
                <div className="grid grid-cols-5 h-16">
                    {main.slice(0, 4).map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={isActive(item.href) ? 'page' : undefined}
                            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${isActive(item.href) ? 'text-brand' : 'text-gray-400 hover:text-foreground'}`}
                        >
                            <Icon name={item.icon} className="w-5 h-5" />
                            {item.label}
                        </Link>
                    ))}
                    <button
                        type="button"
                        onClick={() => setMenuOpen(true)}
                        className="flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-400 hover:text-foreground"
                    >
                        <Icon name="menu" className="w-5 h-5" />
                        More
                    </button>
                </div>
            </nav>

            {/* Menu sheet */}
            {menuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
                    <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[88vw] bg-surface border-l border-border shadow-2xl overflow-y-auto flex flex-col">
                        <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
                            <div className="flex items-center gap-3 min-w-0">
                                <ClubBadge name={teamName} badgeUrl={badgeUrl} size={32} />
                                <span className="font-display text-lg font-extrabold uppercase italic truncate">{teamName}</span>
                            </div>
                            <button type="button" onClick={() => setMenuOpen(false)} className="p-2 text-gray-300 hover:text-brand" aria-label="Close menu">
                                <Icon name="close" className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-3 space-y-1 flex-1">
                            {[...main, ...more].map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMenuOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-3 font-semibold transition-colors ${isActive(item.href) ? 'bg-brand/10 text-brand' : 'text-gray-200 hover:bg-surface-raised'}`}
                                >
                                    <Icon name={item.icon} className="w-5 h-5 text-brand" />
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                        <div className="p-4 border-t border-border space-y-3">
                            {showAdmin && (
                                <Link href={`/${tenant}/admin`} onClick={() => setMenuOpen(false)} className="btn btn-secondary w-full">
                                    <Icon name="settings" className="w-4 h-4" /> Club admin
                                </Link>
                            )}
                            {!isLoggedIn && (
                                <>
                                    <a href={clubAppLink(tenant)} className="btn btn-primary w-full">Get the club app</a>
                                    <Link href={loginHref} onClick={() => setMenuOpen(false)} className="btn btn-secondary w-full">Log in</Link>
                                    <p className="text-xs text-muted text-center">Players, parents and staff log in to see the gallery, training and team talk.</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
