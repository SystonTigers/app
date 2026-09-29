'use client';

import Link from 'next/link';
import { ownerApi } from '@/lib/owner/client';
import { ago, pounds, shortDate } from '@/lib/owner/format';
import { Card, CardTitle, Empty, ErrorBox, Loading, PageTitle, Stat, StatusBadge, useLoad } from '@/components/owner/ui';

export default function OwnerOverviewPage() {
  const { data, error, loading, reload } = useLoad(() => ownerApi.overview());

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;
  const { clubs, money } = data;

  return (
    <>
      <PageTitle title="Overview" sub="Every club on Boost Huddle at a glance." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Clubs" value={clubs.total} hint={`${data.newClubs30d} new in 30 days`} />
        <Stat label="Monthly income" value={pounds(money.monthlyRecurringPence)} hint={`${money.payingClubs} paying club${money.payingClubs === 1 ? '' : 's'}`} tone="brand" />
        <Stat label="On trial" value={clubs.trial} hint={`${pounds(money.trialPipelinePence)}/month if they all pay`} tone="amber" />
        <Stat label="Members" value={data.members} hint={`${data.players} players · ${data.liveMatches7d} live matches this week`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle>Newest clubs</CardTitle>
          {data.recentSignups.length ? (
            <ul className="divide-y divide-gray-800">
              {data.recentSignups.map((c) => (
                <li key={c.id}>
                  <Link href={`/owner/clubs/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 no-underline group">
                    <span className="min-w-0">
                      <span className="block font-bold text-white truncate group-hover:text-brand">{c.name}</span>
                      <span className="block text-xs text-gray-500">Joined {ago(c.createdAt)} · {c.plan === 'pro' ? 'Pro' : 'Starter'}</span>
                    </span>
                    <StatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty>No clubs yet.</Empty>}
        </Card>

        <Card>
          <CardTitle>Trials ending this week</CardTitle>
          {data.trialsEndingSoon.length ? (
            <ul className="divide-y divide-gray-800">
              {data.trialsEndingSoon.map((t) => (
                <li key={t.id}>
                  <Link href={`/owner/clubs/${t.id}`} className="flex items-center justify-between gap-3 py-2.5 no-underline group">
                    <span className="font-bold text-white truncate group-hover:text-brand">{t.name}</span>
                    <span className="text-xs text-amber-300 whitespace-nowrap">Ends {shortDate(t.trialEndsAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty>No trials end in the next 7 days.</Empty>}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Clubs by status</CardTitle>
          <div className="flex flex-wrap gap-2">
            {(['active', 'trial', 'suspended', 'cancelled'] as const).map((s) => (
              <Link key={s} href={`/owner/clubs?status=${s}`} className="flex items-center gap-2 px-3 py-2 border border-gray-800 chamfer-sm no-underline hover:border-brand">
                <StatusBadge status={s} />
                <span className="font-black tabular-nums text-white">{clubs[s]}</span>
              </Link>
            ))}
            <span className="flex items-center gap-2 px-3 py-2 border border-gray-800 chamfer-sm">
              <StatusBadge status="active" comped />
              <span className="font-black tabular-nums text-white">{clubs.comped}</span>
            </span>
          </div>
          {!money.stripeConnected ? (
            <p className="text-xs text-gray-500 mt-4">Card payments aren&apos;t switched on yet (Stripe isn&apos;t connected), so monthly income is what clubs on each plan would pay.</p>
          ) : null}
        </Card>
      </div>
    </>
  );
}
