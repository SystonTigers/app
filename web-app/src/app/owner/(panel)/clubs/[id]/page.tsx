'use client';

import Link from 'next/link';
import { use } from 'react';
import { PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { ownerApi } from '@/lib/owner/client';
import { ago, paymentText, rolesText, trialText } from '@/lib/owner/format';
import ClubActions from '@/components/owner/ClubActions';
import { Card, CardTitle, ClubMark, ErrorBox, InlineEmpty, Item, Loading, Stat, StatusBadge, useLoad } from '@/components/owner/ui';

function BackLink() {
  return (
    <Link href="/owner/clubs" className="inline-flex items-center gap-2 min-h-10 mb-2 text-sm font-bold uppercase tracking-wider text-muted hover:text-brand">
      <Icon name="arrowLeft" className="w-4 h-4" />
      All clubs
    </Link>
  );
}

export default function OwnerClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: club, setData, error, loading, reload } = useLoad(() => ownerApi.club(id), [id]);

  if (loading && !club) return <Loading label="Loading club…" />;
  if (error && !club) return <><BackLink /><ErrorBox message={error} onRetry={reload} /></>;
  if (!club) return null;

  const connections = [club.youtube && 'YouTube', club.facebook && 'Facebook', club.instagram && 'Instagram'].filter(Boolean) as string[];
  const trialSoon = club.status === 'trial' && (club.trialDaysLeft ?? 99) <= 3;

  return (
    <>
      <BackLink />
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <ClubMark name={club.name} badgeUrl={club.badgeUrl} color={club.color} size={48} />
            <span className="min-w-0">{club.name}</span>
          </span>
        }
        subtitle={<span className="break-all">{club.ownerEmail} · joined {formatDate(club.createdAt) || 'date not known'}</span>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold uppercase tracking-wider text-muted">{club.planName} · {formatMoney(club.monthlyPence)} a month</span>
            <StatusBadge status={club.status} comped={club.comped} />
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Members" value={club.members} hint={`${club.staff} staff`} />
        <Stat label="Players" value={club.players} hint={`${club.consent.answered} of ${club.consent.players} answered consent`} />
        <Stat label="Matches played" value={club.fixtures.played} hint={`${club.fixtures.upcoming} coming up · ${club.liveMatches} live`} />
        {club.status === 'trial' && club.trialDaysLeft !== null ? (
          <Stat label="Trial" value={`${Math.max(0, club.trialDaysLeft)} days`} hint={trialText(club.trialDaysLeft)} tone={trialSoon ? 'amber' : 'plain'} />
        ) : (
          <Stat label="Last active" value={<span className="text-2xl sm:text-3xl">{ago(club.lastActiveAt)}</span>} />
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_22rem] gap-4">
        <div className="space-y-4 min-w-0">
          <ClubActions club={club} onChanged={setData} />

          <Card>
            <CardTitle icon="users">Staff</CardTitle>
            {club.staffList.length ? (
              <ul className="divide-y divide-border">
                {club.staffList.map((s) => (
                  <li key={s.email} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                    <span className="min-w-0">
                      <span className="block text-foreground break-all">{s.email}</span>
                      <span className="block text-xs font-bold uppercase tracking-wider text-brand">{rolesText(s.roles)}</span>
                    </span>
                    <span className="text-xs text-muted whitespace-nowrap">Last logged in: {ago(s.lastLoginAt)}</span>
                  </li>
                ))}
              </ul>
            ) : <InlineEmpty>No staff accounts yet.</InlineEmpty>}
          </Card>
        </div>

        <div className="space-y-4 min-w-0">
          <Card>
            <CardTitle icon="settings">Set up</CardTitle>
            <dl className="text-sm divide-y divide-border">
              <Item label="Web address"><Link href={`/${club.slug}`} className="text-brand hover:underline break-all">/{club.slug}</Link></Item>
              <Item label="Social accounts">{connections.length ? connections.join(', ') : 'None connected'}</Item>
              <Item label="Phones with alerts on">{club.pushDevices}</Item>
              <Item label="Graphics style">{club.graphicsPack ? club.graphicsPack[0].toUpperCase() + club.graphicsPack.slice(1) : 'Default'}</Item>
              <Item label="Payments">{paymentText(club.subscriptionStatus)}</Item>
            </dl>
          </Card>

          <Card>
            <CardTitle icon="history">Changes from this panel</CardTitle>
            {club.history.length ? (
              <ul className="divide-y divide-border">
                {club.history.map((h, i) => (
                  <li key={`${h.at}-${i}`} className="py-2.5 text-sm">
                    <div className="text-foreground">{h.detail ?? h.action}</div>
                    <div className="text-xs text-muted">{formatDateTime(h.at)}{h.by ? ` · ${h.by}` : ''}</div>
                  </li>
                ))}
              </ul>
            ) : <InlineEmpty>Nothing changed yet. Changes you make above show here.</InlineEmpty>}
          </Card>
        </div>
      </div>
    </>
  );
}
