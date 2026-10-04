'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, getSessionToken, homeFor, type SessionUser } from '@/lib/session';
import { AuthShell } from '@/components/ui/AuthShell';
import { ClubBadge } from '@/components/ui/Brand';
import { Icon, type IconName } from '@/components/ui/Icon';

/** What login saves: some accounts keep the name in `profile`. */
type StoredUser = Partial<SessionUser> & { profile?: { name?: string } };

interface MyClub {
  id: string;
  name: string;
  slug: string;
}

const features: { icon: IconName; title: string; body: string }[] = [
  { icon: 'calendar', title: 'Fixtures', body: 'Kick-off times and grounds for every match.' },
  { icon: 'trophy', title: 'Results and stats', body: 'Scores, scorers and the league table.' },
  { icon: 'chat', title: 'Team chat', body: 'Talk to coaches and other parents in one place.' },
  { icon: 'bell', title: 'Match alerts', body: 'Goals and changes sent straight to your phone.' },
];

/** Shown after someone joins a club with a code. Works with whatever we know about them. */
export default function WelcomePage() {
  const [user, setUser] = useState<StoredUser>({});
  const [club, setClub] = useState<MyClub | null>(null);

  useEffect(() => {
    let stored: StoredUser = {};
    try {
      stored = JSON.parse(localStorage.getItem('user_data') || '{}') as StoredUser;
    } catch {
      // Storage blocked: show the general welcome
    }
    setUser(stored);
    if (!getSessionToken()) return;

    let cancelled = false;
    apiFetch('/api/v1/auth/me/tenants')
      .then(async (res) => {
        if (!res.ok) return;
        const { tenants = [] } = (await res.json()) as { tenants?: MyClub[] };
        const mine = tenants.find((t) => t.id === stored.tenant_id) ?? (tenants.length === 1 ? tenants[0] : undefined);
        if (!cancelled && mine) setClub(mine);
      })
      .catch(() => {
        // The club name is a nice extra: the page reads fine without it
      });
    return () => { cancelled = true; };
  }, []);

  const firstName = (user.name || user.profile?.name || '').trim().split(/\s+/)[0];
  const slug = user.tenant_slug || club?.slug || null;
  const next = slug && user.id ? homeFor({ id: user.id, email: user.email || '', roles: user.roles, tenant_slug: slug }) : slug ? `/${slug}` : '/login';

  return (
    <AuthShell
      mark={club ? <ClubBadge name={club.name} size={72} /> : undefined}
      title={firstName ? `Welcome, ${firstName}` : 'Welcome aboard'}
      subtitle={club ? <>You&apos;re now part of <strong className="text-foreground">{club.name}</strong>.</> : 'Your account is ready.'}
      footer={<p>Find your club page any time from the menu once you&apos;re logged in.</p>}
    >
      <h2 className="font-display text-xl uppercase text-foreground mb-4">What you can do</h2>
      <ul className="space-y-4 mb-8">
        {features.map((f) => (
          <li key={f.title} className="flex items-start gap-3">
            <span className="w-10 h-10 shrink-0 hexagon bg-brand/15 text-brand flex items-center justify-center">
              <Icon name={f.icon} className="w-5 h-5" />
            </span>
            <span>
              <span className="block font-bold text-foreground">{f.title}</span>
              <span className="block text-sm text-muted">{f.body}</span>
            </span>
          </li>
        ))}
      </ul>
      <Link href={next} className="btn btn-primary w-full">
        {slug ? 'Go to my club' : 'Log in to your club'}
        <Icon name="arrowRight" className="w-4 h-4" />
      </Link>
    </AuthShell>
  );
}
