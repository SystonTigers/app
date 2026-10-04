'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { createFixture, deleteFixture } from '@/lib/sdk';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDate, ukDay } from '@/lib/format';
import { FixturePhotoImport } from '@/components/FixturePhotoImport';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice, Pill, sdkErrorMessage } from '@/components/admin/AdminUi';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

/** A row from GET /api/v1/fixtures. */
interface FixtureRow {
    id: string;
    opponent: string | null;
    homeTeam: string;
    awayTeam: string;
    date: string;
    time: string | null;
    venue: string | null;
    competition: string | null;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
}

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'brand' }> = {
    completed: { label: 'Played', tone: 'success' },
    live: { label: 'Live', tone: 'brand' },
    postponed: { label: 'Postponed', tone: 'warning' },
    cancelled: { label: 'Cancelled', tone: 'danger' },
};

export default function FixturesAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [formError, setFormError] = useState('');
    const [formDone, setFormDone] = useState('');
    const [listError, setListError] = useState('');
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [formData, setFormData] = useState({
        date: '',
        time: '',
        opponent: '',
        venue: 'Home',
        competition: 'League',
    });

    const loadFixtures = useCallback(async () => {
        setLoadError('');
        try {
            const res = await apiFetch('/api/v1/fixtures');
            if (!res.ok) throw new Error(await errorMessage(res, "We couldn't load your fixtures."));
            const body = await res.json();
            setFixtures(Array.isArray(body?.data) ? (body.data as FixtureRow[]) : []);
        } catch (err) {
            setLoadError(err instanceof Error && err.message ? err.message : "We couldn't load your fixtures. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFixtures();
    }, [tenant, loadFixtures]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormDone('');
        if (!formData.date || !formData.opponent.trim()) {
            setFormError('Enter the date and who you are playing.');
            return;
        }
        setFormError('');
        setSaving(true);
        try {
            await createFixture({ ...formData, opponent: formData.opponent.trim() });
            setFormDone(`Added: ${formData.opponent.trim()} on ${formatDate(formData.date)}.`);
            setFormData({ ...formData, opponent: '' });
            loadFixtures();
        } catch (err) {
            setFormError(sdkErrorMessage(err, "The fixture didn't save. Please try again."));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(f: FixtureRow) {
        if (!confirm(`Delete the fixture against ${opponentOf(f)}?`)) return;
        setListError('');
        try {
            await deleteFixture(f.id);
            loadFixtures();
        } catch {
            setListError("That fixture wasn't deleted. Please try again.");
        }
    }

    // The calendar file needs the login token, so it's fetched and saved rather than linked
    async function exportCalendar() {
        setExporting(true);
        setListError('');
        try {
            const res = await apiFetch('/api/v1/calendar/export');
            if (!res.ok) throw new Error();
            const url = URL.createObjectURL(await res.blob());
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tenant}-fixtures.ics`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
            setListError("The calendar file didn't download. Please try again.");
        } finally {
            setExporting(false);
        }
    }

    const opponentOf = (f: FixtureRow) => f.opponent || (f.awayTeam === 'Opponent' ? f.homeTeam : f.awayTeam);
    const today = ukDay();
    const upcoming = fixtures.filter((f) => f.status !== 'completed' && f.date.slice(0, 10) >= today);
    const past = fixtures.filter((f) => !upcoming.includes(f)).reverse();

    const renderRow = (f: FixtureRow) => {
        const status = STATUS[f.status];
        const played = f.homeScore != null && f.awayScore != null;
        return (
            <li key={f.id} className="bg-surface border border-border chamfer-sm px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="w-14 shrink-0 text-center">
                    <p className="font-display text-2xl font-extrabold leading-none">{formatDate(f.date, { day: 'numeric' })}</p>
                    <p className="text-xs text-muted uppercase tracking-wider">{formatDate(f.date, { month: 'short' })}</p>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">vs {opponentOf(f)}</p>
                    <p className="text-xs text-muted uppercase tracking-wider">
                        {[f.time, f.venue, f.competition].filter(Boolean).join(' · ')}
                    </p>
                    {status && <div className="mt-1"><Pill tone={status.tone}>{status.label}</Pill></div>}
                </div>
                {played && <span className="font-display text-2xl font-extrabold tabular-nums">{f.homeScore}–{f.awayScore}</span>}
                <div className="flex items-center gap-1 ml-auto">
                    <Link href={`/${tenant}/admin/fixtures/${f.id}/report`} className="btn btn-sm btn-secondary">
                        <Icon name="clipboard" className="w-4 h-4" /> Report
                    </Link>
                    <button type="button" onClick={() => handleDelete(f)} className="p-2.5 text-muted hover:text-red-400" aria-label={`Delete the fixture against ${opponentOf(f)}`}>
                        <Icon name="trash" className="w-5 h-5" />
                    </button>
                </div>
            </li>
        );
    };

    return (
        <div className="container py-8 md:py-10">
            <PageHeader
                eyebrow="Club admin"
                title="Fixtures"
                subtitle="Add your matches by hand or from a photo. After a match, write the report to save the score and who played."
                actions={
                    <button type="button" onClick={exportCalendar} disabled={exporting} className="btn btn-secondary">
                        <Icon name="download" className="w-4 h-4" /> {exporting ? 'Getting the file…' : 'Calendar file'}
                    </button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
                        <h2 className="text-2xl">Add a fixture</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="fixture-date" className="label">Date</label>
                                <input id="fixture-date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="field px-3" required />
                            </div>
                            <div>
                                <label htmlFor="fixture-time" className="label">Kick-off</label>
                                <input id="fixture-time" type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="field px-3" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="fixture-opponent" className="label">Opponent</label>
                            <input id="fixture-opponent" type="text" maxLength={80} autoComplete="off" placeholder="e.g. Oadby Town" value={formData.opponent} onChange={(e) => setFormData({ ...formData, opponent: e.target.value })} className="field" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="fixture-venue" className="label">Home or away</label>
                                <select id="fixture-venue" value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })} className="field">
                                    <option value="Home">Home</option>
                                    <option value="Away">Away</option>
                                    <option value="Neutral">Neutral</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="fixture-competition" className="label">Competition</label>
                                <input id="fixture-competition" type="text" value={formData.competition} onChange={(e) => setFormData({ ...formData, competition: e.target.value })} className="field" />
                            </div>
                        </div>
                        {formError && <Notice tone="error">{formError}</Notice>}
                        {formDone && <Notice tone="success">{formDone}</Notice>}
                        <button type="submit" disabled={saving} className="btn btn-primary w-full">{saving ? 'Saving…' : 'Add fixture'}</button>
                    </form>
                    <FixturePhotoImport onAdded={loadFixtures} />
                </div>

                <div className="lg:col-span-3 space-y-6">
                    {listError && <Notice tone="error">{listError}</Notice>}
                    {loading ? (
                        <LoadingBlock label="Loading fixtures" />
                    ) : loadError ? (
                        <ErrorNote message={loadError} onRetry={() => { setLoading(true); loadFixtures(); }} />
                    ) : fixtures.length === 0 ? (
                        <EmptyNote icon="calendar" title="No fixtures yet">
                            Add your next match with the form, or read a whole fixture list from a photo. FA fixture emails can be pasted in Settings.
                        </EmptyNote>
                    ) : (
                        <>
                            <section aria-labelledby="upcoming-title" className="space-y-3">
                                <h2 id="upcoming-title" className="text-2xl">Coming up</h2>
                                {upcoming.length ? <ul className="space-y-2">{upcoming.map(renderRow)}</ul> : <p className="text-muted">Nothing coming up. Add your next match.</p>}
                            </section>
                            {past.length > 0 && (
                                <section aria-labelledby="past-title" className="space-y-3">
                                    <h2 id="past-title" className="text-2xl">Played and past</h2>
                                    <ul className="space-y-2">{past.map(renderRow)}</ul>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
