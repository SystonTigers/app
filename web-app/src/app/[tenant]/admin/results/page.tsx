'use client';

import { useCallback, useEffect, useState, use } from 'react';
import { createResult, deleteResult } from '@/lib/sdk';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDate, ukDay } from '@/lib/format';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice, Pill, sdkErrorMessage } from '@/components/admin/AdminUi';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

/** A row from GET /api/v1/results (homeScore is always ours). */
interface ResultRow {
    id: number;
    date: string;
    opponent: string;
    venue: string | null;
    competition: string | null;
    homeScore: number;
    awayScore: number;
    result: 'win' | 'draw' | 'loss' | string;
    scorers: string | null;
    scorersFrom: 'match_centre' | 'picked' | 'typed' | string | null;
}

interface SquadPick {
    id: string;
    name: string;
    number: number | null;
}

const COMPETITIONS = ['League', 'Cup', 'Friendly'];

function toScore(value: string): number {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? 0 : Math.min(Math.max(n, 0), 99);
}

export default function ResultsAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [results, setResults] = useState<ResultRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [formData, setFormData] = useState({
        date: '',
        opponent: '',
        venue: 'Home',
        competition: 'League',
        ourScore: 0,
        theirScore: 0,
    });
    // One squad id per goal (the same player twice for two goals), plus own goals
    const [scorerIds, setScorerIds] = useState<string[]>([]);
    const [ownGoals, setOwnGoals] = useState(0);
    const [squad, setSquad] = useState<SquadPick[]>([]);
    const [pick, setPick] = useState('');
    const [error, setError] = useState('');
    const [saved, setSaved] = useState('');
    const [saving, setSaving] = useState(false);
    const [listError, setListError] = useState('');

    const loadResults = useCallback(async () => {
        setLoadError('');
        try {
            const res = await apiFetch('/api/v1/results?limit=100');
            if (!res.ok) throw new Error(await errorMessage(res, "We couldn't load your results."));
            const body = await res.json();
            setResults(Array.isArray(body?.data) ? (body.data as ResultRow[]) : []);
        } catch (err) {
            setLoadError(err instanceof Error && err.message ? err.message : "We couldn't load your results. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadResults();
        // Staff see full names (the public squad list follows the club's name style)
        apiFetch('/api/v1/squad')
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => {
                const rows: Array<{ id: unknown; name?: unknown; number?: unknown }> = Array.isArray(body?.data) ? body.data : [];
                setSquad(rows.map((r) => ({ id: String(r.id), name: String(r.name ?? ''), number: r.number == null ? null : Number(r.number) })));
            })
            .catch(() => setSquad([]));
    }, [tenant, loadResults]);

    const goalsLeft = formData.ourScore - scorerIds.length - ownGoals;
    const scorerCounts = scorerIds.reduce<Map<string, number>>((m, id) => m.set(id, (m.get(id) ?? 0) + 1), new Map());
    const nameOf = (id: string) => squad.find((p) => p.id === id)?.name ?? 'Player';

    function addScorer() {
        if (!pick || goalsLeft <= 0) return;
        if (pick === 'og') setOwnGoals(ownGoals + 1);
        else setScorerIds([...scorerIds, pick]);
        setPick('');
    }

    function removeScorer(id: string) {
        const i = scorerIds.lastIndexOf(id);
        if (i >= 0) setScorerIds([...scorerIds.slice(0, i), ...scorerIds.slice(i + 1)]);
    }

    function setOurScore(value: string) {
        const ourScore = toScore(value);
        setFormData({ ...formData, ourScore });
        // Fewer goals than scorers picked: drop the last picks so they still add up
        let extra = scorerIds.length + ownGoals - ourScore;
        if (extra > 0) {
            const og = Math.min(ownGoals, extra);
            setOwnGoals(ownGoals - og);
            extra -= og;
            if (extra > 0) setScorerIds(scorerIds.slice(0, scorerIds.length - extra));
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaved('');
        if (!formData.date || !formData.opponent.trim()) {
            setError('Enter the date and who you played.');
            return;
        }
        if (goalsLeft < 0) {
            setError(`You've picked more scorers than goals (${formData.ourScore}). Remove one and try again.`);
            return;
        }
        setError('');
        setSaving(true);
        try {
            await createResult({ ...formData, opponent: formData.opponent.trim(), scorerIds, ownGoals });
            setSaved(`Saved: ${formData.ourScore}–${formData.theirScore} against ${formData.opponent.trim()}. The league table has been updated.`);
            setFormData({ ...formData, opponent: '', ourScore: 0, theirScore: 0 });
            setScorerIds([]);
            setOwnGoals(0);
            loadResults();
        } catch (err) {
            setError(sdkErrorMessage(err, "The result didn't save. Please try again."));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(row: ResultRow) {
        if (!confirm(`Delete the result against ${row.opponent}? Its goals come off players' stats too.`)) return;
        setListError('');
        try {
            await deleteResult(String(row.id));
            loadResults();
        } catch {
            setListError("That result wasn't deleted. Please try again.");
        }
    }

    const outcome = (r: ResultRow) =>
        r.homeScore > r.awayScore ? { label: 'W', tone: 'bg-green-500/15 text-green-300 border-green-500/40' }
            : r.homeScore < r.awayScore ? { label: 'L', tone: 'bg-red-500/15 text-red-300 border-red-500/40' }
                : { label: 'D', tone: 'bg-surface-raised text-muted border-border' };

    return (
        <div className="container py-8 md:py-10">
            <PageHeader
                eyebrow="Club admin"
                title="Results"
                subtitle="Add a score, pick who scored and the league table and player stats update themselves."
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                {/* Form */}
                <form onSubmit={handleSubmit} className="card lg:col-span-2 space-y-4" noValidate>
                    <h2 className="text-2xl">Add a result</h2>
                    <div>
                        <label htmlFor="result-date" className="label">Date</label>
                        <input
                            id="result-date"
                            type="date"
                            max={ukDay()}
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="field"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="result-opponent" className="label">Opponent</label>
                        <input
                            id="result-opponent"
                            type="text"
                            maxLength={80}
                            autoComplete="off"
                            placeholder="e.g. Birstall United"
                            value={formData.opponent}
                            onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                            className="field"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="result-venue" className="label">Home or away</label>
                            <select id="result-venue" value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })} className="field">
                                <option value="Home">Home</option>
                                <option value="Away">Away</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="result-competition" className="label">Competition</label>
                            <select id="result-competition" value={formData.competition} onChange={(e) => setFormData({ ...formData, competition: e.target.value })} className="field">
                                {COMPETITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="result-us" className="label">Our goals</label>
                            <input
                                id="result-us"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={99}
                                value={formData.ourScore}
                                onChange={(e) => setOurScore(e.target.value)}
                                className="field text-center font-display text-2xl font-bold"
                            />
                        </div>
                        <div>
                            <label htmlFor="result-them" className="label">Their goals</label>
                            <input
                                id="result-them"
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={99}
                                value={formData.theirScore}
                                onChange={(e) => setFormData({ ...formData, theirScore: toScore(e.target.value) })}
                                className="field text-center font-display text-2xl font-bold"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="scorer-pick" className="label">Scorers</label>
                        <div className="flex gap-2">
                            <select
                                id="scorer-pick"
                                value={pick}
                                onChange={(e) => setPick(e.target.value)}
                                disabled={goalsLeft <= 0}
                                className="field flex-1 min-w-0"
                            >
                                <option value="">{goalsLeft > 0 ? `Who scored? (${goalsLeft} left)` : formData.ourScore ? 'Every goal has a scorer' : 'Enter our goals first'}</option>
                                {squad.map((p) => <option key={p.id} value={p.id}>{p.number != null ? `${p.number}. ` : ''}{p.name}</option>)}
                                <option value="og">Own goal</option>
                            </select>
                            <button type="button" onClick={addScorer} disabled={!pick || goalsLeft <= 0} className="btn btn-secondary px-4">
                                <Icon name="plus" className="w-4 h-4" /> Add
                            </button>
                        </div>
                        <p className="text-xs text-muted mt-2">Add a player once for each goal they scored. Picked scorers count in player stats.</p>
                        {(scorerCounts.size > 0 || ownGoals > 0) && (
                            <ul className="flex flex-wrap gap-2 mt-3" aria-label="Scorers picked">
                                {[...scorerCounts].map(([id, n]) => (
                                    <li key={id}>
                                        <button
                                            type="button"
                                            onClick={() => removeScorer(id)}
                                            className="inline-flex items-center gap-2 min-h-[40px] px-3 text-sm font-semibold bg-brand/10 border border-brand/40 text-foreground hover:border-red-400 chamfer-sm"
                                            aria-label={`Remove one goal for ${nameOf(id)}`}
                                        >
                                            <Icon name="ball" className="w-4 h-4 text-brand" />
                                            {nameOf(id)}{n > 1 ? ` ×${n}` : ''}
                                            <Icon name="close" className="w-4 h-4 text-muted" />
                                        </button>
                                    </li>
                                ))}
                                {ownGoals > 0 && (
                                    <li>
                                        <button
                                            type="button"
                                            onClick={() => setOwnGoals(ownGoals - 1)}
                                            className="inline-flex items-center gap-2 min-h-[40px] px-3 text-sm font-semibold bg-surface-raised border border-border text-foreground hover:border-red-400 chamfer-sm"
                                            aria-label="Remove one own goal"
                                        >
                                            <Icon name="ball" className="w-4 h-4 text-muted" />
                                            Own goal{ownGoals > 1 ? ` ×${ownGoals}` : ''}
                                            <Icon name="close" className="w-4 h-4 text-muted" />
                                        </button>
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>
                    {error && <Notice tone="error">{error}</Notice>}
                    {saved && <Notice tone="success">{saved}</Notice>}
                    <button type="submit" disabled={saving} className="btn btn-primary w-full">
                        {saving ? 'Saving…' : 'Save result'}
                    </button>
                </form>

                {/* List */}
                <section className="lg:col-span-3 space-y-3" aria-labelledby="results-list-title">
                    <h2 id="results-list-title" className="text-2xl">Recent results</h2>
                    {listError && <Notice tone="error">{listError}</Notice>}
                    {loading ? (
                        <LoadingBlock label="Loading results" />
                    ) : loadError ? (
                        <ErrorNote message={loadError} onRetry={() => { setLoading(true); loadResults(); }} />
                    ) : results.length === 0 ? (
                        <EmptyNote icon="trophy" title="No results yet">
                            Add your first score with the form. Results from Match Centre in the app appear here too.
                        </EmptyNote>
                    ) : (
                        <ul className="space-y-2">
                            {results.map((r) => {
                                const o = outcome(r);
                                return (
                                    <li key={r.id} className="bg-surface border border-border chamfer-sm px-4 py-3 flex items-center gap-4">
                                        <span className={`w-9 h-9 shrink-0 flex items-center justify-center border font-display text-lg font-extrabold ${o.tone}`} aria-label={r.result}>
                                            {o.label}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs text-muted uppercase tracking-wider">
                                                {formatDate(r.date)}{r.competition ? ` · ${r.competition}` : ''}{r.venue && r.venue !== 'TBC' ? ` · ${r.venue}` : ''}
                                            </p>
                                            <p className="font-semibold text-foreground truncate">vs {r.opponent}</p>
                                            {r.scorers && <p className="text-sm text-muted truncate">{r.scorers}</p>}
                                            {r.scorersFrom === 'match_centre' && (
                                                <div className="mt-1"><Pill tone="brand">From Match Centre</Pill></div>
                                            )}
                                        </div>
                                        <span className="font-display text-3xl font-extrabold tabular-nums whitespace-nowrap">
                                            {r.homeScore}–{r.awayScore}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(r)}
                                            className="p-2.5 text-muted hover:text-red-400"
                                            aria-label={`Delete the result against ${r.opponent}`}
                                        >
                                            <Icon name="trash" className="w-5 h-5" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {results.some((r) => r.scorersFrom === 'match_centre') && (
                        <p className="text-xs text-muted">Scorers for matches recorded in Match Centre come from there. Change them in the app.</p>
                    )}
                </section>
            </div>
        </div>
    );
}
