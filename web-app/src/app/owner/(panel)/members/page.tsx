'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ownerApi } from '@/lib/owner/client';
import { ago, rolesText, shortDate } from '@/lib/owner/format';
import type { OwnerMember } from '@/lib/owner/types';
import { Empty, ErrorBox, Loading, PageTitle, inputClass } from '@/components/owner/ui';

export default function OwnerMembersPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<OwnerMember[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) { setRows(null); setError(''); return; }
    let stale = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const found = await ownerApi.members(term);
        if (!stale) setRows(found);
      } catch (err) {
        if (!stale) setError(err instanceof Error ? err.message : 'Search failed.');
      } finally {
        if (!stale) setLoading(false);
      }
    }, 300);
    return () => { stale = true; clearTimeout(t); };
  }, [q]);

  return (
    <>
      <PageTitle title="Members" sub="Find anyone who has signed up, in any club, by their email." />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 3 letters of an email" aria-label="Search members by email" className={`${inputClass} max-w-md mb-5`} autoFocus />
      {error ? <ErrorBox message={error} /> : null}
      {loading && !rows ? <Loading label="Searching…" /> : null}
      {rows && !rows.length ? <Empty>Nobody found.</Empty> : null}
      {rows?.length ? (
        <div className="overflow-x-auto bg-gray-900/60 border border-gray-800 chamfer-lg">
          <table className="w-full text-sm min-w-[36rem]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-800">
                <th className="p-3 font-bold">Email</th>
                <th className="p-3 font-bold">Club</th>
                <th className="p-3 font-bold">Role</th>
                <th className="p-3 font-bold">Joined</th>
                <th className="p-3 font-bold">Last signed in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rows.map((m) => (
                <tr key={`${m.clubId}:${m.email}`}>
                  <td className="p-3 text-white break-all">{m.email}</td>
                  <td className="p-3"><Link href={`/owner/clubs/${m.clubId}`} className="text-brand no-underline hover:underline">{m.clubName}</Link></td>
                  <td className="p-3 text-gray-300 whitespace-nowrap">{rolesText(m.roles)}</td>
                  <td className="p-3 text-gray-400 whitespace-nowrap">{shortDate(m.joinedAt)}</td>
                  <td className="p-3 text-gray-400 whitespace-nowrap">{ago(m.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 50 ? <p className="p-3 text-xs text-gray-500">Showing the first 50. Type more of the email to narrow it down.</p> : null}
        </div>
      ) : null}
    </>
  );
}
