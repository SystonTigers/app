'use client';

import { useCallback, useEffect, useState, use } from 'react';
import { createClientSDK } from '@/lib/sdk';
import { formatDateTime } from '@/lib/format';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { Dialog, ErrorNote, LoadingBlock, Notice, Pill, sdkErrorMessage } from '@/components/admin/AdminUi';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

interface LMSGame {
    id: string;
    name: string;
    sport: string;
    competition?: string;
    status: 'active' | 'completed';
    round_number: number;
    total_entries: number;
    alive_entries: number;
    winner_name?: string;
}

interface LMSEntry {
    id: string;
    user_name: string;
    status: 'alive' | 'eliminated' | 'winner';
    streak: number;
    teams_used: string[];
    eliminated_round?: number;
}

interface Fixture {
    id: string;
    home: string;
    away: string;
    kickoff?: number;
    homeScore?: number;
    awayScore?: number;
}

interface LMSRound {
    id: string;
    round_number: number;
    name: string;
    deadline: number;
    status: 'open' | 'locked' | 'processed';
    fixtures: Fixture[];
}

interface NewFixture {
    home: string;
    away: string;
    kickoff: string;
}

const ROUND_STATUS: Record<LMSRound['status'], { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
    open: { label: 'Open for picks', tone: 'success' },
    locked: { label: 'Picks closed', tone: 'warning' },
    processed: { label: 'Done', tone: 'neutral' },
};

