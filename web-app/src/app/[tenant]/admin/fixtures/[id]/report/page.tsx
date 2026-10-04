'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { findClub } from '@/lib/club';
import { useRouter } from 'next/navigation';
import { createClientSDK } from '@/lib/sdk';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDate } from '@/lib/format';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice, sdkErrorMessage } from '@/components/admin/AdminUi';

interface PageProps {
    params: Promise<{ tenant: string; id: string }>;
}

type EventType = 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'motm' | 'sub_on' | 'sub_off';

interface MatchEvent {
    playerId: string;
    eventType: EventType;
    minute?: number;
    relatedPlayerId?: string; // For subs: the player being replaced
}

interface Player {
    id: string;
    name: string;
    number?: number | null;
}

interface FixtureInfo {
    id: string;
    opponent: string | null;
    awayTeam: string;
    homeTeam: string;
    date: string;
    homeScore: number | null;
    awayScore: number | null;
}

const EVENT_TYPES: Array<{ value: Exclude<EventType, 'sub_off'>; label: string; icon: IconName; tone: string }> = [
    { value: 'goal', label: 'Goal', icon: 'ball', tone: 'text-brand' },
    { value: 'assist', label: 'Assist', icon: 'arrowRight', tone: 'text-brand' },
    { value: 'yellow_card', label: 'Yellow card', icon: 'card', tone: 'text-amber-400' },
    { value: 'red_card', label: 'Red card', icon: 'card', tone: 'text-red-400' },
    { value: 'motm', label: 'Man of the Match', icon: 'star', tone: 'text-amber-300' },
    { value: 'sub_on', label: 'Substitution', icon: 'refresh', tone: 'text-muted' },
];

const EVENT_LABEL: Record<EventType, { label: string; icon: IconName; tone: string }> = {
    goal: EVENT_TYPES[0],
    assist: EVENT_TYPES[1],
    yellow_card: EVENT_TYPES[2],
    red_card: EVENT_TYPES[3],
    motm: EVENT_TYPES[4],
    sub_on: { label: 'Came on', icon: 'login', tone: 'text-green-400' },
    sub_off: { label: 'Went off', icon: 'logout', tone: 'text-muted' },
};

const MAX_STARTERS = 11;
const MAX_SUBS = 7;

