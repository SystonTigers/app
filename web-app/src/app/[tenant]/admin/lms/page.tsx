'use client';

import { useState, useEffect, use } from 'react';
import { createClientSDK } from '@/lib/sdk';

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
    user_id: string;
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

export default function LMSAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const sdk = createClientSDK(tenant);

    const [loading, setLoading] = useState(true);
    const [games, setGames] = useState<LMSGame[]>([]);
    const [selectedGame, setSelectedGame] = useState<LMSGame | null>(null);
    const [standings, setStandings] = useState<LMSEntry[]>([]);
    const [currentRound, setCurrentRound] = useState<LMSRound | null>(null);

    // New game form
    const [newGameName, setNewGameName] = useState('');
    const [newGameCompetition, setNewGameCompetition] = useState('');
    const [showNewGameForm, setShowNewGameForm] = useState(false);

    // New round form
    const [showRoundForm, setShowRoundForm] = useState(false);
    const [roundName, setRoundName] = useState('');
    const [fixtures, setFixtures] = useState<Array<{ home: string; away: string; kickoff: string }>>([
        { home: '', away: '', kickoff: '' }
    ]);

    // Process round form
    const [showProcessForm, setShowProcessForm] = useState(false);
    const [fixtureResults, setFixtureResults] = useState<Array<{ id: string; homeScore: string; awayScore: string }>>([]);

    useEffect(() => {
        loadGames();
    }, [tenant]);

    async function loadGames() {
        try {
            const gamesData = await sdk.getLMSGames();
            setGames(gamesData);
        } catch (err) {
            console.error('Failed to load LMS games:', err);
        } finally {
            setLoading(false);
        }
    }

    async function loadGameDetails(gameId: string) {
        try {
            const data = await sdk.getLMSGame(gameId);
            if (data.success) {
                setSelectedGame(data.game);
                setStandings(data.standings || []);
                setCurrentRound(data.currentRound);

                if (data.currentRound?.fixtures) {
                    setFixtureResults(data.currentRound.fixtures.map((f: Fixture) => ({
                        id: f.id,
                        homeScore: f.homeScore?.toString() || '',
                        awayScore: f.awayScore?.toString() || ''
                    })));
                }
            }
        } catch (err) {
            console.error('Failed to load game details:', err);
        }
    }

    async function createGame() {
        if (!newGameName.trim()) {
            alert('Please enter a game name');
            return;
        }

        try {
            await sdk.createLMSGame({
                name: newGameName,
                sport: 'football',
                competition: newGameCompetition || undefined
            });
            setNewGameName('');
            setNewGameCompetition('');
            setShowNewGameForm(false);
            loadGames();
        } catch (err) {
            alert('Failed to create game');
        }
    }

    async function createRound() {
        if (!selectedGame) return;

        const validFixtures = fixtures.filter(f => f.home.trim() && f.away.trim());
        if (validFixtures.length === 0) {
            alert('Please add at least one fixture');
            return;
        }

        try {
            await sdk.createLMSRound(selectedGame.id, {
                name: roundName || undefined,
                fixtures: validFixtures.map(f => ({
                    home: f.home.trim(),
                    away: f.away.trim(),
                    kickoff: f.kickoff ? new Date(f.kickoff).getTime() : undefined
                }))
            });
            setShowRoundForm(false);
            setRoundName('');
            setFixtures([{ home: '', away: '', kickoff: '' }]);
            loadGameDetails(selectedGame.id);
        } catch (err) {
            alert('Failed to create round');
        }
    }

    async function processRound() {
        if (!currentRound) return;

        const results = fixtureResults.map(f => ({
            id: f.id,
            homeScore: parseInt(f.homeScore) || 0,
            awayScore: parseInt(f.awayScore) || 0
        }));

        try {
            const result = await sdk.processLMSRound(currentRound.id, results);
            if (result.success) {
                alert(`Round processed!\n• Eliminated: ${result.summary.eliminated}\n• Survived: ${result.summary.survived}${result.summary.gameOver ? '\n\n🏆 GAME OVER!' : ''}`);
                setShowProcessForm(false);
                if (selectedGame) loadGameDetails(selectedGame.id);
            }
        } catch (err) {
            alert('Failed to process round');
        }
    }

    async function resetGame() {
        if (!selectedGame) return;
        if (!confirm('Reset this game? All rounds and predictions will be deleted.')) return;

        try {
            await sdk.resetLMSGame(selectedGame.id);
            loadGameDetails(selectedGame.id);
        } catch (err) {
            alert('Failed to reset game');
        }
    }

    function addFixture() {
        setFixtures([...fixtures, { home: '', away: '', kickoff: '' }]);
    }

    function updateFixture(index: number, field: keyof typeof fixtures[0], value: string) {
        const updated = [...fixtures];
        updated[index][field] = value;
        setFixtures(updated);
    }

    function removeFixture(index: number) {
        setFixtures(fixtures.filter((_, i) => i !== index));
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🏆 Last Man Standing</h1>
                <button
                    onClick={() => setShowNewGameForm(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                    + New Game
                </button>
            </div>

            {/* New Game Modal */}
            {showNewGameForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">Create New Game</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Game Name*</label>
                                <input
                                    type="text"
                                    value={newGameName}
                                    onChange={e => setNewGameName(e.target.value)}
                                    placeholder="e.g. Premier League Survivor"
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Competition</label>
                                <input
                                    type="text"
                                    value={newGameCompetition}
                                    onChange={e => setNewGameCompetition(e.target.value)}
                                    placeholder="e.g. Premier League"
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setShowNewGameForm(false)} className="px-4 py-2 border rounded">Cancel</button>
                            <button onClick={createGame} className="px-4 py-2 bg-green-600 text-white rounded">Create</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Games List */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <h2 className="text-lg font-semibold mb-4">Games</h2>
                    <div className="space-y-2">
                        {games.length === 0 ? (
                            <p className="text-gray-500 text-sm">No games yet. Create one to get started!</p>
                        ) : (
                            games.map(game => (
                                <button
                                    key={game.id}
                                    onClick={() => loadGameDetails(game.id)}
                                    className={`w-full text-left p-3 rounded-lg transition ${selectedGame?.id === game.id
                                            ? 'bg-blue-100 dark:bg-blue-900'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <div className="font-semibold">{game.name}</div>
                                    <div className="text-sm text-gray-500 flex gap-3">
                                        <span>Round {game.round_number}</span>
                                        <span>{game.alive_entries}/{game.total_entries} alive</span>
                                        <span className={game.status === 'active' ? 'text-green-600' : 'text-gray-400'}>
                                            {game.status}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Game Details & Actions */}
                {selectedGame && (
                    <div className="lg:col-span-2 space-y-6">
                        {/* Game Header */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold">{selectedGame.name}</h2>
                                    <p className="text-gray-500">{selectedGame.competition || 'No competition set'}</p>
                                </div>
                                <div className="flex gap-2">
                                    {currentRound?.status === 'open' && (
                                        <button
                                            onClick={() => setShowProcessForm(true)}
                                            className="bg-yellow-500 text-white px-3 py-1.5 rounded text-sm"
                                        >
                                            Process Results
                                        </button>
                                    )}
                                    {(!currentRound || currentRound.status === 'processed') && (
                                        <button
                                            onClick={() => setShowRoundForm(true)}
                                            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm"
                                        >
                                            + New Round
                                        </button>
                                    )}
                                    <button
                                        onClick={resetGame}
                                        className="bg-red-500/10 text-red-600 px-3 py-1.5 rounded text-sm"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Current Round */}
                        {currentRound && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                                <h3 className="font-semibold mb-3">
                                    {currentRound.name || `Round ${currentRound.round_number}`}
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${currentRound.status === 'open' ? 'bg-green-100 text-green-800' :
                                            currentRound.status === 'locked' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {currentRound.status}
                                    </span>
                                </h3>
                                <p className="text-sm text-gray-500 mb-3">
                                    Deadline: {new Date(currentRound.deadline).toLocaleString()}
                                </p>
                                <div className="space-y-2">
                                    {currentRound.fixtures.map((f, i) => (
                                        <div key={f.id || i} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                            <span className="font-medium">{f.home}</span>
                                            <span className="text-gray-400">vs</span>
                                            <span className="font-medium">{f.away}</span>
                                            {f.homeScore !== undefined && (
                                                <span className="ml-4 font-bold">{f.homeScore} - {f.awayScore}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Standings */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                            <h3 className="font-semibold mb-3">Standings ({standings.length} players)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b">
                                            <th className="py-2">Player</th>
                                            <th className="py-2">Status</th>
                                            <th className="py-2">Streak</th>
                                            <th className="py-2">Teams Used</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {standings.map(entry => (
                                            <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-700">
                                                <td className="py-2 font-medium">{entry.user_name}</td>
                                                <td className="py-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${entry.status === 'alive' ? 'bg-green-100 text-green-800' :
                                                            entry.status === 'winner' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                        }`}>
                                                        {entry.status}
                                                        {entry.eliminated_round ? ` (R${entry.eliminated_round})` : ''}
                                                    </span>
                                                </td>
                                                <td className="py-2">{entry.streak}</td>
                                                <td className="py-2 text-gray-500">{entry.teams_used?.join(', ') || '-'}</td>
                                            </tr>
                                        ))}
                                        {standings.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-4 text-center text-gray-500">No players yet</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* New Round Modal */}
            {showRoundForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto py-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full m-4">
                        <h2 className="text-xl font-bold mb-4">Create Round {(selectedGame?.round_number || 0) + 1}</h2>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">Round Name (optional)</label>
                            <input
                                type="text"
                                value={roundName}
                                onChange={e => setRoundName(e.target.value)}
                                placeholder="e.g. Gameweek 23"
                                className="w-full p-2 border rounded dark:bg-gray-700"
                            />
                        </div>

                        <h3 className="font-medium mb-2">Fixtures</h3>
                        <div className="space-y-2 mb-4 max-h-64 overflow-auto">
                            {fixtures.map((f, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        placeholder="Home Team"
                                        value={f.home}
                                        onChange={e => updateFixture(i, 'home', e.target.value)}
                                        className="flex-1 p-2 border rounded dark:bg-gray-700"
                                    />
                                    <span className="text-gray-400">vs</span>
                                    <input
                                        type="text"
                                        placeholder="Away Team"
                                        value={f.away}
                                        onChange={e => updateFixture(i, 'away', e.target.value)}
                                        className="flex-1 p-2 border rounded dark:bg-gray-700"
                                    />
                                    <input
                                        type="datetime-local"
                                        value={f.kickoff}
                                        onChange={e => updateFixture(i, 'kickoff', e.target.value)}
                                        className="p-2 border rounded dark:bg-gray-700"
                                    />
                                    <button onClick={() => removeFixture(i)} className="text-red-500 px-2">×</button>
                                </div>
                            ))}
                        </div>
                        <button onClick={addFixture} className="text-blue-600 text-sm mb-4">+ Add Fixture</button>

                        <div className="flex gap-2">
                            <button onClick={() => setShowRoundForm(false)} className="px-4 py-2 border rounded">Cancel</button>
                            <button onClick={createRound} className="px-4 py-2 bg-blue-600 text-white rounded">Create Round</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Process Round Modal */}
            {showProcessForm && currentRound && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full m-4">
                        <h2 className="text-xl font-bold mb-4">Enter Results - {currentRound.name || `Round ${currentRound.round_number}`}</h2>

                        <div className="space-y-3 mb-6">
                            {currentRound.fixtures.map((f, i) => (
                                <div key={f.id} className="flex items-center gap-2">
                                    <span className="flex-1 text-right">{f.home}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={fixtureResults[i]?.homeScore || ''}
                                        onChange={e => {
                                            const updated = [...fixtureResults];
                                            updated[i] = { ...updated[i], homeScore: e.target.value };
                                            setFixtureResults(updated);
                                        }}
                                        className="w-16 p-2 border rounded text-center dark:bg-gray-700"
                                    />
                                    <span>-</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={fixtureResults[i]?.awayScore || ''}
                                        onChange={e => {
                                            const updated = [...fixtureResults];
                                            updated[i] = { ...updated[i], awayScore: e.target.value };
                                            setFixtureResults(updated);
                                        }}
                                        className="w-16 p-2 border rounded text-center dark:bg-gray-700"
                                    />
                                    <span className="flex-1">{f.away}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setShowProcessForm(false)} className="px-4 py-2 border rounded">Cancel</button>
                            <button onClick={processRound} className="px-4 py-2 bg-yellow-500 text-white rounded">
                                Process & Eliminate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
