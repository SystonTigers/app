'use client';

import Link from 'next/link';
import { use } from 'react';
import { ownerApi } from '@/lib/owner/client';
import { ago, dateTime, pounds, rolesText, shortDate, trialText } from '@/lib/owner/format';
import ClubActions from '@/components/owner/ClubActions';
import { Card, CardTitle, Empty, ErrorBox, Loading, PageTitle, Stat, StatusBadge, useLoad } from '@/components/owner/ui';

export default function OwnerClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: club, setData, error, loading, reload } = useLoad(() => ownerApi.club(id), [id]);

  if (loading && !club) return <Loading />;
  if (error && !club) return <ErrorBox message={error} onRetry={reload} />;
  if (!club) return null;

  const connections = [club.youtube && 'YouTube', club.facebook && 'Facebook', club.instagram && 'Instagram'].filter(Boolean) as string[];

  return (
    <>
      <Link href="/owner/clubs" className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-brand no-underline">← All clubs</Link>
      <div className="mt-3">
        <PageTitle
          title={club.name}
          sub={`${club.ownerEmail} · joined ${shortDate(club.createdAt)}`}
          right={<div className="flex items-center gap-2"><span className="text-xs font-bold uppercase tracking-wider text-gray-300">{club.planName} · {pounds(club.monthlyPence)}/month</span><StatusBadge status={club.status} comped={club.comped} /></div>}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Members" value={club.members} hint={`${club.staff} staff`} />
        <Stat label="Players" value={club.players} hint={`${club.consent.answered}/${club.consent.players} consent answered`} />
        <Stat label="Matches" value={club.fixtures.played} hint={`${club.fixtures.upcoming} coming up · ${club.liveMatches} live`} />
        <Stat
          label={club.status === 'trial' ? 'Trial' : 'Last active'}
          value={club.status === 'trial' && club.trialDaysLeft !== null ? `${Math.max(0, club.trialDaysLeft)}d` : ago(club.lastActiveAt)}
          hint={club.status === 'trial' ? trialText(club.trialDaysLeft) : undefined}
          tone={club.status === 'trial' && (club.trialDaysLeft ?? 99) <= 3 ? 'amber' : 'white'}
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_22rem] gap-4">
        <div className="space-y-4 min-w-0">
          <ClubActions club={club} onChanged={setData} />

          <Card>
            <CardTitle>Staff</CardTitle>
            {club.staffList.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                      <th className="py-2 pr-3 font-bold">Email</th>
                      <th className="py-2 pr-3 font-bold">Role</th>
                      <th className="py-2 font-bold">Last signed in</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {club.staffList.map((s) => (
                      <tr key={s.email}>
                        <td className="py-2 pr-3 text-white break-all">{s.email}</td>
                        <td className="py-2 pr-3 text-gray-300 whitespace-nowrap">{rolesText(s.roles)}</td>
                        <td className="py-2 text-gray-400 whitespace-nowrap">{ago(s.lastLoginAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty>No staff accounts.</Empty>}
          </Card>
        </div>

        <div className="space-y-4 min-w-0">
          <Card>
            <CardTitle>Set up</CardTitle>
            <dl className="text-sm space-y-2">
              <Item label="Web address">/{club.slug}</Item>
              <Item label="Social accounts">{connections.length ? connections.join(', ') : 'None connected'}</Item>
              <Item label="Devices with alerts on">{club.pushDevices}</Item>
              <Item label="Graphics style">{club.graphicsPack ? club.graphicsPack[0].toUpperCase() + club.graphicsPack.slice(1) : 'Default'}</Item>
              <Item label="Payments">{club.subscriptionStatus ?? 'Not set up'}</Item>
            </dl>
          </Card>

          <Card>
            <CardTitle>Changes by the owner</CardTitle>
            {club.history.length ? (
              <ul className="space-y-2.5">
                {club.history.map((h, i) => (
                  <li key={`${h.at}-${i}`} className="text-sm">
                    <div className="text-white">{h.detail ?? h.action}</div>
                    <div className="text-xs text-gray-500">{dateTime(h.at)}{h.by ? ` · ${h.by}` : ''}</div>
                  </li>
                ))}
              </ul>
            ) : <Empty>Nothing changed yet.</Empty>}
          </Card>
        </div>
      </div>
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-white text-right">{children}</dd>
    </div>
  );
}