/** Last Man Standing: members pick a team each round and are out if it doesn't win. */
export default function LMSAdminPage({ params }: PageProps) {
    const { tenant } = use(params);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [games, setGames] = useState<LMSGame[]>([]);
    const [selectedGame, setSelectedGame] = useState<LMSGame | null>(null);
    const [standings, setStandings] = useState<LMSEntry[]>([]);
    const [currentRound, setCurrentRound] = useState<LMSRound | null>(null);
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const [dialog, setDialog] = useState<'game' | 'round' | 'process' | null>(null);
    const [dialogError, setDialogError] = useState('');
    const [busy, setBusy] = useState(false);

    const [newGameName, setNewGameName] = useState('');
    const [newGameCompetition, setNewGameCompetition] = useState('');
    const [roundName, setRoundName] = useState('');
    const [fixtures, setFixtures] = useState<NewFixture[]>([{ home: '', away: '', kickoff: '' }]);
    const [fixtureResults, setFixtureResults] = useState<Array<{ id: string; homeScore: string; awayScore: string }>>([]);

    const sdk = createClientSDK(tenant);

    const loadGames = useCallback(async () => {
        setLoadError('');
        try {
            setGames((await createClientSDK(tenant).getLMSGames()) as LMSGame[]);
        } catch (err) {
            setLoadError(sdkErrorMessage(err, "We couldn't load your games. Check your connection and try again."));
        } finally {
            setLoading(false);
        }
    }, [tenant]);

    useEffect(() => {
        loadGames();
    }, [loadGames]);

    async function loadGameDetails(gameId: string) {
        setMessage(null);
        try {
            const data = await sdk.getLMSGame(gameId);
            if (!data?.success) throw new Error();
            setSelectedGame(data.game as LMSGame);
            setStandings((data.standings ?? []) as LMSEntry[]);
            const round = (data.currentRound ?? null) as LMSRound | null;
            setCurrentRound(round);
            setFixtureResults((round?.fixtures ?? []).map((f) => ({ id: f.id, homeScore: f.homeScore?.toString() ?? '', awayScore: f.awayScore?.toString() ?? '' })));
        } catch (err) {
            setMessage({ tone: 'error', text: sdkErrorMessage(err, "That game didn't load. Please try again.") });
        }
    }

    async function run(action: () => Promise<unknown>, done: string, fallback: string): Promise<boolean> {
        setBusy(true);
        setDialogError('');
        try {
            await action();
            setMessage({ tone: 'success', text: done });
            return true;
        } catch (err) {
            const text = sdkErrorMessage(err, fallback);
            if (dialog) setDialogError(text);
            else setMessage({ tone: 'error', text });
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function createGame(e: React.FormEvent) {
        e.preventDefault();
        if (!newGameName.trim()) return setDialogError('Give the game a name.');
        if (await run(() => sdk.createLMSGame({ name: newGameName.trim(), sport: 'football', competition: newGameCompetition.trim() || undefined }), `${newGameName.trim()} created.`, "The game wasn't created. Please try again.")) {
            setNewGameName('');
            setNewGameCompetition('');
            setDialog(null);
            loadGames();
        }
    }

    async function createRound(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedGame) return;
        const valid = fixtures.filter((f) => f.home.trim() && f.away.trim());
        if (!valid.length) return setDialogError('Add at least one match.');
        if (await run(() => sdk.createLMSRound(selectedGame.id, {
            name: roundName.trim() || undefined,
            fixtures: valid.map((f) => ({ home: f.home.trim(), away: f.away.trim(), kickoff: f.kickoff ? new Date(f.kickoff).getTime() : undefined })),
        }), 'Round created. Members can make their picks.', "The round wasn't created. Please try again.")) {
            setDialog(null);
            setRoundName('');
            setFixtures([{ home: '', away: '', kickoff: '' }]);
            loadGameDetails(selectedGame.id);
        }
    }

    async function processRound(e: React.FormEvent) {
        e.preventDefault();
        if (!currentRound) return;
        const results = fixtureResults.map((f) => ({ id: f.id, homeScore: parseInt(f.homeScore, 10) || 0, awayScore: parseInt(f.awayScore, 10) || 0 }));
        setBusy(true);
        setDialogError('');
        try {
            const result = await sdk.processLMSRound(currentRound.id, results);
            if (!result?.success) throw new Error();
            const s = result.summary ?? {};
            setMessage({ tone: 'success', text: `Round done: ${s.survived ?? 0} through, ${s.eliminated ?? 0} out.${s.gameOver ? ' The game is over.' : ''}` });
            setDialog(null);
            if (selectedGame) loadGameDetails(selectedGame.id);
        } catch (err) {
            setDialogError(sdkErrorMessage(err, "The results weren't saved. Please try again."));
        } finally {
            setBusy(false);
        }
    }

    async function resetGame() {
        if (!selectedGame || !confirm('Start this game again? All rounds and picks are deleted.')) return;
        if (await run(() => sdk.resetLMSGame(selectedGame.id), 'Game started again.', "The game wasn't reset. Please try again.")) loadGameDetails(selectedGame.id);
    }

    const updateFixture = (i: number, field: keyof NewFixture, value: string) => setFixtures(fixtures.map((f, j) => (j === i ? { ...f, [field]: value } : f)));
    const updateResult = (i: number, field: 'homeScore' | 'awayScore', value: string) => setFixtureResults(fixtureResults.map((f, j) => (j === i ? { ...f, [field]: value } : f)));
    const openDialog = (d: 'game' | 'round' | 'process') => { setDialogError(''); setDialog(d); };

    return (
        <div className="container py-8 md:py-10">
            <PageHeader
                eyebrow="Club admin"
                title="Last Man Standing"
                subtitle="A club fundraiser game: each round, members pick a team to win. Pick a loser and you're out."
                actions={<button type="button" onClick={() => openDialog('game')} className="btn btn-primary"><Icon name="plus" className="w-4 h-4" /> New game</button>}
            />

            {message && <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div>}

            {loading ? (
                <LoadingBlock label="Loading games" />
            ) : loadError ? (
                <ErrorNote message={loadError} onRetry={() => { setLoading(true); loadGames(); }} />
            ) : games.length === 0 ? (
                <EmptyNote icon="target" title="No games yet" action={<button type="button" onClick={() => openDialog('game')} className="btn btn-primary">Create a game</button>}>
                    Create a game, add the first round&apos;s matches and members join in the app.
                </EmptyNote>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <section className="card" aria-labelledby="games-title">
                        <h2 id="games-title" className="text-2xl mb-3">Games</h2>
                        <ul className="space-y-2">
                            {games.map((game) => (
                                <li key={game.id}>
                                    <button type="button" onClick={() => loadGameDetails(game.id)} aria-current={selectedGame?.id === game.id ? 'true' : undefined}
                                        className={`w-full text-left p-3 border transition-colors ${selectedGame?.id === game.id ? 'border-brand bg-brand/10' : 'border-border bg-surface-raised hover:border-brand/50'}`}>
                                        <span className="block font-semibold">{game.name}</span>
                                        <span className="text-xs text-muted">Round {game.round_number} · {game.alive_entries} of {game.total_entries} still in · {game.status === 'active' ? 'On' : 'Finished'}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <div className="lg:col-span-2 space-y-6">
                        {!selectedGame ? (
                            <p className="text-muted">Pick a game to see its rounds and who&apos;s still in.</p>
                        ) : (
                            <>
                                <section className="card flex flex-wrap justify-between items-start gap-3">
                                    <div>
                                        <h2 className="text-3xl">{selectedGame.name}</h2>
                                        <p className="text-muted">{selectedGame.competition || 'No competition set'}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {currentRound?.status === 'open' && <button type="button" onClick={() => openDialog('process')} className="btn btn-sm btn-primary">Enter results</button>}
                                        {(!currentRound || currentRound.status === 'processed') && <button type="button" onClick={() => openDialog('round')} className="btn btn-sm btn-primary"><Icon name="plus" className="w-4 h-4" /> New round</button>}
                                        <button type="button" onClick={resetGame} disabled={busy} className="btn btn-sm btn-danger">Start again</button>
                                    </div>
                                </section>

                                {currentRound && (
                                    <section className="card">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h3 className="text-xl">{currentRound.name || `Round ${currentRound.round_number}`}</h3>
                                            <Pill tone={ROUND_STATUS[currentRound.status].tone}>{ROUND_STATUS[currentRound.status].label}</Pill>
                                        </div>
                                        <p className="text-sm text-muted mb-3">Picks close {formatDateTime(currentRound.deadline)}</p>
                                        <ul className="space-y-2">
                                            {currentRound.fixtures.map((f, i) => (
                                                <li key={f.id || i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 bg-surface-raised border border-border">
                                                    <span className="text-right font-semibold truncate">{f.home}</span>
                                                    <span className="font-display font-bold text-muted px-2">{f.homeScore !== undefined ? `${f.homeScore}–${f.awayScore}` : 'v'}</span>
                                                    <span className="font-semibold truncate">{f.away}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                )}

                                <section className="card p-0">
                                    <h3 className="text-xl px-6 pt-6 pb-3">Who&apos;s in ({standings.length})</h3>
                                    <div className="table-scroll relative">
                                        <table className="w-full min-w-[480px] text-sm">
                                            <thead>
                                                <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
                                                    <th scope="col" className="px-6 py-2">Name</th>
                                                    <th scope="col" className="px-2 py-2">Status</th>
                                                    <th scope="col" className="px-2 py-2">Streak</th>
                                                    <th scope="col" className="px-6 py-2">Teams used</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {standings.map((entry) => (
                                                    <tr key={entry.id}>
                                                        <td className="px-6 py-2 font-semibold">{entry.user_name}</td>
                                                        <td className="px-2 py-2">
                                                            <Pill tone={entry.status === 'alive' ? 'success' : entry.status === 'winner' ? 'warning' : 'danger'}>
                                                                {entry.status === 'alive' ? 'Still in' : entry.status === 'winner' ? 'Winner' : `Out${entry.eliminated_round ? ` (round ${entry.eliminated_round})` : ''}`}
                                                            </Pill>
                                                        </td>
                                                        <td className="px-2 py-2">{entry.streak}</td>
                                                        <td className="px-6 py-2 text-muted">{entry.teams_used?.join(', ') || '–'}</td>
                                                    </tr>
                                                ))}
                                                {standings.length === 0 && <tr><td colSpan={4} className="px-6 py-6 text-center text-muted">Nobody has joined yet.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </>
                        )}
                    </div>
                </div>
            )}

            {dialog === 'game' && (
                <Dialog title="New game" onClose={() => setDialog(null)}>
                    <form onSubmit={createGame} className="space-y-4" noValidate>
                        <div>
                            <label htmlFor="lms-name" className="label">Name</label>
                            <input id="lms-name" type="text" value={newGameName} onChange={(e) => setNewGameName(e.target.value)} placeholder="e.g. Premier League survivor" className="field" />
                        </div>
                        <div>
                            <label htmlFor="lms-competition" className="label">Competition (optional)</label>
                            <input id="lms-competition" type="text" value={newGameCompetition} onChange={(e) => setNewGameCompetition(e.target.value)} placeholder="e.g. Premier League" className="field" />
                        </div>
                        {dialogError && <Notice tone="error">{dialogError}</Notice>}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                            <button type="button" onClick={() => setDialog(null)} className="btn btn-ghost">Cancel</button>
                            <button type="submit" disabled={busy} className="btn btn-primary">Create game</button>
                        </div>
                    </form>
                </Dialog>
            )}

            {dialog === 'round' && (
                <Dialog title={`Round ${(selectedGame?.round_number ?? 0) + 1}`} onClose={() => setDialog(null)} wide>
                    <form onSubmit={createRound} className="space-y-4" noValidate>
                        <div>
                            <label htmlFor="round-name" className="label">Round name (optional)</label>
                            <input id="round-name" type="text" value={roundName} onChange={(e) => setRoundName(e.target.value)} placeholder="e.g. Gameweek 8" className="field" />
                        </div>
                        <fieldset className="space-y-3">
                            <legend className="label">Matches</legend>
                            {fixtures.map((f, i) => (
                                <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] sm:grid-cols-[1fr_auto_1fr_180px_auto] gap-2 items-center">
                                    <input type="text" aria-label={`Match ${i + 1} home team`} placeholder="Home" value={f.home} onChange={(e) => updateFixture(i, 'home', e.target.value)} className="field px-3" />
                                    <span className="text-muted">v</span>
                                    <input type="text" aria-label={`Match ${i + 1} away team`} placeholder="Away" value={f.away} onChange={(e) => updateFixture(i, 'away', e.target.value)} className="field px-3" />
                                    <input type="datetime-local" aria-label={`Match ${i + 1} kick-off`} value={f.kickoff} onChange={(e) => updateFixture(i, 'kickoff', e.target.value)} className="field px-2 hidden sm:block" />
                                    <button type="button" onClick={() => setFixtures(fixtures.filter((_, j) => j !== i))} disabled={fixtures.length === 1} className="p-2.5 text-muted hover:text-red-400" aria-label={`Remove match ${i + 1}`}>
                                        <Icon name="close" className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={() => setFixtures([...fixtures, { home: '', away: '', kickoff: '' }])} className="btn btn-sm btn-ghost px-0 text-brand"><Icon name="plus" className="w-4 h-4" /> Add a match</button>
                        </fieldset>
                        {dialogError && <Notice tone="error">{dialogError}</Notice>}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                            <button type="button" onClick={() => setDialog(null)} className="btn btn-ghost">Cancel</button>
                            <button type="submit" disabled={busy} className="btn btn-primary">Create round</button>
                        </div>
                    </form>
                </Dialog>
            )}

            {dialog === 'process' && currentRound && (
                <Dialog title="Enter the results" onClose={() => setDialog(null)}>
                    <form onSubmit={processRound} className="space-y-3" noValidate>
                        {currentRound.fixtures.map((f, i) => (
                            <div key={f.id} className="grid grid-cols-[1fr_56px_auto_56px_1fr] items-center gap-2">
                                <span className="text-right text-sm font-semibold truncate">{f.home}</span>
                                <input type="number" inputMode="numeric" min={0} aria-label={`${f.home} goals`} value={fixtureResults[i]?.homeScore ?? ''} onChange={(e) => updateResult(i, 'homeScore', e.target.value)} className="field px-1 text-center" />
                                <span className="text-muted">–</span>
                                <input type="number" inputMode="numeric" min={0} aria-label={`${f.away} goals`} value={fixtureResults[i]?.awayScore ?? ''} onChange={(e) => updateResult(i, 'awayScore', e.target.value)} className="field px-1 text-center" />
                                <span className="text-sm font-semibold truncate">{f.away}</span>
                            </div>
                        ))}
                        {dialogError && <Notice tone="error">{dialogError}</Notice>}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setDialog(null)} className="btn btn-ghost">Cancel</button>
                            <button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save results'}</button>
                        </div>
                    </form>
                </Dialog>
            )}
        </div>
    );
}
