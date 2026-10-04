'use client';

import { useCallback, useEffect, useState, use } from 'react';
import { createClientSDK } from '@/lib/sdk';
import { apiFetch } from '@/lib/session';
import { PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice, Pill, sdkErrorMessage } from '@/components/admin/AdminUi';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

interface Candidate {
    id: string;
    player_id: string;
    match_id: string;
    description: string;
    video_url?: string;
    votes: number;
}

interface Voting {
    id: string;
    month: string;
    year: number;
    status: 'open' | 'closed';
}

interface Player {
    id: string;
    name: string;
}

interface NewGoal {
    playerId: string;
    description: string;
    videoUrl?: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function GOTMAdminPage({ params }: PageProps) {
    const { tenant } = use(params);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [voting, setVoting] = useState<Voting | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const [busy, setBusy] = useState(false);

    // New vote
    const [newMonth, setNewMonth] = useState('');
    const [newYear, setNewYear] = useState(new Date().getFullYear());
    const [newGoals, setNewGoals] = useState<NewGoal[]>([]);
    const [goalDesc, setGoalDesc] = useState('');
    const [goalPlayer, setGoalPlayer] = useState('');
    const [goalVideo, setGoalVideo] = useState('');

    const loadData = useCallback(async () => {
        setLoadError('');
        try {
            const [gotmData, squadRes] = await Promise.all([
                createClientSDK(tenant).getGOTMVoting(),
                apiFetch('/api/v1/squad'),
            ]);
            if (gotmData.voting) {
                setVoting(gotmData.voting as Voting);
                setCandidates((gotmData.candidates ?? []) as Candidate[]);
            } else {
                setVoting(null);
                setCandidates([]);
            }
            const squadBody = squadRes.ok ? await squadRes.json() : null;
            const rows: Array<{ id: unknown; name?: unknown }> = Array.isArray(squadBody?.data) ? squadBody.data : [];
            setPlayers(rows.map((r) => ({ id: String(r.id), name: String(r.name ?? '') })));
        } catch (err) {
            setLoadError(sdkErrorMessage(err, "We couldn't load Goal of the Month. Check your connection and try again."));
        } finally {
            setLoading(false);
        }
    }, [tenant]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? 'Player';

    function addGoal() {
        if (!goalDesc.trim() || !goalPlayer) return;
        setNewGoals([...newGoals, { playerId: goalPlayer, description: goalDesc.trim(), videoUrl: goalVideo.trim() || undefined }]);
        setGoalDesc('');
        setGoalPlayer('');
        setGoalVideo('');
    }

    async function startVoting() {
        if (!newMonth || newGoals.length === 0) {
            setMessage({ tone: 'error', text: 'Pick a month and add at least one goal.' });
            return;
        }
        setBusy(true);
        setMessage(null);
        try {
            await createClientSDK(tenant).startGOTMVoting(newMonth, newYear, newGoals);
            setNewGoals([]);
            setNewMonth('');
            setMessage({ tone: 'success', text: 'Voting is open. Members can vote in the app.' });
            loadData();
        } catch (err) {
            setMessage({ tone: 'error', text: sdkErrorMessage(err, "Voting didn't open. Please try again.") });
        } finally {
            setBusy(false);
        }
    }

    async function closeVoting() {
        if (!voting || !confirm('Close voting and announce the winner?')) return;
        setBusy(true);
        setMessage(null);
        try {
            const result = await createClientSDK(tenant).closeGOTMVoting(voting.id);
            const winner = result.winner as { player_id?: string; description?: string } | undefined;
            setMessage({ tone: 'success', text: winner?.player_id ? `Voting closed. The winner is ${nameOf(winner.player_id)}${winner.description ? `: ${winner.description}` : ''}.` : 'Voting closed.' });
            loadData();
        } catch (err) {
            setMessage({ tone: 'error', text: sdkErrorMessage(err, "Voting didn't close. Please try again.") });
        } finally {
            setBusy(false);
        }
    }

    const totalVotes = candidates.reduce((n, c) => n + (c.votes || 0), 0);

    return (
        <div className="container py-8 md:py-10 max-w-5xl">
            <PageHeader eyebrow="Club admin" title="Goal of the Month" subtitle="Pick the best goals of the month and let the club vote for their favourite in the app." />

            {message && <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div>}

            {loading ? (
                <LoadingBlock label="Loading Goal of the Month" />
            ) : loadError ? (
                <ErrorNote message={loadError} onRetry={() => { setLoading(true); loadData(); }} />
            ) : voting && voting.status === 'open' ? (
                <section className="card" aria-labelledby="vote-title">
                    <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
                        <div>
                            <h2 id="vote-title" className="text-3xl">{voting.month} {voting.year}</h2>
                            <div className="mt-2 flex items-center gap-2"><Pill tone="success">Voting open</Pill><span className="text-sm text-muted">{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} so far</span></div>
                        </div>
                        <button type="button" onClick={closeVoting} disabled={busy} className="btn btn-danger">Close voting</button>
                    </div>
                    <ol className="space-y-2">
                        {candidates.map((c, i) => (
                            <li key={c.id} className="flex items-center gap-4 p-4 bg-surface-raised border border-border chamfer-sm">
                                <span className="font-display text-3xl font-extrabold text-muted w-8">{i + 1}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold">{nameOf(c.player_id)}</p>
                                    <p className="text-sm text-muted">{c.description}</p>
                                    {c.video_url && (
                                        <a href={c.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-brand mt-1 min-h-[32px]">
                                            <Icon name="play" className="w-4 h-4" /> Watch
                                        </a>
                                    )}
                                </div>
                                <span className="text-right">
                                    <span className="block font-display text-3xl font-extrabold text-brand">{c.votes}</span>
                                    <span className="text-xs text-muted uppercase tracking-wider">votes</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>
            ) : (
                <section className="card space-y-6" aria-labelledby="new-vote-title">
                    <h2 id="new-vote-title" className="text-2xl">Start a vote</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="gotm-month" className="label">Month</label>
                            <select id="gotm-month" value={newMonth} onChange={(e) => setNewMonth(e.target.value)} className="field">
                                <option value="">Pick a month</option>
                                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="gotm-year" className="label">Year</label>
                            <input id="gotm-year" type="number" inputMode="numeric" value={newYear} onChange={(e) => setNewYear(parseInt(e.target.value, 10) || new Date().getFullYear())} className="field" />
                        </div>
                    </div>

                    <fieldset className="space-y-3">
                        <legend className="font-display text-xl font-extrabold uppercase tracking-wide mb-2">Goals to vote on</legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label htmlFor="gotm-player" className="label">Scorer</label>
                                <select id="gotm-player" value={goalPlayer} onChange={(e) => setGoalPlayer(e.target.value)} className="field">
                                    <option value="">Pick a player</option>
                                    {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="gotm-desc" className="label">The goal</label>
                                <input id="gotm-desc" type="text" placeholder="e.g. Volley from 25 yards v Birstall" value={goalDesc} onChange={(e) => setGoalDesc(e.target.value)} className="field" />
                            </div>
                            <div>
                                <label htmlFor="gotm-video" className="label">Video link (optional)</label>
                                <input id="gotm-video" type="url" placeholder="https://…" value={goalVideo} onChange={(e) => setGoalVideo(e.target.value)} className="field" />
                            </div>
                        </div>
                        <button type="button" onClick={addGoal} disabled={!goalPlayer || !goalDesc.trim()} className="btn btn-secondary">
                            <Icon name="plus" className="w-4 h-4" /> Add goal
                        </button>
                        {newGoals.length > 0 ? (
                            <ol className="space-y-2">
                                {newGoals.map((g, i) => (
                                    <li key={i} className="flex items-center justify-between gap-3 px-4 py-2 bg-surface-raised border border-border chamfer-sm">
                                        <span className="min-w-0"><strong>{nameOf(g.playerId)}</strong> <span className="text-muted">· {g.description}</span></span>
                                        <button type="button" onClick={() => setNewGoals(newGoals.filter((_, j) => j !== i))} className="p-2.5 text-muted hover:text-red-400" aria-label={`Remove ${nameOf(g.playerId)}'s goal`}>
                                            <Icon name="trash" className="w-5 h-5" />
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <p className="text-sm text-muted">No goals added yet. Add two or three for a good vote.</p>
                        )}
                    </fieldset>

                    <button type="button" onClick={startVoting} disabled={busy || !newMonth || newGoals.length === 0} className="btn btn-primary w-full sm:w-auto">
                        <Icon name="vote" className="w-4 h-4" /> {busy ? 'Opening…' : 'Open voting'}
                    </button>
                </section>
            )}
        </div>
    );
}
