'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmptyNote, PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ownerApi } from '@/lib/owner/client';
import { ago, trialText } from '@/lib/owner/format';
import { ClubMark, ErrorBox, Loading, StatusBadge, useLoad } from '@/components/owner/ui';
import type { OwnerClub } from '@/lib/owner/types';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'trial', label: 'Trial' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'cancelled', label: 'Cancelled' },
];

function connectionsText(club: OwnerClub): string {
  const on = [club.youtube && 'YouTube', club.facebook && 'Facebook', club.instagram && 'Instagram'].filter(Boolean);
  return on.length ? on.join(' · ') : 'No social accounts';
}

function ClubRow({ c }: { c: OwnerClub }) {
  const trialSoon = c.status === 'trial' && c.trialDaysLeft !== null && c.trialDaysLeft <= 3;
  return (
    <Link href={`/owner/clubs/${c.id}`} className="card block p-4 sm:p-5 hover:border-brand/60 transition-colors group">
      <div className="flex items-start gap-3">
        <ClubMark name={c.name} badgeUrl={c.badgeUrl} color={c.color} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="font-display text-xl font-bold uppercase tracking-wide text-foreground truncate group-hover:text-brand">{c.name}</span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">{c.planName}</span>
              <StatusBadge status={c.status} comped={c.comped} />
            </span>
          </div>
          <div className="text-xs text-muted truncate">{c.ownerEmail} · /{c.slug}</div>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
        {([['Members', c.members], ['Staff', c.staff], ['Players', c.players], ['Live', c.liveMatches]] as const).map(([label, n]) => (
          <div key={label} className="flex flex-col-reverse bg-surface-raised border border-border px-1 py-2 chamfer-sm">
            <dt className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted">{label}</dt>
            <dd className="font-display text-xl font-extrabold tabular-nums text-foreground leading-none">{n}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>Last active: {ago(c.lastActiveAt)}</span>
        {c.status === 'trial' ? <span className={trialSoon ? 'text-amber-300 font-bold' : ''}>{trialText(c.trialDaysLeft)}</span> : null}
        <span>{connectionsText(c)}</span>
      </div>
    </Link>
  );
}

function ClubsList() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const [text, setText] = useState(q);
  const { data, error, loading, reload } = useLoad(() => ownerApi.clubs(q, status), [q, status]);

  // Back/forward changes the address: show its search in the box
  useEffect(() => {
    setText((current) => (current.trim() === q ? current : q));
  }, [q]);

  // Search as you type, without a request per key press
  useEffect(() => {
    if (text.trim() === q) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (text.trim()) next.set('q', text.trim()); else next.delete('q');
      router.replace(`/owner/clubs?${next.toString()}`);
    }, 300);
    return () => clearTimeout(t);
  }, [text, q, params, router]);

  const setStatus = (s: string) => {
    const next = new URLSearchParams(params.toString());
    if (s) next.set('status', s); else next.delete('status');
    router.replace(`/owner/clubs?${next.toString()}`);
  };

  const clearAll = () => {
    setText('');
    router.replace('/owner/clubs');
  };

  return (
    <>
      <PageHeader
        eyebrow="Owner panel"
        title="Clubs"
        subtitle={data ? `${data.length} club${data.length === 1 ? '' : 's'}${q || status ? ' match' : ' on Boost Huddle'}` : 'Every club on Boost Huddle.'}
      />

      <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-6">
        <div className="lg:w-96">
          <label htmlFor="club-search" className="label">Search</label>
          <div className="relative">
            <Icon name="search" className="z-10 w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="club-search"
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Club name, web address or email"
              className="field chamfer-sm pl-10"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show clubs by status">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatus(f.id)}
              aria-pressed={status === f.id}
              className={`btn btn-sm min-h-10 ${status === f.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading label="Loading clubs…" /> : null}
      {data && !data.length ? (
        <EmptyNote
          icon="search"
          title="No clubs match"
          action={q || status ? <button type="button" onClick={clearAll} className="btn btn-secondary">Show all clubs</button> : undefined}
        >
          {q || status ? 'Try another name or email, or clear the search and filter.' : 'No clubs have signed up yet. They show here as soon as they do.'}
        </EmptyNote>
      ) : null}

      {data?.length ? (
        <ul className={`grid lg:grid-cols-2 gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {data.map((c) => (
            <li key={c.id} className="min-w-0">
              <ClubRow c={c} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export default function OwnerClubsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ClubsList />
    </Suspense>
  );
}
