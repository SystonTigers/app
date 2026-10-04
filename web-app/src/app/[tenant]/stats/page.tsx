import Link from 'next/link';
import type { ReactNode } from 'react';
import { getServerSDK } from '@/lib/sdk';
import { findClub } from '@/lib/club';
import { AnimatedCounter } from '@/components/ui';
import { FunStatsCard } from '@/components/FunStatsCard';
import { EmptyNote, PageHeader } from '@/components/ui/Page';
import { Icon, type IconName } from '@/components/ui/Icon';

interface RankedPlayer {
  id?: string;
  name?: string;
  stats?: { goals?: unknown; assists?: unknown };
}

const num = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : Number(v) || 0);

function readTeamStats(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    played: num(r.played),
    won: num(r.won),
    drawn: num(r.drawn),
    lost: num(r.lost),
    goalsFor: num(r.goalsFor),
    goalsAgainst: num(r.goalsAgainst),
    cleanSheets: num(r.cleanSheets),
  };
}

function rankedList(raw: unknown, key: 'goals' | 'assists'): RankedPlayer[] {
  return (Array.isArray(raw) ? (raw as RankedPlayer[]) : []).filter((p) => p && p.name && num(p.stats?.[key]) > 0);
}

export default async function StatsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const sdk = getServerSDK(tenant);

  // Clubs that don't record assists only see top goalscorers
  const club = await findClub(tenant);
  const withAssists = club?.trackAssists !== false;
  const [rawStats, rawScorers, rawAssists] = await Promise.all([
    sdk.getTeamStats().catch(() => null),
    sdk.getTopScorers(10).catch(() => []),
    withAssists ? sdk.getTopAssists(10).catch(() => []) : Promise.resolve([]),
  ]);

  const stats = readTeamStats(rawStats);
  const hasTeamStats = !!stats && stats.played > 0;
  const scorers = rankedList(rawScorers, 'goals');
  const assisters = rankedList(rawAssists, 'assists');

  return (
    <div className="container py-8 md:py-12 space-y-10">
      <PageHeader eyebrow="Numbers" title="Stats" subtitle={withAssists ? "How the season is going, and who's scoring and setting them up." : "How the season is going, and who's scoring."} />

      <section aria-labelledby="season-overview">
        <h2 id="season-overview" className="text-2xl italic mb-4">This season</h2>
        {hasTeamStats && stats ? (
          <div className="card">
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Played', value: stats.played },
                { label: 'Won', value: stats.won, accent: true },
                { label: 'Goals scored', value: stats.goalsFor },
                { label: 'Clean sheets', value: stats.cleanSheets },
              ].map((s) => (
                <div key={s.label} className="bg-surface-raised border border-border chamfer-sm p-4 text-center flex flex-col-reverse">
                  <dt className="text-xs font-bold text-muted uppercase tracking-wider">{s.label}</dt>
                  <dd className={`font-display text-4xl font-extrabold ${s.accent ? 'text-brand' : ''}`}>
                    <AnimatedCounter value={s.value} />
                  </dd>
                </div>
              ))}
            </dl>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              {[
                { label: 'Drawn', value: String(stats.drawn) },
                { label: 'Lost', value: String(stats.lost) },
                { label: 'Goals conceded', value: String(stats.goalsAgainst) },
                { label: 'Win rate', value: `${Math.round((stats.won / stats.played) * 100)}%` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-3 border-b border-border">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="font-bold">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <EmptyNote icon="chart" title="No stats yet" action={<Link href={`/${tenant}/fixtures`} className="btn btn-secondary">See fixtures</Link>}>
            The season&apos;s numbers show here after the first result is in.
          </EmptyNote>
        )}
      </section>

      <FunStatsCard tenant={tenant} />

      {(scorers.length > 0 || assisters.length > 0) && (
        <div className={`grid grid-cols-1 gap-6 ${withAssists ? 'md:grid-cols-2' : 'max-w-2xl'}`}>
          <Leaderboard title="Top scorers" icon="ball" empty="No goals recorded yet.">
            {scorers.map((p, i) => (
              <PlayerStatRow key={p.id ?? p.name} tenant={tenant} id={p.id} rank={i + 1} name={String(p.name)} stat={num(p.stats?.goals)} unit="goals" />
            ))}
          </Leaderboard>
          {withAssists && (
            <Leaderboard title="Most assists" icon="target" empty="No assists recorded yet.">
              {assisters.map((p, i) => (
                <PlayerStatRow key={p.id ?? p.name} tenant={tenant} id={p.id} rank={i + 1} name={String(p.name)} stat={num(p.stats?.assists)} unit="assists" />
              ))}
            </Leaderboard>
          )}
        </div>
      )}
    </div>
  );
}

function Leaderboard({ title, icon, empty, children }: { title: string; icon: IconName; empty: string; children: ReactNode[] }) {
  return (
    <section className="card">
      <h2 className="text-2xl italic mb-4 flex items-center gap-2">
        <Icon name={icon} className="w-6 h-6 text-brand" /> {title}
      </h2>
      {children.length ? <ol className="space-y-2">{children}</ol> : <p className="text-muted">{empty}</p>}
    </section>
  );
}

function PlayerStatRow({ tenant, id, rank, name, stat, unit }: { tenant: string; id?: string; rank: number; name: string; stat: number; unit: string }) {
  const top = rank === 1;
  const body = (
    <>
      <span className={`w-9 h-9 shrink-0 hexagon flex items-center justify-center font-display text-lg font-extrabold ${top ? 'bg-brand-foreground text-brand' : 'bg-background text-muted'}`}>
        {rank}
      </span>
      <span className="flex-1 font-bold min-w-0 break-words">{name}</span>
      <span className="font-display text-2xl font-extrabold tabular-nums">
        {stat}<span className="sr-only"> {unit}</span>
      </span>
    </>
  );
  const className = `flex items-center gap-3 p-3 chamfer-sm min-h-[48px] transition-colors ${top ? 'bg-brand text-brand-foreground' : 'bg-surface-raised hover:text-brand'}`;
  return (
    <li>
      {id ? <Link href={`/${tenant}/squad/${id}`} className={className}>{body}</Link> : <div className={className}>{body}</div>}
    </li>
  );
}