export default function MatchReportPage({ params }: PageProps) {
    const { tenant, id: fixtureId } = use(params);
    // Clubs that don't record assists aren't offered them
    const [withAssists, setWithAssists] = useState(true);
    useEffect(() => {
        findClub(tenant).then((club) => setWithAssists(club?.trackAssists !== false)).catch(() => undefined);
    }, [tenant]);
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [players, setPlayers] = useState<Player[]>([]);
    const [fixture, setFixture] = useState<FixtureInfo | null>(null);

    // Form state
    const [homeScore, setHomeScore] = useState(0);
    const [awayScore, setAwayScore] = useState(0);
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [skippedEvents, setSkippedEvents] = useState(0);

    // New event
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [selectedType, setSelectedType] = useState<Exclude<EventType, 'sub_off'>>('goal');
    const [minute, setMinute] = useState('');
    const [subPlayerOff, setSubPlayerOff] = useState('');

    // Line-up
    const [startingXI, setStartingXI] = useState<string[]>([]);
    const [subs, setSubs] = useState<string[]>([]);

    const loadData = useCallback(async () => {
        setLoadError('');
        try {
            const sdk = createClientSDK(tenant);
            const [squadRes, report, fixturesRes] = await Promise.all([
                apiFetch('/api/v1/squad'),
                sdk.getMatchReport(fixtureId).catch(() => ({ success: false, events: [] as unknown[] })),
                apiFetch('/api/v1/fixtures').catch(() => null),
            ]);
            if (!squadRes.ok) throw new Error(await errorMessage(squadRes, "We couldn't load your squad."));
            const squadBody = await squadRes.json();
            const rows: Array<{ id: unknown; name?: unknown; number?: unknown }> = Array.isArray(squadBody?.data) ? squadBody.data : [];
            setPlayers(rows.map((r) => ({ id: String(r.id), name: String(r.name ?? ''), number: r.number == null ? null : Number(r.number) })));

            // The server sends its rows (player_id, event_type); the form works in playerId/eventType
            const rowsIn: Array<Record<string, unknown>> = Array.isArray(report?.events) ? report.events : [];
            const loaded: MatchEvent[] = [];
            const starters: string[] = [];
            let skipped = 0;
            for (const row of rowsIn) {
                const playerId = String(row.player_id ?? row.playerId ?? '');
                const type = String(row.event_type ?? row.eventType ?? '');
                const minuteIn = row.minute == null ? undefined : Number(row.minute);
                if (!playerId) continue;
                if (type === 'appearance') {
                    if (starters.length < MAX_STARTERS && !starters.includes(playerId)) starters.push(playerId);
                } else if (type in EVENT_LABEL) {
                    loaded.push({ playerId, eventType: type as EventType, minute: Number.isFinite(minuteIn) ? minuteIn : undefined });
                } else {
                    skipped += 1;
                }
            }
            setEvents(loaded);
            setStartingXI(starters);
            setSkippedEvents(skipped);

            if (fixturesRes?.ok) {
                const list: FixtureInfo[] = (await fixturesRes.json())?.data ?? [];
                const found = list.find((f) => f.id === fixtureId) ?? null;
                setFixture(found);
                if (found?.homeScore != null) setHomeScore(found.homeScore);
                if (found?.awayScore != null) setAwayScore(found.awayScore);
            }
        } catch (err) {
            setLoadError(err instanceof Error && err.message ? err.message : "We couldn't load this match. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, [tenant, fixtureId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const nameOf = (id?: string) => {
        const p = players.find((x) => x.id === id);
        return p ? p.name : 'Player not in the squad';
    };
    const playerLabel = (p: Player) => `${p.number != null ? `${p.number}. ` : ''}${p.name}`;

    function addEvent() {
        if (!selectedPlayer) return;
        const at = minute ? Math.min(Math.max(parseInt(minute, 10) || 0, 0), 150) : undefined;
        if (selectedType === 'sub_on') {
            if (!subPlayerOff) return;
            setEvents([
                ...events,
                { playerId: subPlayerOff, eventType: 'sub_off', minute: at, relatedPlayerId: selectedPlayer },
                { playerId: selectedPlayer, eventType: 'sub_on', minute: at, relatedPlayerId: subPlayerOff },
            ]);
            setSubPlayerOff('');
        } else {
            setEvents([...events, { playerId: selectedPlayer, eventType: selectedType, minute: at }]);
        }
        setSelectedPlayer('');
        setMinute('');
    }

    function toggleStartingXI(playerId: string) {
        if (startingXI.includes(playerId)) {
            setStartingXI(startingXI.filter((id) => id !== playerId));
        } else if (startingXI.length < MAX_STARTERS) {
            setStartingXI([...startingXI, playerId]);
            setSubs(subs.filter((id) => id !== playerId));
        }
    }

    function toggleSubs(playerId: string) {
        if (subs.includes(playerId)) {
            setSubs(subs.filter((id) => id !== playerId));
        } else if (subs.length < MAX_SUBS) {
            setSubs([...subs, playerId]);
            setStartingXI(startingXI.filter((id) => id !== playerId));
        }
    }

    function removeEvent(index: number) {
        setEvents(events.filter((_, i) => i !== index));
    }

    async function handleSave() {
        setSaving(true);
        setSaveError('');
        try {
            await createClientSDK(tenant).saveMatchReport(fixtureId, {
                homeScore,
                awayScore,
                events,
                lineup: { starters: startingXI, subs },
            });
            router.push(`/${tenant}/admin/fixtures`);
        } catch (err) {
            setSaveError(sdkErrorMessage(err, "The match report didn't save. Please try again."));
        } finally {
            setSaving(false);
        }
    }

    const back = (
        <Link href={`/${tenant}/admin/fixtures`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand mb-4 min-h-[40px]">
            <Icon name="arrowLeft" className="w-4 h-4" /> Fixtures
        </Link>
    );

    if (loading) return <div className="container py-8 md:py-10 max-w-5xl">{back}<LoadingBlock label="Loading the match" /></div>;
    if (loadError) return <div className="container py-8 md:py-10 max-w-5xl">{back}<ErrorNote message={loadError} onRetry={() => { setLoading(true); loadData(); }} /></div>;

    const opponent = fixture ? fixture.opponent || (fixture.awayTeam === 'Opponent' ? fixture.homeTeam : fixture.awayTeam) : null;
    const sorted = events.map((ev, i) => ({ ev, i })).sort((a, b) => (a.ev.minute ?? 999) - (b.ev.minute ?? 999));

    return (
        <div className="container py-8 md:py-10 max-w-5xl">
            {back}
            <PageHeader
                eyebrow="Match report"
                title={opponent ? `vs ${opponent}` : 'Match report'}
                subtitle={fixture ? `${formatDate(fixture.date)}. Saving the report saves the result, the stats and the league table.` : 'Saving the report saves the result, the stats and the league table.'}
            />

            {players.length === 0 ? (
                <EmptyNote icon="users" title="Add your squad first" action={<Link href={`/${tenant}/admin/squad`} className="btn btn-primary">Go to the squad</Link>}>
                    A match report records what your players did, so the squad needs players in it first.
                </EmptyNote>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Score */}
                        <section className="card" aria-labelledby="score-title">
                            <h2 id="score-title" className="text-2xl mb-4">Full-time score</h2>
                            <div className="flex items-end justify-center gap-4">
                                <div className="text-center">
                                    <label htmlFor="score-us" className="label">Us</label>
                                    <input id="score-us" type="number" inputMode="numeric" min={0} max={99} value={homeScore}
                                        onChange={(e) => setHomeScore(Math.min(Math.max(parseInt(e.target.value, 10) || 0, 0), 99))}
                                        className="field w-24 text-center font-display text-4xl font-extrabold px-2" />
                                </div>
                                <span className="font-display text-4xl text-muted pb-3" aria-hidden="true">–</span>
                                <div className="text-center">
                                    <label htmlFor="score-them" className="label">Them</label>
                                    <input id="score-them" type="number" inputMode="numeric" min={0} max={99} value={awayScore}
                                        onChange={(e) => setAwayScore(Math.min(Math.max(parseInt(e.target.value, 10) || 0, 0), 99))}
                                        className="field w-24 text-center font-display text-4xl font-extrabold px-2" />
                                </div>
                            </div>
                        </section>

                        {/* Add an event */}
                        <section className="card space-y-3" aria-labelledby="event-title">
                            <h2 id="event-title" className="text-2xl">Add what happened</h2>
                            <div>
                                <label htmlFor="event-type" className="label">What</label>
                                <select id="event-type" value={selectedType} onChange={(e) => setSelectedType(e.target.value as Exclude<EventType, 'sub_off'>)} className="field">
                                    {EVENT_TYPES.filter((t) => withAssists || t.value !== 'assist').map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-[1fr_90px] gap-3">
                                <div>
                                    <label htmlFor="event-player" className="label">{selectedType === 'sub_on' ? 'Coming on' : 'Who'}</label>
                                    <select id="event-player" value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)} className="field">
                                        <option value="">Pick a player</option>
                                        {players.map((p) => <option key={p.id} value={p.id}>{playerLabel(p)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="event-minute" className="label">Minute</label>
                                    <input id="event-minute" type="number" inputMode="numeric" min={0} max={150} placeholder="–" value={minute} onChange={(e) => setMinute(e.target.value)} className="field px-3 text-center" />
                                </div>
                            </div>
                            {selectedType === 'sub_on' && (
                                <div>
                                    <label htmlFor="event-off" className="label">Going off</label>
                                    <select id="event-off" value={subPlayerOff} onChange={(e) => setSubPlayerOff(e.target.value)} className="field">
                                        <option value="">Pick a player</option>
                                        {players.filter((p) => p.id !== selectedPlayer).map((p) => <option key={p.id} value={p.id}>{playerLabel(p)}</option>)}
                                    </select>
                                </div>
                            )}
                            <button type="button" onClick={addEvent} disabled={!selectedPlayer || (selectedType === 'sub_on' && !subPlayerOff)} className="btn btn-secondary w-full">
                                <Icon name="plus" className="w-4 h-4" /> Add to the report
                            </button>
                        </section>
                    </div>

                    {/* Line-up */}
                    <section className="card" aria-labelledby="lineup-title">
                        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                            <h2 id="lineup-title" className="text-2xl">Line-up</h2>
                            <p className="text-sm text-muted">Starting {startingXI.length}/{MAX_STARTERS} · Subs {subs.length}/{MAX_SUBS}</p>
                        </div>
                        <p className="text-sm text-muted mb-4">Everyone who started or was a sub gets a game in their stats. Leave it empty if you don&apos;t want to record it.</p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {players.map((p) => {
                                const starting = startingXI.includes(p.id);
                                const sub = subs.includes(p.id);
                                return (
                                    <li key={p.id} className={`flex items-center justify-between gap-2 px-3 py-2 border chamfer-sm ${starting ? 'border-brand/60 bg-brand/10' : sub ? 'border-border bg-surface-raised' : 'border-border'}`}>
                                        <span className="truncate font-semibold">{playerLabel(p)}</span>
                                        <span className="flex gap-1 shrink-0" role="group" aria-label={`${p.name} in the line-up`}>
                                            <button type="button" aria-pressed={starting} onClick={() => toggleStartingXI(p.id)} disabled={!starting && startingXI.length >= MAX_STARTERS}
                                                className={`btn btn-sm px-3 ${starting ? 'btn-primary' : 'btn-ghost'}`}>Start</button>
                                            <button type="button" aria-pressed={sub} onClick={() => toggleSubs(p.id)} disabled={!sub && subs.length >= MAX_SUBS}
                                                className={`btn btn-sm px-3 ${sub ? 'btn-outline' : 'btn-ghost'}`}>Sub</button>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    {/* Timeline */}
                    <section className="card" aria-labelledby="events-title">
                        <h2 id="events-title" className="text-2xl mb-4">In the report</h2>
                        {events.length === 0 ? (
                            <p className="text-muted">Nothing added yet. Add goals, {withAssists ? 'assists, ' : ''}cards, subs and Man of the Match above.</p>
                        ) : (
                            <ul className="divide-y divide-border">
                                {sorted.map(({ ev, i }) => {
                                    const t = EVENT_LABEL[ev.eventType];
                                    return (
                                        <li key={i} className="flex items-center gap-3 py-2.5">
                                            <span className="w-10 text-right font-display text-lg font-bold text-muted tabular-nums">{ev.minute != null ? `${ev.minute}'` : '–'}</span>
                                            <Icon name={t.icon} className={`w-5 h-5 ${t.tone}`} />
                                            <span className="min-w-0 flex-1">
                                                <span className="font-semibold">{nameOf(ev.playerId)}</span>
                                                <span className="text-muted"> · {t.label}</span>
                                                {ev.relatedPlayerId && <span className="block text-xs text-muted">{ev.eventType === 'sub_on' ? 'for' : 'replaced by'} {nameOf(ev.relatedPlayerId)}</span>}
                                            </span>
                                            <button type="button" onClick={() => removeEvent(i)} className="p-2.5 text-muted hover:text-red-400" aria-label={`Remove ${t.label.toLowerCase()} for ${nameOf(ev.playerId)}`}>
                                                <Icon name="trash" className="w-5 h-5" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {skippedEvents > 0 && (
                        <Notice tone="info">
                            {skippedEvents === 1 ? 'One thing' : `${skippedEvents} things`} recorded in Match Centre (such as a sin bin) can&apos;t be shown here. Saving this report replaces everything for the match, so they would be removed. Change them in Match Centre instead if you need to keep them.
                        </Notice>
                    )}
                    {saveError && <Notice tone="error">{saveError}</Notice>}
                    <div className="flex justify-end">
                        <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary w-full sm:w-auto">
                            {saving ? 'Saving…' : 'Save match report'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
