'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { isClubTeam } from '@/lib/slug';
import { PublicSeasonTabs } from '@/components/PublicSeasonTabs';
import { FaFullTimeEmbed, useFaSnippets } from '@/components/FaFullTimeEmbed';
import { EmptyNote, PageHeader } from '@/components/ui/Page';
import { API_BASE } from '@/lib/session';

interface TableRow {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

const COLUMNS: Array<{ key: keyof TableRow; label: string; title: string; hide?: string }> = [
  { key: 'played', label: 'P', title: 'Played' },
  { key: 'won', label: 'W', title: 'Won', hide: 'hidden sm:table-cell' },
  { key: 'drawn', label: 'D', title: 'Drawn', hide: 'hidden sm:table-cell' },
  { key: 'lost', label: 'L', title: 'Lost', hide: 'hidden sm:table-cell' },
  { key: 'goalsFor', label: 'F', title: 'Goals for', hide: 'hidden md:table-cell' },
  { key: 'goalsAgainst', label: 'A', title: 'Goals against', hide: 'hidden md:table-cell' },
  { key: 'goalDifference', label: 'GD', title: 'Goal difference' },
];

export default function TablePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = use(params);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [table, setTable] = useState<TableRow[]>([]);
  const [source, setSource] = useState('manual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { snippets, loaded: faLoaded } = useFaSnippets(tenant);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : '';
      const res = await fetch(`${API_BASE}/public/${encodeURIComponent(tenant)}/table${query}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`table ${res.status}`);
      const body = await res.json();
      setTable(Array.isArray(body?.data) ? body.data : []);
      setSource(body?.meta?.source || 'manual');
    } catch (err) {
      console.error('Failed to load table:', err);
      setError("We couldn't load the league table. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [tenant, seasonId]);

  useEffect(() => {
    load();
  }, [load]);

  const faOnly = !loading && !error && table.length === 0 && faLoaded && !!snippets.table;

  return (
    <div className="container py-8 md:py-12">
      <PageHeader eyebrow="League" title="League table" subtitle="Where we stand this season." />

      {!faOnly && (
        <>
          <PublicSeasonTabs tenant={tenant} onSeasonChange={setSeasonId} currentSeasonId={seasonId} />

          {loading ? (
            <div className="card space-y-3" aria-busy="true" aria-label="Loading the table">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-surface-raised animate-pulse" />)}
            </div>
          ) : error ? (
            <EmptyNote icon="alert" title="The table didn't load" action={<button type="button" onClick={load} className="btn btn-primary">Try again</button>}>
              <p role="alert">{error}</p>
            </EmptyNote>
          ) : table.length === 0 ? (
            <EmptyNote icon="table" title="No table yet" action={<Link href={`/${tenant}/results`} className="btn btn-secondary">See results</Link>}>
              The league table shows here once the club adds the league&apos;s results.
            </EmptyNote>
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="table-scroll">
                <table className="w-full text-sm">
                  <caption className="sr-only">League table</caption>
                  <thead>
                    <tr className="bg-surface-raised border-b border-border text-xs font-bold uppercase tracking-wider text-muted">
                      <th scope="col" className="py-3 pl-4 pr-2 text-left w-12">#</th>
                      <th scope="col" className="py-3 px-2 text-left">Team</th>
                      {COLUMNS.map((c) => (
                        <th key={c.key} scope="col" className={`py-3 px-2 text-center w-10 ${c.hide ?? ''}`}>
                          <abbr title={c.title} className="no-underline">{c.label}</abbr>
                        </th>
                      ))}
                      <th scope="col" className="py-3 pl-2 pr-4 text-center w-12 text-foreground"><abbr title="Points" className="no-underline">Pts</abbr></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {table.map((row) => {
                      const ours = isClubTeam(row.team, tenant);
                      return (
                        <tr key={`${row.position}-${row.team}`} className={ours ? 'bg-brand/10' : ''}>
                          <td className={`py-3.5 pl-4 pr-2 font-display text-lg font-bold ${ours ? 'text-brand' : 'text-muted'}`}>{row.position}</td>
                          <td className="py-3.5 px-2 font-bold">
                            <span className="flex items-center gap-2">
                              {ours && <span className="w-2 h-2 shrink-0 rotate-45 bg-brand" aria-hidden="true" />}
                              <span className={ours ? 'text-brand' : ''}>{row.team}</span>
                            </span>
                          </td>
                          {COLUMNS.map((c) => (
                            <td key={c.key} className={`py-3.5 px-2 text-center text-muted tabular-nums ${c.hide ?? ''}`}>
                              {c.key === 'goalDifference' && row.goalDifference > 0 ? '+' : ''}{row[c.key]}
                            </td>
                          ))}
                          <td className="py-3.5 pl-2 pr-4 text-center font-display text-xl font-extrabold tabular-nums">{row.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !error && table.length > 0 && (source === 'results' || source === 'table') && (
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">Sorted by points, then goal difference, then goals scored</p>
          )}
        </>
      )}

      {faLoaded && snippets.table && (
        <div className="mt-12">
          <FaFullTimeEmbed code={snippets.table} title="Official league table" highlight={tenant.split('-')[0]} />
        </div>
      )}
    </div>
  );
}
