'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BoostHuddleMark } from '@/components/ui/Brand';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ownerApi } from '@/lib/owner/client';

const NAV: Array<{ href: string; label: string; icon: IconName }> = [
  { href: '/owner', label: 'Overview', icon: 'grid' },
  { href: '/owner/clubs', label: 'Clubs', icon: 'shield' },
  { href: '/owner/members', label: 'Members', icon: 'users' },
  { href: '/owner/money', label: 'Money', icon: 'money' },
  { href: '/owner/history', label: 'History', icon: 'history' },
];

/**
 * The owner panel's frame: brand bar and log out on top, section links under
 * it on wider screens and as a bottom tab bar on phones (the panel installs
 * as its own phone app).
 */
export default function OwnerShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '/owner';
  const [leaving, setLeaving] = useState(false);
  const active = (href: string) => (href === '/owner' ? path === '/owner' : path.startsWith(href));

  const logOut = async () => {
    setLeaving(true);
    await ownerApi.logout();
    window.location.href = '/owner/login';
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BoostHuddleMark href="/owner" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand bg-brand/10 border border-brand/30 px-2 py-0.5 chamfer-sm">Owner</span>
          </div>
          <button type="button" onClick={logOut} disabled={leaving} className="btn btn-ghost btn-sm min-h-10 px-3">
            <Icon name="logout" className="w-5 h-5" />
            <span className="hidden sm:inline">{leaving ? 'Logging out…' : 'Log out'}</span>
            <span className="sr-only sm:hidden">Log out</span>
          </button>
        </div>
        <nav className="hidden sm:flex max-w-6xl mx-auto px-4 gap-1" aria-label="Owner panel">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? 'page' : undefined}
              className={`flex items-center gap-2 px-3 py-3 font-display text-base font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                active(item.href) ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-foreground'
              }`}
            >
              <Icon name={item.icon} className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 sm:pt-10 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-16">{children}</main>

      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]"
        aria-label="Owner panel"
      >
        <ul className="grid grid-cols-5">
          {NAV.map((item) => {
            const on = active(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={on ? 'page' : undefined}
                  className={`relative flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-bold uppercase tracking-wide transition-colors ${on ? 'text-brand' : 'text-muted hover:text-foreground'}`}
                >
                  {on ? <span className="absolute top-0 inset-x-4 h-0.5 bg-brand shadow-glow-8" aria-hidden="true" /> : null}
                  <Icon name={item.icon} className="w-6 h-6" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
