'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicSeasonTabs } from '@/components/PublicSeasonTabs';
import { FaFullTimeEmbed, useFaSnippets } from '@/components/FaFullTimeEmbed';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { EmptyNote, PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { getLiveMatches, type LiveMatch } from '@/lib/club';
import { API_BASE } from '@/lib/session';
import { formatDate, formatLongDate } from '@/lib/format';
import { fixtureState, kickOffText, liveMatchFor, type FixtureState, type PublicFixture } from '@/lib/fixtures';

function TeamName({ name, align = 'left' }: { name: string; align?: 'left' | 'right' }) {
  return (
    <span className={`flex flex-col items-center gap-3 min-w-0 ${align === 'right' ? 'md:items-end' : 'md:items-start'}`}>
      <span className="w-16 h-16 md:w-20 md:h-20 hexagon bg-surface-raised border border-border flex items-center justify-center font-display text-3xl font-extrabold text-brand" aria-hidden="true">
        {name.trim()[0]?.toUpperCase() ?? '?'}
      </span>
      <span className="font-display text-xl md:text-3xl font-extrabold uppercase italic leading-tight text-center break-words">{name}</span>
    </span>
  );
}

function NextMatchCard({ fixture }: { fixture: PublicFixture }) {
  const time = kickOffText(fixture);
  return (
    <section className="card hex-grid p-6 md:p-10 mb-10" aria-labelledby="next-match-title">
      <p id="next-match-title" className="inline-block px-3 py-1 bg-brand text-brand-foreground font-display font-bold uppercase tracking-wider text-sm chamfer-sm mb-6">
        Next match · {fixture.competition || 'League'}
      </p>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-8">
        <TeamName name={fixture.homeTeam} />
        <span className="font-display text-3xl md:text-5xl font-extrabold italic text-muted">v</span>
        <TeamName name={fixture.awayTeam} align="right" />
      </div>

      <div className="mt-8 flex flex-col items-center gap-2 text-center">
        <p className="font-display text-xl md:text-2xl font-bold uppercase tracking-wide">
          {formatLongDate(fixture.date)}{time ? ` · ${time}` : ''}
        </p>
        <p className="text-muted inline-flex items-center gap-2">
          <Icon name="flag" className="w-4 h-4" /> {fixture.venue || 'Venue to be confirmed'}
        </p>
      </div>

      {time && (
        <div className="mt-8 pt-6 border-t border-border flex flex-col items-center">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Kick-off in</p>
          <CountdownTimer targetDate={fixture.date} />
        </div>
      )}
    </section>
  );
}

const STATE_LABEL: Partial<Record<FixtureState, string>> = {
  postponed: 'Postponed',
  cancelled: 'Cancelled',
  awaiting: 'Awaiting result',
};

function FixtureRow({ fixture, state, live }: { fixture: PublicFixture; state: FixtureState; live: LiveMatch | null }) {
  const time = kickOffText(fixture);
  const ourHome = live?.homeAway !== 'away';
  const score = live ? (ourHome ? `${live.ourScore}–${live.theirScore}` : `${live.theirScore}–${live.ourScore}`) : null;
  const label = STATE_LABEL[state];
  return (
    <li className={`card p-4 md:p-5 flex items-center gap-4 ${state === 'live' ? 'border-brand/60' : ''}`}>
      <div className="shrink-0 w-16 text-center bg-surface-raised border border-border chamfer-sm py-2">
        <p className="text-[11px] font-bold uppercase text-muted">{formatDate(fixture.date, { month: 'short' })}</p>
        <p className="font-display text-3xl font-extrabold leading-none">{formatDate(fixture.date, { day: 'numeric' })}</p>
        <p className="text-[11px] font-bold uppercase text-muted">{formatDate(fixture.date, { weekday: 'short' })}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
          {fixture.competition && <span className="text-brand">{fixture.competition}</span>}
          {state === 'live' && (
            <span className="inline-flex items-center gap-1.5 text-brand">
              <span className="w-2 h-2 bg-brand rotate-45 animate-pulse" aria-hidden="true" />
              {live?.status === 'half_time' ? 'Half time' : live?.minute != null ? `Live · ${live.minute}'` : 'Live'}
            </span>
          )}
          {label && <span className={state === 'awaiting' ? 'text-muted' : 'text-red-400'}>{label}</span>}
        </p>
        <h3 className="font-display text-lg md:text-xl font-bold uppercase leading-tight break-words">
          {fixture.homeTeam} <span className="text-muted">{score ?? 'v'}</span> {fixture.awayTeam}
        </h3>
        <p className="mt-1 text-sm text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5"><Icon name="calendar" className="w-4 h-4" />{time || 'Kick-off TBC'}</span>
          {fixture.venue && <span className="inline-flex items-center gap-1.5"><Icon name="flag" className="w-4 h-4" />{fixture.venue}</span>}
        </p>
      </div>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl italic mb-4">{title}</h2>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}

export default function FixturesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = use(params);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  // FA Full-Time snippets only show the season happening now (null = All time)
  const [faApplies, setFaApplies] = useState(true);
  const [fixtures, setFixtures] = useState<PublicFixture[]>([]);
  const [live, setLive] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { snippets } = useFaSnippets(tenant);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : '';
      const [res, liveMatches] = await Promise.all([
        fetch(`${API_BASE}/public/${encodeURIComponent(tenant)}/fixtures${query}`, { cache: 'no-store' }),
        getLiveMatches(tenant),
      ]);
      if (!res.ok) throw new Error(`fixtures ${res.status}`);
      const body = await res.json();
      setFixtures(Array.isArray(body?.data) ? body.data : []);
      setLive(liveMatches);
    } catch (err) {
      console.error('Failed to load fixtures:', err);
      setError("We couldn't load the fixtures. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [tenant, seasonId]);

  useEffect(() => {
    load();
  }, [load]);

  const now = new Date();
  const withState = [...fixtures]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((f) => ({ fixture: f, state: fixtureState(f, live, now) }));
  const liveNow = withState.filter((x) => x.state === 'live');
  const toCome = withState.filter((x) => x.state === 'upcoming' || x.state === 'postponed' || (x.state === 'cancelled' && new Date(x.fixture.date) >= now));
  const next = toCome.find((x) => x.state === 'upcoming')?.fixture ?? null;
  const rest = toCome.filter((x) => x.fixture.id !== next?.id);
  const awaiting = withState.filter((x) => x.state === 'awaiting').reverse();
  const nothing = !liveNow.length && !toCome.length && !awaiting.length;

  return (
    <div className="container py-8 md:py-12">
      <PageHeader
        eyebrow="Matches"
        title="Fixtures"
        subtitle="Every game coming up, with kick-off times and where we're playing."
      />

      <PublicSeasonTabs tenant={tenant} onSeasonChange={(id, isCurrent) => { setSeasonId(id); setFaApplies(id === null || isCurrent); }} currentSeasonId={seasonId} />

      {loading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading fixtures">
          <div className="h-72 card animate-pulse" />
          {[1, 2, 3].map((i) => <div key={i} className="h-24 card animate-pulse" />)}
        </div>
      ) : error ? (
        <EmptyNote icon="alert" title="Fixtures didn't load" action={<button type="button" onClick={load} className="btn btn-primary">Try again</button>}>
          <p role="alert">{error}</p>
        </EmptyNote>
      ) : (
        <>
          {liveNow.length > 0 && (
            <Section title="Live now">
              {liveNow.map(({ fixture, state }) => (
                <FixtureRow key={fixture.id} fixture={fixture} state={state} live={liveMatchFor(fixture, live)} />
              ))}
            </Section>
          )}

          {next && <NextMatchCard fixture={next} />}

          {rest.length > 0 && (
            <Section title="Coming up">
              {rest.map(({ fixture, state }) => (
                <FixtureRow key={fixture.id} fixture={fixture} state={state} live={null} />
              ))}
            </Section>
          )}

          {awaiting.length > 0 && (
            <Section title="Awaiting result">
              {awaiting.map(({ fixture, state }) => (
                <FixtureRow key={fixture.id} fixture={fixture} state={state} live={null} />
              ))}
            </Section>
          )}

          {nothing && (faApplies && snippets.team ? (
            <FaFullTimeEmbed code={snippets.team} title="Our fixtures and results" />
          ) : (
            <EmptyNote
              icon="calendar"
              title="No fixtures yet"
              action={<Link href={`/${tenant}/results`} className="btn btn-secondary">See results</Link>}
            >
              New games show here as soon as the club adds them. Check back soon.
            </EmptyNote>
          ))}

          {!nothing && !next && !liveNow.length && (
            <p className="text-muted mb-10">No more games booked yet. New fixtures show here as soon as the club adds them.</p>
          )}
        </>
      )}

      {faApplies && snippets.fixtures && (
        <div className="mt-12">
          <FaFullTimeEmbed code={snippets.fixtures} title="Around the league" highlight={tenant.split('-')[0]} />
        </div>
      )}
    </div>
  );
}

