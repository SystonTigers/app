'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/session';
import { PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice, Pill } from '@/components/admin/AdminUi';
import {
    MAX_GOALS, goalSummary, newVoteBody, newVoteProblem, previousMonth, votesText,
    type GoalOption, type GotmData, type ManualGoal, type Vote,
} from '@/lib/gotm';

interface Player { id: string; name: string }

const NO_MANUAL: ManualGoal = { playerId: '', description: '', videoUrl: '' };

/**
 * Goal of the Month (staff): pick the month's best goals (from Match Centre
 * and match reports, or typed in), open the vote, watch the count and close
 * it to post the winner. Members vote in the app (Highlights → Goal of the Month).
 */
export default function GotmAdminPage() {
    const [data, setData] = useState<GotmData | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loadError, setLoadError] = useState('');
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoadError('');
        try {
            const [gotmRes, squadRes] = await Promise.all([apiFetch('/api/v1/gotm'), apiFetch('/api/v1/squad')]);
            if (!gotmRes.ok) throw new Error(await errorMessage(gotmRes, "We couldn't load Goal of the Month."));
            const body = await gotmRes.json();
            setData({ vote: body?.data?.vote ?? null, past: Array.isArray(body?.data?.past) ? body.data.past : [] });
            const squad = squadRes.ok ? await squadRes.json() : null;
            const rows: Array<{ id?: unknown; name?: unknown }> = Array.isArray(squad?.data) ? squad.data : [];
            setPlayers(rows.filter((r) => typeof r.id === 'string').map((r) => ({ id: String(r.id), name: String(r.name ?? 'Player') })));
        } catch (err) {
            setLoadError(err instanceof Error && err.message ? err.message : "We couldn't load Goal of the Month. Check your connection and try again.");
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const close = async (vote: Vote) => {
        if (!confirm(`Close voting for ${vote.label} and post the winner?`)) return;
        setBusy(true);
        setMessage(null);
        try {
            const res = await apiFetch('/api/v1/gotm/close', { method: 'POST', body: JSON.stringify({ votingId: vote.id }) });
            if (!res.ok) throw new Error(await errorMessage(res, "Voting didn't close. Please try again."));
            const out = (await res.json())?.data as { winners?: Array<{ name: string }>; votes?: number; posted?: boolean } | undefined;
            const names = (out?.winners ?? []).map((w) => w.name).join(' & ');
            setMessage({
                tone: 'success',
                text: names
                    ? `Voting closed. ${names} won with ${votesText(out?.votes ?? 0)}${out?.posted ? '. The winner post is on its way.' : '.'}`
                    : 'Voting closed. Nobody voted, so there is no winner this time.',
            });
            await load();
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "Voting didn't close. Please try again." });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="container py-8 md:py-10 max-w-5xl">
            <PageHeader
                eyebrow="Club admin"
                title="Goal of the Month"
                subtitle="Pick the month's best goals and everyone at the club votes in the app. Closing the vote posts the winner."
            />
            {message && <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div>}

            {loadError ? (
                <ErrorNote message={loadError} onRetry={() => { void load(); }} />
            ) : !data ? (
                <LoadingBlock label="Loading Goal of the Month" />
            ) : (
                <div className="space-y-8">
                    {data.vote ? (
                        <OpenVote vote={data.vote} busy={busy} onClose={() => close(data.vote as Vote)} />
                    ) : (
                        <NewVote
                            players={players}
                            onOpened={async (label) => { setMessage({ tone: 'success', text: `Voting for ${label} is open. Members vote in the app under Highlights.` }); await load(); }}
                        />
                    )}
                    {data.past.length > 0 && <PastWinners past={data.past} />}
                </div>
            )}
        </div>
    );
}

