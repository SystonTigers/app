'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isClubTeam } from '@/lib/slug';
import { PublicSeasonTabs } from '@/components/PublicSeasonTabs';
import { FaFullTimeEmbed, useFaSnippets } from '@/components/FaFullTimeEmbed';
import { EmptyNote, PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { useUserRole } from '@/hooks/useUserRole';
import { API_BASE, apiFetch, errorMessage } from '@/lib/session';
import { formatDate } from '@/lib/format';

interface Result {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  competition?: string | null;
  homeScore: number;
  awayScore: number;
  scorers?: string[];
}

interface DiscussionSummary {
  id: string;
  related_entity_id?: string | null;
}

type Outcome = 'win' | 'draw' | 'loss' | null;

function outcomeFor(r: Result, tenant: string): Outcome {
  const home = isClubTeam(r.homeTeam, tenant);
  const away = isClubTeam(r.awayTeam, tenant);
  if (!home && !away) return null;
  if (r.homeScore === r.awayScore) return 'draw';
  const weWon = home ? r.homeScore > r.awayScore : r.awayScore > r.homeScore;
  return weWon ? 'win' : 'loss';
}

const OUTCOME: Record<Exclude<Outcome, null>, { label: string; className: string }> = {
  win: { label: 'W', className: 'bg-brand text-brand-foreground' },
  draw: { label: 'D', className: 'bg-surface-raised text-foreground border border-border' },
  loss: { label: 'L', className: 'bg-red-500/15 text-red-400 border border-red-500/40' },
};

function ResultCard({ result, tenant, canTalk, busy, onTalk }: { result: Result; tenant: string; canTalk: boolean; busy: boolean; onTalk: (r: Result) => void }) {
  const outcome = outcomeFor(result, tenant);
  return (
    <li className="card p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4 text-xs font-bold uppercase tracking-wider">
        <span className="text-brand">{result.competition || 'Match'}</span>
        <span className="text-muted">{formatDate(result.date)}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <h3 className="font-display text-lg md:text-2xl font-extrabold uppercase italic leading-tight text-right break-words">{result.homeTeam}</h3>
        <div className="flex flex-col items-center">
          <span className="font-display text-4xl md:text-5xl font-extrabold tabular-nums bg-surface-raised border border-border chamfer-sm px-4 py-1">
            {result.homeScore}&ndash;{result.awayScore}
          </span>
          <span className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-muted">Full time</span>
        </div>
        <h3 className="font-display text-lg md:text-2xl font-extrabold uppercase italic leading-tight break-words">{result.awayTeam}</h3>
      </div>

      {(result.scorers?.length || outcome || canTalk) ? (
        <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {outcome && (
              <span className={`w-8 h-8 shrink-0 hexagon flex items-center justify-center font-display font-extrabold ${OUTCOME[outcome].className}`} title={outcome === 'win' ? 'Won' : outcome === 'draw' ? 'Drew' : 'Lost'}>
                {OUTCOME[outcome].label}
              </span>
            )}
            {result.scorers && result.scorers.length > 0 && (
              <p className="text-sm text-muted flex items-start gap-1.5 min-w-0">
                <Icon name="ball" className="w-4 h-4 mt-0.5 text-brand" />
                <span className="break-words"><span className="sr-only">Scorers: </span>{result.scorers.join(', ')}</span>
              </p>
            )}
          </div>
          {canTalk && (
            <button type="button" onClick={() => onTalk(result)} disabled={busy} className="btn btn-secondary btn-sm min-h-[40px]">
              <Icon name="chat" className="w-4 h-4" /> {busy ? 'Opening…' : 'Talk about it'}
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}

export default function ResultsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = use(params);
  const router = useRouter();
  const { role, isLoggedIn } = useUserRole();
  const [seasonId, setSeasonId] = useState<string | null>(null);
  // FA Full-Time snippets only show the season happening now (null = All time)
  const [faApplies, setFaApplies] = useState(true);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [talkError, setTalkError] = useState('');
  const [opening, setOpening] = useState<string | null>(null);
  const { snippets } = useFaSnippets(tenant);

  // Match chats live in Team Talk, which fans can't use
  const canTalk = isLoggedIn && role !== 'fan';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = seasonId ? `&seasonId=${encodeURIComponent(seasonId)}` : '';
      const res = await fetch(`${API_BASE}/public/${encodeURIComponent(tenant)}/fixtures?status=results${query}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`results ${res.status}`);
      const body = await res.json();
      setResults(Array.isArray(body?.data) ? body.data : []);
    } catch (err) {
      console.error('Failed to load results:', err);
      setError("We couldn't load the results. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [tenant, seasonId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Open the match's chat in Team Talk, starting it if nobody has yet. */
  async function talkAbout(result: Result) {
    setOpening(result.id);
    setTalkError('');
    try {
      const listRes = await apiFetch('/api/v1/discussions?category=match-analysis&limit=100');
      if (listRes.ok) {
        const body = await listRes.json();
        const existing = (Array.isArray(body?.data) ? (body.data as DiscussionSummary[]) : []).find((d) => d.related_entity_id === result.id);
        if (existing) {
          router.push(`/${tenant}/team/discussions/${existing.id}`);
          return;
        }
      }
      const res = await apiFetch('/api/v1/discussions', {
        method: 'POST',
        body: JSON.stringify({
          title: `${result.homeTeam} ${result.homeScore}-${result.awayScore} ${result.awayTeam}`,
          category: 'match-analysis',
          related_entity_type: 'match',
          related_entity_id: result.id,
        }),
      });
      if (!res.ok) {
        setTalkError(await errorMessage(res, "We couldn't start the chat for that match. Please try again."));
        return;
      }
      const body = await res.json();
      router.push(`/${tenant}/team/discussions/${body.data.id}`);
    } catch (err) {
      console.error('Failed to open match chat:', err);
      setTalkError("We couldn't start the chat for that match. Check your connection and try again.");
    } finally {
      setOpening(null);
    }
  }

  const sorted = [...results].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="container py-8 md:py-12">
      <PageHeader eyebrow="Matches" title="Results" subtitle="Scores and goalscorers from every game this season." />

      <PublicSeasonTabs tenant={tenant} onSeasonChange={(id, isCurrent) => { setSeasonId(id); setFaApplies(id === null || isCurrent); }} currentSeasonId={seasonId} />

      {talkError && (
        <p role="alert" className="card border-red-500/40 text-red-300 mb-6 py-4">{talkError}</p>
      )}

      {loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading results">
          {[1, 2, 3].map((i) => <div key={i} className="h-44 card animate-pulse" />)}
        </div>
      ) : error ? (
        <EmptyNote icon="alert" title="Results didn't load" action={<button type="button" onClick={load} className="btn btn-primary">Try again</button>}>
          <p role="alert">{error}</p>
        </EmptyNote>
      ) : sorted.length === 0 ? (
        faApplies && snippets.team ? (
          <FaFullTimeEmbed code={snippets.team} title="Our fixtures and results" />
        ) : (
          <EmptyNote icon="trophy" title="No results yet" action={<Link href={`/${tenant}/fixtures`} className="btn btn-secondary">See fixtures</Link>}>
            Scores show here after each game, straight from the touchline.
          </EmptyNote>
        )
      ) : (
        <ul className="space-y-4">
          {sorted.map((r) => (
            <ResultCard key={r.id} result={r} tenant={tenant} canTalk={canTalk} busy={opening === r.id} onTalk={talkAbout} />
          ))}
        </ul>
      )}

      {faApplies && snippets.results && (
        <div className="mt-12">
          <FaFullTimeEmbed code={snippets.results} title="Around the league" highlight={tenant.split('-')[0]} />
        </div>
      )}
    </div>
  );
}
