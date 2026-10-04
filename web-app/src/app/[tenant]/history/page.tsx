'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { SeasonTabs } from '@/components/SeasonTabs';
import { FunStatsCard } from '@/components/FunStatsCard';
import { EmptyNote, MembersOnlyPage, PageHeader } from '@/components/ui/Page';
import { Icon, type IconName } from '@/components/ui/Icon';
import { canAccessAdmin, useUserRole } from '@/hooks/useUserRole';
import { apiFetch, errorMessage } from '@/lib/session';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

interface Season {
    id: string;
    name: string;
    is_current: number;
    status: string;
    start_date: string;
    end_date?: string;
}

/** As GET /api/v1/seasons/:id/stats returns it */
interface SeasonStats {
    season: Season;
    summary: {
        played: number;
        won: number;
        drawn: number;
        lost: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
        points: number;
        cleanSheets: number;
    };
    topScorer?: { name: string; goals: number };
    topAssister?: { name: string; assists: number };
    isFrozen?: boolean;
}

interface Award {
    id: string;
    award_name: string;
    player_name: string;
    notes?: string;
}

const LINKS: Array<{ href: string; label: string; icon: IconName }> = [
    { href: 'fixtures', label: 'Fixtures', icon: 'calendar' },
    { href: 'results', label: 'Results', icon: 'trophy' },
    { href: 'table', label: 'League table', icon: 'table' },
    { href: 'squad', label: 'Squad', icon: 'users' },
];

