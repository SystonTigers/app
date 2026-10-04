'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyNote, PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/lib/format';
import { ownerApi } from '@/lib/owner/client';
import { ago, rolesText } from '@/lib/owner/format';
import type { OwnerMember } from '@/lib/owner/types';
import { ErrorBox, Loading } from '@/components/owner/ui';

const LIMIT = 50;

export default function OwnerMembersPage() {
  const [q, setQ] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [rows, setRows] = useState<OwnerMember[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const term = q.trim();

  useEffect(() => {
    if (term.length < 3) { setRows(null); setError(''); setLoading(false); return; }
    let stale = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const found = await ownerApi.members(term);
        if (!stale) setRows(found);
      } catch (err) {
        if (!stale) setError(err instanceof Error ? err.message : "The search didn't work. Please try again.");
      } finally {
        if (!stale) setLoading(false);
      }
    }, 300);
    return () => { stale = true; clearTimeout(t); };
  }, [term, attempt]);

  return (
    <>
      <PageHeader eyebrow="Owner panel" title="Members" subtitle="Find anyone who has signed up, in any club, by their email." />

      <div className="max-w-md mb-6">
        <label htmlFor="member-search" className="label">Email</label>
        <div className="relative">
          <Icon name="search" className="z-10 w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="member-search"
            type="search"
            inputMode="email"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="At least 3 letters of their email"
            className="field chamfer-sm pl-10"
            autoFocus
          />
        </div>
        <p className="mt-1.5 text-xs text-muted" role="status" aria-live="polite">
          {loading ? 'Searching…' : rows ? `${rows.length === LIMIT ? `First ${LIMIT}` : rows.length} found` : ''}
        </p>
      </div>

      {error ? <ErrorBox message={error} onRetry={() => setAttempt((n) => n + 1)} /> : null}
      {loading && !rows ? <Loading label="Searching…" /> : null}

      {!rows && !loading && !error ? (
        <EmptyNote icon="search" title="Find a member">
          Type at least 3 letters of their email. You&apos;ll see every club they belong to and when they last logged in.
        </EmptyNote>
      ) : null}

      {rows && !rows.length ? (
        <EmptyNote icon="users" title="Nobody found">
          No account has an email with &ldquo;{term}&rdquo; in it. Check the spelling, or try part of it.
        </EmptyNote>
      ) : null}

      {rows?.length ? (
        <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {/* Phones: one card per person */}
          <ul className="sm:hidden space-y-2">
            {rows.map((m) => (
              <li key={`${m.clubId}:${m.email}`} className="card p-4">
                <div className="text-foreground font-bold break-all">{m.email}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <Link href={`/owner/clubs/${m.clubId}`} className="text-brand font-bold hover:underline">{m.clubName}</Link>
                  <span className="text-muted" aria-hidden="true">·</span>
                  <span className="text-foreground">{rolesText(m.roles)}</span>
                </div>
                <div className="mt-2 text-xs text-muted">
                  Joined {formatDate(m.joinedAt) || 'date not known'} · Last logged in: {ago(m.lastLoginAt)}
                </div>
              </li>
            ))}
          </ul>

          {/* Wider screens: a table */}
          <div className="hidden sm:block card p-0">
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
                    <th scope="col" className="p-4 font-bold">Email</th>
                    <th scope="col" className="p-4 font-bold">Club</th>
                    <th scope="col" className="p-4 font-bold">Role</th>
                    <th scope="col" className="p-4 font-bold">Joined</th>
                    <th scope="col" className="p-4 font-bold">Last logged in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((m) => (
                    <tr key={`${m.clubId}:${m.email}`} className="hover:bg-surface-raised">
                      <td className="p-4 text-foreground break-all">{m.email}</td>
                      <td className="p-4"><Link href={`/owner/clubs/${m.clubId}`} className="text-brand font-bold hover:underline">{m.clubName}</Link></td>
                      <td className="p-4 text-foreground">{rolesText(m.roles)}</td>
                      <td className="p-4 text-muted whitespace-nowrap">{formatDate(m.joinedAt) || '—'}</td>
                      <td className="p-4 text-muted whitespace-nowrap">{ago(m.lastLoginAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {rows.length === LIMIT ? <p className="mt-3 text-xs text-muted">Showing the first {LIMIT}. Type more of the email to narrow it down.</p> : null}
        </div>
      ) : null}
    </>
  );
}
