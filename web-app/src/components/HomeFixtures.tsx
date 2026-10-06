'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/session';
import { clubAppLink } from '@/lib/app-link';
import { kickOffText, nextFixture, upcomingFixtures, type PublicFixture } from '@/lib/fixtures';
import { formatLongDate, formatShortDate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/**
 * The club page's next match and "Coming up" list. Upcoming games show where
 * and when we play, so they're loaded with the visitor's sign-in: members of
 * the club see them, everyone else is asked to log in.
 */
type Upcoming = { fixtures: PublicFixture[]; membersOnly: boolean };

const cache = new Map<string, Promise<Upcoming>>();

function loadUpcoming(tenant: string): Promise<Upcoming> {
  let pending = cache.get(tenant);
  if (!pending) {
    pending = apiFetch(`/public/${encodeURIComponent(tenant)}/fixtures`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => ({ fixtures: Array.isArray(body?.data) ? (body.data as PublicFixture[]) : [], membersOnly: body?.meta?.membersOnly === true }))
      .catch(() => ({ fixtures: [], membersOnly: false }));
    cache.set(tenant, pending);
    // Both cards share one request; the next visit asks again
    pending.finally(() => setTimeout(() => cache.delete(tenant), 1000));
  }
  return pending;
}

function useUpcoming(tenant: string): Upcoming | null {
  const [state, setState] = useState<Upcoming | null>(null);
  useEffect(() => {
    let live = true;
    loadUpcoming(tenant).then((s) => { if (live) setState(s); });
    return () => { live = false; };
  }, [tenant]);
  return state;
}

export function HomeNextMatch({ tenant, clubName }: { tenant: string; clubName: string }) {
  const state = useUpcoming(tenant);
  if (!state) return <div className="card mb-8 h-56 animate-pulse" aria-busy="true" aria-label="Loading the next match" />;
  const fixture = nextFixture(state.fixtures);
  if (state.membersOnly) {
    return (
      <section className="card hex-grid mb-8 text-center py-12">
        <p className="eyebrow mb-3">Next match</p>
        <h2 className="text-3xl md:text-4xl italic mb-2">For club members</h2>
        <p className="text-muted max-w-md mx-auto mb-6">
          To keep our players safe, kick-off times and grounds are only shown to parents, players and supporters {clubName} has let in.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href={`/${tenant}/login`} className="btn btn-primary">Log in</Link>
          <a href={clubAppLink(tenant)} className="btn btn-secondary">Get the app</a>
        </div>
      </section>
    );
  }
  if (!fixture) {
    return (
      <section className="card hex-grid mb-8 text-center py-12">
        <p className="eyebrow mb-3">Next match</p>
        <h2 className="text-3xl md:text-4xl italic mb-2">No games booked yet</h2>
        <p className="text-muted max-w-md mx-auto">
          {clubName}&apos;s next fixture will show here as soon as the club adds it.
        </p>
      </section>
    );
  }

  const time = kickOffText(fixture);
  return (
    <section className="card hex-grid mb-8 p-0 overflow-hidden" aria-labelledby="next-match">
      <div className="p-6 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div className="text-center md:text-left min-w-0">
          <p id="next-match" className="inline-flex items-center gap-2 px-3 py-1 bg-brand text-brand-foreground chamfer-sm font-display text-sm font-bold uppercase tracking-wider mb-5">
            Next match{fixture.competition ? ` · ${fixture.competition}` : ''}
          </p>
          <h2 className="text-3xl md:text-5xl italic leading-none break-words">{fixture.homeTeam}</h2>
          <p className="font-display text-xl text-muted my-1 uppercase">v</p>
          <h2 className="text-3xl md:text-5xl italic leading-none break-words">{fixture.awayTeam}</h2>
          <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
            <Link href={`/${tenant}/fixtures`} className="btn btn-primary">
              All fixtures <Icon name="arrowRight" className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="bg-surface-raised border border-border chamfer-lg p-6 text-center md:min-w-[220px]">
          <p className="text-sm uppercase tracking-widest text-muted mb-2">{formatLongDate(fixture.date)}</p>
          <p className="font-display text-4xl font-extrabold">{time ? `${time} KO` : 'Kick-off TBC'}</p>
          {fixture.venue && (
            <p className="mt-3 text-sm text-muted inline-flex items-center gap-1.5">
              <Icon name="flag" className="w-4 h-4" /> {fixture.venue}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export function HomeComingUp({ tenant }: { tenant: string }) {
  const state = useUpcoming(tenant);
  // Signed out there's nothing to list (the next-match card explains why)
  if (!state || state.membersOnly) return null;
  const next = nextFixture(state.fixtures);
  const fixtures = upcomingFixtures(state.fixtures).filter((f) => f.id !== next?.id).slice(0, 3);
  return (
    <section className="card">
      <h3 className="text-xl mb-4">Coming up</h3>
      {fixtures.length === 0 ? (
        <p className="text-muted text-sm">No more games booked yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {fixtures.map((f) => {
            const time = kickOffText(f);
            return (
              <li key={f.id}>
                <Link href={`/${tenant}/fixtures`} className="block py-3 group">
                  <span className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold uppercase text-brand">{formatShortDate(f.date)}{time ? ` · ${time}` : ''}</span>
                    {f.competition && <span className="text-muted">{f.competition}</span>}
                  </span>
                  <span className="block font-bold group-hover:text-brand transition-colors">{f.homeTeam} v {f.awayTeam}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
