'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { formatDate, formatMoney } from '@/lib/format';
import { ownerApi } from '@/lib/owner/client';
import { ago } from '@/lib/owner/format';
import { Card, CardTitle, ErrorBox, InlineEmpty, Loading, Stat, StatusBadge, useLoad } from '@/components/owner/ui';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function OwnerOverviewPage() {
  const { data, error, loading, reload } = useLoad(() => ownerApi.overview());

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return null;
  const { clubs, money } = data;

  return (
    <>
      <PageHeader eyebrow="Owner panel" title="Overview" subtitle="Every club on Boost Huddle at a glance." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Clubs" value={clubs.total} hint={`${data.newClubs30d} new in 30 days`} />
        <Stat label="Monthly income" value={formatMoney(money.monthlyRecurringPence)} hint={plural(money.payingClubs, 'paying club')} tone="brand" />
        <Stat label="On trial" value={clubs.trial} hint={`${formatMoney(money.trialPipelinePence)} a month if they all pay`} tone="amber" />
        <Stat label="Members" value={data.members} hint={`${plural(data.players, 'player')} · ${plural(data.liveMatches7d, 'live match', 'live matches')} this week`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle icon="sparkles">Newest clubs</CardTitle>
          {data.recentSignups.length ? (
            <ul className="divide-y divide-border">
              {data.recentSignups.map((c) => (
                <li key={c.id}>
                  <Link href={`/owner/clubs/${c.id}`} className="flex items-center justify-between gap-3 py-3 min-h-12 group">
                    <span className="min-w-0">
                      <span className="block font-bold text-foreground truncate group-hover:text-brand">{c.name}</span>
                      <span className="block text-xs text-muted">Joined {ago(c.createdAt)} · {c.plan === 'pro' ? 'Pro' : 'Starter'}</span>
                    </span>
                    <StatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <InlineEmpty>No clubs yet. New clubs show here as soon as they sign up.</InlineEmpty>}
        </Card>

        <Card>
          <CardTitle icon="calendar">Trials ending this week</CardTitle>
          {data.trialsEndingSoon.length ? (
            <ul className="divide-y divide-border">
              {data.trialsEndingSoon.map((t) => (
                <li key={t.id}>
                  <Link href={`/owner/clubs/${t.id}`} className="flex items-center justify-between gap-3 py-3 min-h-12 group">
                    <span className="font-bold text-foreground truncate group-hover:text-brand">{t.name}</span>
                    <span className="text-xs font-bold text-amber-300 whitespace-nowrap">Ends {formatDate(t.trialEndsAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <InlineEmpty>No trials end in the next 7 days.</InlineEmpty>}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle icon="chart">Clubs by status</CardTitle>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {(['active', 'trial', 'suspended', 'cancelled'] as const).map((s) => (
              <Link key={s} href={`/owner/clubs?status=${s}`} className="flex items-center justify-between gap-3 px-3 min-h-11 bg-surface-raised border border-border chamfer-sm hover:border-brand/60 transition-colors">
                <StatusBadge status={s} />
                <span className="font-display text-xl font-extrabold tabular-nums text-foreground">{clubs[s]}</span>
              </Link>
            ))}
            <span className="flex items-center justify-between gap-3 px-3 min-h-11 bg-surface-raised border border-border chamfer-sm">
              <StatusBadge status="active" comped />
              <span className="font-display text-xl font-extrabold tabular-nums text-foreground">{clubs.comped}</span>
            </span>
          </div>
          {!money.stripeConnected ? (
            <p className="flex items-start gap-2 text-xs text-muted mt-4">
              <Icon name="info" className="w-4 h-4 shrink-0" />
              Card payments aren&apos;t switched on yet (Stripe isn&apos;t connected), so monthly income is what clubs on each plan would pay.
            </p>
          ) : null}
        </Card>
      </div>
    </>
  );
}