function OpenVote({ vote, busy, onClose }: { vote: Vote; busy: boolean; onClose: () => void }) {
    const total = vote.candidates.reduce((n, c) => n + (c.votes ?? 0), 0);
    const ranked = [...vote.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
    return (
        <section className="card" aria-labelledby="vote-title">
            <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
                <div>
                    <h2 id="vote-title" className="text-3xl">{vote.label}</h2>
                    <div className="mt-2 flex items-center gap-2">
                        <Pill tone="success">Voting open</Pill>
                        <span className="text-sm text-muted">{votesText(total)} so far</span>
                    </div>
                </div>
                <button type="button" onClick={onClose} disabled={busy} className="btn btn-primary">
                    <Icon name="trophy" className="w-4 h-4" /> {busy ? 'Closing…' : 'Close and post winner'}
                </button>
            </div>
            <ol className="space-y-2">
                {ranked.map((c, i) => {
                    const watch = c.clip?.watchUrl ?? c.videoUrl;
                    return (
                        <li key={c.id} className="flex items-center gap-4 p-4 bg-surface-raised border border-border chamfer-sm">
                            <span className="font-display text-3xl font-extrabold text-muted w-8 shrink-0">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">{c.playerName}</p>
                                <p className="text-sm text-muted">{[goalSummary(c), c.description].filter(Boolean).join(' · ')}</p>
                                {watch && (
                                    <a href={watch} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-brand mt-1 min-h-[32px]">
                                        <Icon name="play" className="w-4 h-4" /> Watch
                                    </a>
                                )}
                            </div>
                            <span className="text-right shrink-0">
                                <span className="block font-display text-3xl font-extrabold text-brand">{c.votes ?? 0}</span>
                                <span className="text-xs text-muted uppercase tracking-wider">{c.votes === 1 ? 'vote' : 'votes'}</span>
                            </span>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

function NewVote({ players, onOpened }: { players: Player[]; onOpened: (label: string) => Promise<void> }) {
    const [month, setMonth] = useState(previousMonth());
    const [goals, setGoals] = useState<GoalOption[] | null>(null);
    const [goalsError, setGoalsError] = useState('');
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [manual, setManual] = useState<ManualGoal[]>([]);
    const [draft, setDraft] = useState<ManualGoal>(NO_MANUAL);
    const [problem, setProblem] = useState('');
    const [opening, setOpening] = useState(false);

    const loadGoals = useCallback(async (m: string) => {
        setGoals(null);
        setGoalsError('');
        setPicked(new Set());
        if (!/^\d{4}-\d{2}$/.test(m)) { setGoals([]); return; }
        try {
            const res = await apiFetch(`/api/v1/gotm/goals?month=${encodeURIComponent(m)}`);
            if (!res.ok) throw new Error(await errorMessage(res, "We couldn't load that month's goals."));
            const body = await res.json();
            setGoals(Array.isArray(body?.data?.goals) ? body.data.goals : []);
        } catch (err) {
            setGoalsError(err instanceof Error ? err.message : "We couldn't load that month's goals.");
            setGoals([]);
        }
    }, []);

    useEffect(() => { void loadGoals(month); }, [month, loadGoals]);

    const count = picked.size + manual.length;
    const nameOf = useMemo(() => new Map(players.map((p) => [p.id, p.name])), [players]);

    const toggle = (eventId: string) => setPicked((prev) => {
        const next = new Set(prev);
        if (next.has(eventId)) next.delete(eventId);
        else if (next.size + manual.length < MAX_GOALS) next.add(eventId);
        return next;
    });

    const addManual = () => {
        if (!draft.playerId || !draft.description.trim()) return;
        setManual((m) => [...m, draft]);
        setDraft(NO_MANUAL);
    };

    const open = async () => {
        const why = newVoteProblem(month, count);
        if (why) { setProblem(why); return; }
        setProblem('');
        setOpening(true);
        try {
            const chosen = (goals ?? []).filter((g) => picked.has(g.eventId));
            const res = await apiFetch('/api/v1/gotm/start', { method: 'POST', body: JSON.stringify(newVoteBody(month, chosen, manual)) });
            if (!res.ok) throw new Error(await errorMessage(res, "Voting didn't open. Please try again."));
            const [y, m] = month.split('-').map(Number);
            await onOpened(new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }));
        } catch (err) {
            setProblem(err instanceof Error ? err.message : "Voting didn't open. Please try again.");
        } finally {
            setOpening(false);
        }
    };

    return (
        <section className="card space-y-6" aria-labelledby="new-vote-title">
            <div>
                <h2 id="new-vote-title" className="text-2xl">Start a vote</h2>
                <p className="text-sm text-muted mt-1">Pick 2 to {MAX_GOALS} goals. Goals with a match clip can be watched in the app.</p>
            </div>
            <div className="max-w-xs">
                <label htmlFor="gotm-month" className="label">Goals scored in</label>
                <input id="gotm-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="field" />
            </div>

            <fieldset>
                <legend className="font-display text-xl font-extrabold uppercase tracking-wide mb-3">Goals from Match Centre and match reports</legend>
                {goalsError ? (
                    <ErrorNote message={goalsError} onRetry={() => { void loadGoals(month); }} />
                ) : goals === null ? (
                    <LoadingBlock label="Loading the month's goals" rows={2} />
                ) : goals.length === 0 ? (
                    <p className="text-sm text-muted">No goals were recorded in that month. Add goals by hand below.</p>
                ) : (
                    <ul className="space-y-2">
                        {goals.map((g) => {
                            const on = picked.has(g.eventId);
                            return (
                                <li key={g.eventId}>
                                    <label className={`flex items-center gap-3 p-3 min-h-[52px] border chamfer-sm cursor-pointer ${on ? 'border-brand bg-brand/10' : 'border-border bg-surface-raised'}`}>
                                        <input type="checkbox" checked={on} onChange={() => toggle(g.eventId)} className="w-5 h-5 accent-[rgb(var(--brand-rgb))]" />
                                        <span className="min-w-0 flex-1">
                                            <span className="font-semibold block">{g.playerName}</span>
                                            <span className="text-sm text-muted">{goalSummary(g)}</span>
                                        </span>
                                        {g.hasClip && <span className="inline-flex items-center gap-1 text-xs text-brand shrink-0"><Icon name="video" className="w-4 h-4" /> Clip</span>}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </fieldset>

            <fieldset className="space-y-3">
                <legend className="font-display text-xl font-extrabold uppercase tracking-wide mb-1">Add a goal by hand</legend>
                <p className="text-sm text-muted">For goals that weren&apos;t recorded, e.g. from a friendly. Paste a video link if you have one.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label htmlFor="gotm-player" className="label">Scorer</label>
                        <select id="gotm-player" value={draft.playerId} onChange={(e) => setDraft({ ...draft, playerId: e.target.value })} className="field">
                            <option value="">Pick a player</option>
                            {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="gotm-desc" className="label">The goal</label>
                        <input id="gotm-desc" type="text" maxLength={120} placeholder="e.g. Volley from 25 yards v Birstall" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="field" />
                    </div>
                    <div>
                        <label htmlFor="gotm-video" className="label">Video link (optional)</label>
                        <input id="gotm-video" type="url" placeholder="https://…" value={draft.videoUrl} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })} className="field" />
                    </div>
                </div>
                <button type="button" onClick={addManual} disabled={!draft.playerId || !draft.description.trim() || count >= MAX_GOALS} className="btn btn-secondary">
                    <Icon name="plus" className="w-4 h-4" /> Add goal
                </button>
                {manual.length > 0 && (
                    <ul className="space-y-2">
                        {manual.map((g, i) => (
                            <li key={`${g.playerId}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2 bg-surface-raised border border-border chamfer-sm">
                                <span className="min-w-0"><strong>{nameOf.get(g.playerId) ?? 'Player'}</strong> <span className="text-muted">· {g.description}</span></span>
                                <button type="button" onClick={() => setManual(manual.filter((_, j) => j !== i))} className="p-2.5 text-muted hover:text-red-400" aria-label={`Remove ${nameOf.get(g.playerId) ?? 'this'} goal`}>
                                    <Icon name="trash" className="w-5 h-5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </fieldset>

            {problem && <p role="alert" className="text-sm text-red-400">{problem}</p>}
            <div className="flex flex-wrap items-center gap-4">
                <button type="button" onClick={open} disabled={opening || count === 0} className="btn btn-primary">
                    <Icon name="vote" className="w-4 h-4" /> {opening ? 'Opening…' : 'Open voting'}
                </button>
                <span className="text-sm text-muted">{count} of {MAX_GOALS} goals picked</span>
            </div>
        </section>
    );
}

function PastWinners({ past }: { past: Vote[] }) {
    return (
        <section aria-labelledby="past-title">
            <h2 id="past-title" className="text-2xl mb-3">Past winners</h2>
            <ul className="space-y-2">
                {past.map((v) => {
                    const winners = v.candidates.filter((c) => v.winners.includes(c.id));
                    return (
                        <li key={v.id} className="card flex items-center gap-4 py-4">
                            <span className="w-10 h-10 hexagon bg-brand/15 text-brand flex items-center justify-center shrink-0"><Icon name="trophy" className="w-5 h-5" /></span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-xs text-muted uppercase tracking-wider">{v.label}</span>
                                <span className="block font-semibold">{winners.map((w) => w.playerName).join(' & ')}</span>
                                {winners.length === 1 && <span className="block text-sm text-muted">{goalSummary(winners[0])}</span>}
                            </span>
                            {winners[0]?.votes != null && <span className="text-sm text-muted shrink-0">{votesText(winners[0].votes)}</span>}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
