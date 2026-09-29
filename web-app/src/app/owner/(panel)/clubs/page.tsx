'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ownerApi } from '@/lib/owner/client';
import { ago, trialText } from '@/lib/owner/format';
import { Empty, ErrorBox, Loading, PageTitle, StatusBadge, inputClass, useLoad } from '@/components/owner/ui';
import type { OwnerClub } from '@/lib/owner/types';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'trial', label: 'Trial' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'cancelled', label: 'Cancelled' },
];

function Connections({ club }: { club: OwnerClub }) {
  const on = [club.youtube && 'YouTube', club.facebook && 'Facebook', club.instagram && 'Instagram'].filter(Boolean);
  return <span className="text-xs text-gray-500">{on.length ? on.join(' · ') : 'No social accounts'}</span>;
}

function ClubsList() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const [text, setText] = useState(q);
  const { data, error, loading, reload } = useLoad(() => ownerApi.clubs(q, status), [q, status]);

  // Search as you type, without a request per key press
  useEffect(() => {
    if (text === q) return;
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

  return (
    <>
      <PageTitle title="Clubs" sub={data ? `${data.length} club${data.length === 1 ? '' : 's'}` : undefined} />
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by club name, web address or email" aria-label="Search clubs" className={`${inputClass} sm:max-w-sm`} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => setStatus(f.id)} aria-pressed={status === f.id}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border chamfer-sm ${status === f.id ? 'bg-brand text-black border-brand' : 'border-gray-700 text-gray-300 hover:border-brand'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading && !data ? <Loading /> : null}
      {data && !data.length ? <Empty>No clubs match.</Empty> : null}

      {data?.length ? (
        <ul className="flex flex-col gap-2">
          {data.map((c) => (
            <li key={c.id}>
              <Link href={`/owner/clubs/${c.id}`} className="block bg-gray-900/60 border border-gray-800 chamfer-sm p-4 no-underline hover:border-brand transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1 basis-56">
                    <span className="w-3 h-8 shrink-0 chamfer-sm" style={{ background: c.color || '#374151' }} aria-hidden />
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{c.name}</div>
                      <div className="text-xs text-gray-500 truncate">{c.ownerEmail} · /{c.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-300">{c.planName}</span>
                    <StatusBadge status={c.status} comped={c.comped} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-400 tabular-nums">
                  <span><b className="text-white">{c.members}</b> members</span>
                  <span><b className="text-white">{c.staff}</b> staff</span>
                  <span><b className="text-white">{c.players}</b> players</span>
                  <span><b className="text-white">{c.liveMatches}</b> live matches</span>
                  <span>Last active: {ago(c.lastActiveAt)}</span>
                  {c.status === 'trial' ? <span className={c.trialDaysLeft !== null && c.trialDaysLeft <= 3 ? 'text-amber-300' : ''}>{trialText(c.trialDaysLeft)}</span> : null}
                  <Connections club={c} />
                </div>
              </Link>
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