function History({ tenant }: { tenant: string }) {
    const { role } = useUserRole();
    const isStaff = canAccessAdmin(role);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
    const [stats, setStats] = useState<SeasonStats | null>(null);
    const [awards, setAwards] = useState<Award[]>([]);
    const [loading, setLoading] = useState(true);
    const [seasonLoading, setSeasonLoading] = useState(false);
    const [error, setError] = useState('');

    const loadSeasons = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await apiFetch('/api/v1/seasons');
            if (!res.ok) {
                setError(await errorMessage(res, "We couldn't load the club's seasons. Please try again."));
                return;
            }
            const data = await res.json();
            const list: Season[] = Array.isArray(data.data) ? data.data : [];
            setSeasons(list);
            if (list.length > 0) setSelectedSeason(list[0].id);
        } catch (err) {
            console.error('Failed to load seasons:', err);
            setError("We couldn't load the club's seasons. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSeasons();
    }, [loadSeasons, tenant]);

    useEffect(() => {
        if (!selectedSeason) return;
        let stopped = false;
        setStats(null);
        setAwards([]);
        setSeasonLoading(true);
        (async () => {
            try {
                const [resStats, resAwards] = await Promise.all([
                    apiFetch(`/api/v1/seasons/${encodeURIComponent(selectedSeason)}/stats`),
                    apiFetch(`/api/v1/seasons/${encodeURIComponent(selectedSeason)}/awards`),
                ]);
                const dataStats = resStats.ok ? await resStats.json() : null;
                const dataAwards = resAwards.ok ? await resAwards.json() : null;
                if (stopped) return;
                if (dataStats?.success) setStats(dataStats as SeasonStats);
                if (dataAwards?.success && Array.isArray(dataAwards.data)) setAwards(dataAwards.data);
            } catch (err) {
                console.error('Failed to load season data:', err);
            } finally {
                if (!stopped) setSeasonLoading(false);
            }
        })();
        return () => { stopped = true; };
    }, [selectedSeason]);

    const header = <PageHeader eyebrow="Club" title="Season history" subtitle="Past seasons, records and awards." />;

    if (loading) {
        return (
            <>
                {header}
                <div className="h-56 card animate-pulse" aria-busy="true" aria-label="Loading seasons" />
            </>
        );
    }

    if (error) {
        return (
            <>
                {header}
                <EmptyNote icon="alert" title="History didn't load" action={<button type="button" onClick={loadSeasons} className="btn btn-primary">Try again</button>}>
                    <p role="alert">{error}</p>
                </EmptyNote>
            </>
        );
    }

    if (seasons.length === 0) {
        return (
            <>
                {header}
                <EmptyNote
                    icon="history"
                    title="No seasons yet"
                    action={isStaff ? <Link href={`/${tenant}/admin/seasons`} className="btn btn-primary">Set up seasons</Link> : undefined}
                >
                    {isStaff ? 'Add your seasons to keep each year’s record, top scorers and awards.' : 'Each season’s record, top scorers and awards will show here once the club sets them up.'}
                </EmptyNote>
            </>
        );
    }

    const s = stats?.summary;
    const record = s ? [
        { label: 'Played', value: s.played },
        { label: 'Won', value: s.won },
        { label: 'Drawn', value: s.drawn },
        { label: 'Lost', value: s.lost },
        { label: 'For', value: s.goalsFor },
        { label: 'Against', value: s.goalsAgainst },
        { label: 'Goal diff', value: `${s.goalDifference > 0 ? '+' : ''}${s.goalDifference}` },
        { label: 'Clean sheets', value: s.cleanSheets },
    ] : [];

    return (
        <>
            {header}
            <SeasonTabs tenant={tenant} currentSeasonId={selectedSeason || undefined} onSeasonChange={setSelectedSeason} seasons={seasons} allTime={false} />

            {seasonLoading ? (
                <div className="h-56 card animate-pulse" aria-busy="true" aria-label="Loading the season" />
            ) : !stats || !s ? (
                <EmptyNote icon="chart" title="No numbers for this season">Results added for this season will build its record here.</EmptyNote>
            ) : (
                <div className="space-y-8">
                    <section className="card hex-grid">
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <h2 className="text-3xl italic">{stats.season.name}</h2>
                            {stats.season.is_current === 1 && <span className="px-2 py-0.5 bg-brand text-brand-foreground chamfer-sm text-xs font-bold uppercase tracking-wider">This season</span>}
                            {stats.season.status === 'archived' && <span className="px-2 py-0.5 border border-border chamfer-sm text-xs font-bold uppercase tracking-wider text-muted">Finished</span>}
                            {stats.isFrozen && <span className="text-xs text-muted" title="Saved when the season ended">Final figures</span>}
                            <span className="ml-auto font-display text-3xl font-extrabold text-brand">{s.points} pts</span>
                        </div>
                        <dl className="grid grid-cols-4 md:grid-cols-8 gap-2">
                            {record.map((r) => (
                                <div key={r.label} className="bg-surface-raised border border-border chamfer-sm py-3 text-center flex flex-col-reverse">
                                    <dt className="text-[10px] md:text-xs font-bold text-muted uppercase tracking-wider">{r.label}</dt>
                                    <dd className="font-display text-2xl md:text-3xl font-extrabold">{r.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <section className="card">
                            <h3 className="text-2xl italic mb-4 flex items-center gap-2"><Icon name="trophy" className="w-6 h-6 text-brand" /> Awards</h3>
                            {awards.length === 0 ? (
                                <p className="text-muted">No awards recorded for this season.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {awards.map((a) => (
                                        <li key={a.id} className="flex items-start gap-3 p-3 bg-surface-raised border border-border chamfer-sm">
                                            <Icon name="star" className="w-5 h-5 text-brand mt-0.5" />
                                            <div className="min-w-0">
                                                <p className="font-bold">{a.award_name}</p>
                                                <p className="text-brand font-bold">{a.player_name}</p>
                                                {a.notes && <p className="text-sm text-muted mt-1">{a.notes}</p>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="space-y-4">
                            {stats.topScorer && (
                                <div className="card flex items-center gap-4">
                                    <span className="w-12 h-12 shrink-0 hexagon bg-brand/15 text-brand flex items-center justify-center"><Icon name="ball" className="w-6 h-6" /></span>
                                    <div>
                                        <p className="text-xs text-muted uppercase font-bold tracking-wider">Top scorer</p>
                                        <p className="font-display text-xl font-bold uppercase">{stats.topScorer.name}</p>
                                        <p className="text-brand font-bold">{stats.topScorer.goals} goals</p>
                                    </div>
                                </div>
                            )}
                            {stats.topAssister && (
                                <div className="card flex items-center gap-4">
                                    <span className="w-12 h-12 shrink-0 hexagon bg-brand/15 text-brand flex items-center justify-center"><Icon name="target" className="w-6 h-6" /></span>
                                    <div>
                                        <p className="text-xs text-muted uppercase font-bold tracking-wider">Most assists</p>
                                        <p className="font-display text-xl font-bold uppercase">{stats.topAssister.name}</p>
                                        <p className="text-brand font-bold">{stats.topAssister.assists} assists</p>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>

                    <FunStatsCard tenant={tenant} seasonId={selectedSeason} />

                    <nav aria-label="More about the club" className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {LINKS.map((l) => (
                            <Link key={l.href} href={`/${tenant}/${l.href}`} className="card p-4 flex flex-col items-center gap-2 text-center hover:border-brand/60 transition-colors">
                                <Icon name={l.icon} className="w-6 h-6 text-brand" />
                                <span className="font-display font-bold uppercase">{l.label}</span>
                            </Link>
                        ))}
                    </nav>
                </div>
            )}
        </>
    );
}

export default function HistoryPage({ params }: PageProps) {
    const { tenant } = use(params);
    return (
        <MembersOnlyPage tenant={tenant} what="Season records and awards" title="Season history" subtitle="Past seasons, records and awards.">
            <div className="container py-8 md:py-12">
                <History tenant={tenant} />
            </div>
        </MembersOnlyPage>
    );
}
