'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ownerApi } from '@/lib/owner/client';

const NAV = [
  { href: '/owner', label: 'Overview' },
  { href: '/owner/clubs', label: 'Clubs' },
  { href: '/owner/members', label: 'Members' },
  { href: '/owner/money', label: 'Money' },
  { href: '/owner/history', label: 'History' },
];

/** The owner panel's frame: brand bar, section links and sign out. */
export default function OwnerShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '/owner';
  const [leaving, setLeaving] = useState(false);
  const active = (href: string) => (href === '/owner' ? path === '/owner' : path.startsWith(href));

  const signOut = async () => {
    setLeaving(true);
    await ownerApi.logout();
    window.location.href = '/owner/login';
  };

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-white">
      <header className="sticky top-0 z-20 bg-[#0B0D0F]/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/owner" className="flex items-center gap-2 no-underline">
            <span className="font-black italic uppercase tracking-tight text-lg">Boost Huddle</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand bg-brand/10 border border-brand/30 px-2 py-0.5 chamfer-sm">Owner</span>
          </Link>
          <button type="button" onClick={signOut} disabled={leaving} className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white disabled:opacity-50">
            {leaving ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto" aria-label="Owner panel">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? 'page' : undefined}
              className={`px-3 py-2.5 text-sm font-bold uppercase tracking-wider whitespace-nowrap border-b-2 no-underline transition-colors ${
                active(item.href) ? 'border-brand text-brand' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
