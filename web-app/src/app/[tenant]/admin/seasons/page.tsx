'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { StartSeasonModal } from '@/components/admin/seasons/StartSeasonModal';
import { EndSeasonModal } from '@/components/admin/seasons/EndSeasonModal';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDate } from '@/lib/format';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice, Pill, bodyError } from '@/components/admin/AdminUi';

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
    archived_at?: number;
}

export default function SeasonsAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const [showStartModal, setShowStartModal] = useState(false);
    const [endSeason, setEndSeason] = useState<Season | null>(null);

    const loadSeasons = useCallback(async () => {
        setLoadError('');
        try {
            const res = await apiFetch('/api/v1/seasons');
            if (!res.ok) throw new Error(await errorMessage(res, "We couldn't load your seasons."));
            const data = await res.json();
            setSeasons(Array.isArray(data?.data) ? (data.data as Season[]) : []);
        } catch (err) {
            setLoadError(err instanceof Error && err.message ? err.message : "We couldn't load your seasons. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSeasons();
    }, [tenant, loadSeasons]);

    async function post(path: string, body: unknown, done: string, fallback: string) {
        setMessage(null);
        try {
            const res = await apiFetch(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
            const data = await res.json().catch(() => null);
            if (!res.ok || data?.success === false) throw new Error(bodyError(data, fallback));
            setMessage({ tone: 'success', text: done });
            loadSeasons();
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : fallback });
        }
    }

    const handleSetCurrent = (s: Season) => post('/api/v1/seasons/set-current', { seasonId: s.id }, `${s.name} is now the current season.`, "That season wasn't made current. Please try again.");
    const handleReopen = (s: Season) => {
        if (!confirm(`Reopen ${s.name}? It becomes active again.`)) return;
        post(`/api/v1/seasons/${encodeURIComponent(s.id)}/reopen`, undefined, `${s.name} is open again.`, "That season wasn't reopened. Please try again.");
    };

    const currentSeason = seasons.find((s) => s.is_current === 1);
    const dates = (s: Season) => `${formatDate(s.start_date) || s.start_date} to ${s.end_date ? formatDate(s.end_date) || s.end_date : 'now'}`;

    return (
        <div className="container py-8 md:py-10">
            <StartSeasonModal isOpen={showStartModal} onClose={() => setShowStartModal(false)} onSuccess={loadSeasons} tenantId={tenant} />
            {endSeason && (
                <EndSeasonModal isOpen onClose={() => setEndSeason(null)} onSuccess={loadSeasons} season={endSeason} tenantId={tenant} />
            )}

            <PageHeader
                eyebrow="Club admin"
                title="Seasons"
                subtitle="Start a new season, end the old one with its awards, and look back at past seasons."
                actions={
                    <>
                        <Link href={`/${tenant}/history`} className="btn btn-secondary"><Icon name="history" className="w-4 h-4" /> Club history</Link>
                        <button type="button" onClick={() => setShowStartModal(true)} className="btn btn-primary"><Icon name="plus" className="w-4 h-4" /> New season</button>
                    </>
                }
            />

            {message && <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div>}

            {loading ? (
                <LoadingBlock label="Loading seasons" />
            ) : loadError ? (
                <ErrorNote message={loadError} onRetry={() => { setLoading(true); loadSeasons(); }} />
            ) : seasons.length === 0 ? (
                <EmptyNote icon="history" title="No seasons set up" action={<button type="button" onClick={() => setShowStartModal(true)} className="btn btn-primary">Start your first season</button>}>
                    Until you start one, results and stats are grouped by football year (August to July).
                </EmptyNote>
            ) : (
                <div className="space-y-6">
                    {currentSeason && (
                        <section className="card border-brand/50 flex flex-wrap justify-between items-center gap-4" aria-label="Current season">
                            <div>
                                <p className="eyebrow mb-1">Current season</p>
                                <h2 className="text-4xl">{currentSeason.name}</h2>
                                <p className="text-muted mt-1">Started {formatDate(currentSeason.start_date) || currentSeason.start_date}</p>
                            </div>
                            <button type="button" onClick={() => setEndSeason(currentSeason)} className="btn btn-danger">End season</button>
                        </section>
                    )}

                    <section aria-labelledby="season-list-title" className="space-y-3">
                        <h2 id="season-list-title" className="text-2xl">All seasons</h2>
                        <ul className="space-y-2">
                            {seasons.map((season) => {
                                const isCurrent = season.is_current === 1;
                                const isArchived = season.status === 'archived';
                                return (
                                    <li key={season.id} className="bg-surface border border-border chamfer-sm p-4 flex flex-wrap items-center gap-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-display text-2xl font-extrabold uppercase flex flex-wrap items-center gap-2">
                                                {season.name}
                                                {isCurrent && <Pill tone="success">Current</Pill>}
                                                {isArchived && <Pill>Archived</Pill>}
                                            </p>
                                            <p className="text-sm text-muted">{dates(season)}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!isCurrent && !isArchived && <button type="button" onClick={() => handleSetCurrent(season)} className="btn btn-sm btn-secondary">Make current</button>}
                                            {isArchived && <button type="button" onClick={() => handleReopen(season)} className="btn btn-sm btn-secondary">Reopen</button>}
                                            <Link href={`/${tenant}/history?season=${season.id}`} className="btn btn-sm btn-ghost">Stats</Link>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                </div>
            )}
        </div>
    );
}
