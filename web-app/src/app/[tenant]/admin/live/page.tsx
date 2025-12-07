'use client';

import { useState, useEffect, use } from 'react';
import { createClientSDK } from '@/lib/sdk';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

interface MatchEvent {
    type: string;
    minute: number;
    player?: string;
    description: string;
    timestamp: number;
}

export default function LiveMatchPage({ params }: PageProps) {
    const { tenant } = use(params);
    const sdk = createClientSDK(tenant);

    const [loading, setLoading] = useState(true);
    const [fixtures, setFixtures] = useState<any[]>([]);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);

    // Match state
    const [homeScore, setHomeScore] = useState(0);
    const [awayScore, setAwayScore] = useState(0);
    const [matchMinute, setMatchMinute] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [events, setEvents] = useState<MatchEvent[]>([]);

    // Quick event input
    const [selectedPlayer, setSelectedPlayer] = useState('');

    useEffect(() => {
        loadData();
    }, [tenant]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning) {
            interval = setInterval(() => {
                setMatchMinute(prev => prev + 1);
            }, 60000); // Increment every minute
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    async function loadData() {
        try {
            const [fixturesData, squadData] = await Promise.all([
                sdk.listFixtures(),
                sdk.getSquad()
            ]);

            // Filter to upcoming fixtures
            if ((fixturesData as any).success) {
                setFixtures((fixturesData as any).data || []);
            } else if (Array.isArray(fixturesData)) {
                setFixtures(fixturesData);
            }

            if ((squadData as any).success) {
                setPlayers((squadData as any).data || []);
            }
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    }

    function addEvent(type: string, description: string, isOpposition = false) {
        const player = isOpposition ? null : players.find(p => p.id === selectedPlayer);
        const newEvent: MatchEvent = {
            type,
            minute: matchMinute,
            player: player?.name,
            description,
            timestamp: Date.now()
        };
        setEvents([newEvent, ...events]);

        // Update score if goal
        if (type === 'goal') {
            if (isOpposition) {
                setAwayScore(prev => prev + 1);
            } else {
                setHomeScore(prev => prev + 1);
            }
        }

        setSelectedPlayer('');
    }

    function kickOff() {
        setIsRunning(true);
        setMatchMinute(1);
        addEvent('kickoff', 'Match kicked off', true);
    }

    function halfTime() {
        setIsRunning(false);
        addEvent('halftime', 'Half time', true);
    }

    function secondHalf() {
        setIsRunning(true);
        setMatchMinute(46);
        addEvent('kickoff', 'Second half begins', true);
    }

    function fullTime() {
        setIsRunning(false);
        addEvent('fulltime', `Full time: ${homeScore} - ${awayScore}`, true);
    }

    if (loading) return <div className="p-8">Loading...</div>;

    if (!selectedMatch) {
        return (
            <div className="container mx-auto py-8 px-4">
                <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">⚡ Live Match Console</h1>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Select Match</h2>
                    {fixtures.length === 0 ? (
                        <p className="text-gray-500">No upcoming fixtures</p>
                    ) : (
                        <div className="space-y-2">
                            {fixtures.slice(0, 5).map((f: any) => (
                                <button
                                    key={f.id}
                                    onClick={() => setSelectedMatch(f)}
                                    className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                                >
                                    <div className="font-semibold">{f.opponent}</div>
                                    <div className="text-sm text-gray-500">{f.fixture_date} • {f.venue}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">⚡ Live Match</h1>
                <button
                    onClick={() => setSelectedMatch(null)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    ← Back to matches
                </button>
            </div>

            {/* Score Display */}
            <div className="bg-gradient-to-r from-brand to-brand/80 rounded-2xl shadow-xl p-8 mb-8 text-white">
                <div className="text-center mb-4 opacity-80">{selectedMatch.venue} • vs {selectedMatch.opponent}</div>
                <div className="flex items-center justify-center gap-8">
                    <div className="text-6xl font-bold">{homeScore}</div>
                    <div className="text-2xl opacity-50">-</div>
                    <div className="text-6xl font-bold">{awayScore}</div>
                </div>
                <div className="text-center mt-4">
                    <span className={`text-2xl font-mono ${isRunning ? 'animate-pulse' : ''}`}>
                        {matchMinute > 0 ? `${matchMinute}'` : 'Pre-Match'}
                    </span>
                    {isRunning && <span className="ml-2 text-green-300">● LIVE</span>}
                </div>
            </div>

            {/* Match Controls */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <button
                    onClick={kickOff}
                    disabled={isRunning || matchMinute > 0}
                    className="p-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
                >
                    🟢 Kick Off
                </button>
                <button
                    onClick={halfTime}
                    disabled={!isRunning || matchMinute < 40}
                    className="p-4 bg-yellow-600 text-white rounded-lg font-bold hover:bg-yellow-700 disabled:opacity-50"
                >
                    ⏸️ Half Time
                </button>
                <button
                    onClick={secondHalf}
                    disabled={isRunning || matchMinute < 45 || matchMinute > 50}
                    className="p-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                    ▶️ 2nd Half
                </button>
                <button
                    onClick={fullTime}
                    disabled={matchMinute < 85}
                    className="p-4 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
                >
                    🔴 Full Time
                </button>
            </div>

            {/* Quick Event Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">🏠 Our Events</h2>
                    <select
                        value={selectedPlayer}
                        onChange={e => setSelectedPlayer(e.target.value)}
                        className="w-full p-2 mb-4 border rounded dark:bg-gray-700"
                    >
                        <option value="">Select Player...</option>
                        {players.map(p => (
                            <option key={p.id} value={p.id}>{p.number ? `#${p.number} ` : ''}{p.name}</option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => addEvent('goal', `Goal scored`, false)}
                            disabled={!selectedPlayer}
                            className="p-3 bg-green-100 text-green-800 rounded font-bold hover:bg-green-200 disabled:opacity-50"
                        >
                            ⚽ Goal
                        </button>
                        <button
                            onClick={() => addEvent('assist', `Assist`, false)}
                            disabled={!selectedPlayer}
                            className="p-3 bg-blue-100 text-blue-800 rounded font-bold hover:bg-blue-200 disabled:opacity-50"
                        >
                            👟 Assist
                        </button>
                        <button
                            onClick={() => addEvent('yellow', `Yellow card`, false)}
                            disabled={!selectedPlayer}
                            className="p-3 bg-yellow-100 text-yellow-800 rounded font-bold hover:bg-yellow-200 disabled:opacity-50"
                        >
                            🟨 Yellow
                        </button>
                        <button
                            onClick={() => addEvent('red', `Red card`, false)}
                            disabled={!selectedPlayer}
                            className="p-3 bg-red-100 text-red-800 rounded font-bold hover:bg-red-200 disabled:opacity-50"
                        >
                            🟥 Red
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">👥 Opposition Events</h2>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => addEvent('goal', `Opposition goal`, true)}
                            className="p-3 bg-gray-100 text-gray-800 rounded font-bold hover:bg-gray-200"
                        >
                            ⚽ Goal
                        </button>
                        <button
                            onClick={() => addEvent('yellow', `Opposition yellow`, true)}
                            className="p-3 bg-yellow-50 text-yellow-700 rounded font-bold hover:bg-yellow-100"
                        >
                            🟨 Yellow
                        </button>
                        <button
                            onClick={() => addEvent('red', `Opposition red`, true)}
                            className="p-3 bg-red-50 text-red-700 rounded font-bold hover:bg-red-100"
                        >
                            🟥 Red
                        </button>
                        <button
                            onClick={() => addEvent('penalty', `Penalty awarded`, true)}
                            className="p-3 bg-purple-100 text-purple-800 rounded font-bold hover:bg-purple-200"
                        >
                            ⚠️ Penalty
                        </button>
                    </div>
                </div>
            </div>

            {/* Event Log */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <h2 className="text-xl font-semibold p-6 border-b dark:border-gray-700">📋 Match Events</h2>
                {events.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No events yet</div>
                ) : (
                    <div className="divide-y dark:divide-gray-700">
                        {events.map((ev, i) => (
                            <div key={i} className="flex items-center gap-4 p-4">
                                <div className="text-lg font-mono text-gray-400 w-12">{ev.minute}'</div>
                                <div>
                                    <div className="font-medium">{ev.description}</div>
                                    {ev.player && <div className="text-sm text-gray-500">{ev.player}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
