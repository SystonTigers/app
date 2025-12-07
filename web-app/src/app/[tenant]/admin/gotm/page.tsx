'use client';

import { useState, useEffect, use } from 'react';
import { createClientSDK } from '@/lib/sdk';

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

export default function GOTMAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const sdk = createClientSDK(tenant);

    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState<Voting | null>(null);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [players, setPlayers] = useState<any[]>([]);

    // New voting form
    const [newMonth, setNewMonth] = useState('');
    const [newYear, setNewYear] = useState(new Date().getFullYear());
    const [newGoals, setNewGoals] = useState<any[]>([]);
    const [goalDesc, setGoalDesc] = useState('');
    const [goalPlayer, setGoalPlayer] = useState('');
    const [goalVideo, setGoalVideo] = useState('');

    useEffect(() => {
        loadData();
    }, [tenant]);

    async function loadData() {
        try {
            const [gotmData, squadData] = await Promise.all([
                sdk.getGOTMVoting(),
                sdk.getSquad()
            ]);

            if (gotmData.voting) {
                setVoting(gotmData.voting);
                setCandidates(gotmData.candidates);
            }

            if ((squadData as any).success) {
                setPlayers((squadData as any).data);
            }
        } catch (err) {
            console.error('Failed to load GOTM data:', err);
        } finally {
            setLoading(false);
        }
    }

    function addGoal() {
        if (!goalDesc || !goalPlayer) return;
        setNewGoals([...newGoals, {
            playerId: goalPlayer,
            description: goalDesc,
            videoUrl: goalVideo || undefined
        }]);
        setGoalDesc('');
        setGoalPlayer('');
        setGoalVideo('');
    }

    async function startVoting() {
        if (!newMonth || newGoals.length === 0) {
            alert('Please select a month and add at least one goal');
            return;
        }

        try {
            await sdk.startGOTMVoting(newMonth, newYear, newGoals);
            setNewGoals([]);
            setNewMonth('');
            loadData();
        } catch (err) {
            alert('Failed to start voting');
        }
    }

    async function closeVoting() {
        if (!voting) return;
        if (!confirm('Close voting and announce winner?')) return;

        try {
            const result = await sdk.closeGOTMVoting(voting.id);
            if (result.winner) {
                const player = players.find(p => p.id === result.winner.player_id);
                alert(`Winner: ${player?.name || 'Unknown'} - ${result.winner.description}`);
            }
            loadData();
        } catch (err) {
            alert('Failed to close voting');
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">⚽ Goal of the Month</h1>

            {voting && voting.status === 'open' ? (
                <div className="space-y-8">
                    {/* Active Voting */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">
                                {voting.month} {voting.year} Voting
                                <span className="ml-3 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">OPEN</span>
                            </h2>
                            <button
                                onClick={closeVoting}
                                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                            >
                                Close Voting
                            </button>
                        </div>

                        <div className="space-y-4">
                            {candidates.map((c, i) => {
                                const player = players.find(p => p.id === c.player_id);
                                return (
                                    <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="text-2xl font-bold text-gray-400">#{i + 1}</div>
                                            <div>
                                                <div className="font-semibold">{player?.name || 'Unknown'}</div>
                                                <div className="text-sm text-gray-500">{c.description}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {c.video_url && (
                                                <a href={c.video_url} target="_blank" rel="noopener" className="text-blue-500 hover:underline">
                                                    📹 Watch
                                                </a>
                                            )}
                                            <div className="text-2xl font-bold text-brand">{c.votes} votes</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Start New Voting */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-6">Start New Voting</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">Month</label>
                                <select
                                    value={newMonth}
                                    onChange={e => setNewMonth(e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                >
                                    <option value="">Select Month...</option>
                                    {['January', 'February', 'March', 'April', 'May', 'June',
                                        'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Year</label>
                                <input
                                    type="number"
                                    value={newYear}
                                    onChange={e => setNewYear(parseInt(e.target.value))}
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                />
                            </div>
                        </div>

                        <h3 className="font-semibold mb-4">Add Goal Candidates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <select
                                value={goalPlayer}
                                onChange={e => setGoalPlayer(e.target.value)}
                                className="p-2 border rounded dark:bg-gray-700"
                            >
                                <option value="">Select Scorer...</option>
                                {players.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Goal description (e.g. vs Arsenal, 30 yard screamer)"
                                value={goalDesc}
                                onChange={e => setGoalDesc(e.target.value)}
                                className="p-2 border rounded dark:bg-gray-700"
                            />
                            <input
                                type="url"
                                placeholder="Video URL (optional)"
                                value={goalVideo}
                                onChange={e => setGoalVideo(e.target.value)}
                                className="p-2 border rounded dark:bg-gray-700"
                            />
                        </div>
                        <button
                            onClick={addGoal}
                            disabled={!goalPlayer || !goalDesc}
                            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
                        >
                            + Add Goal
                        </button>

                        {/* Goals list */}
                        {newGoals.length > 0 && (
                            <div className="mt-6 space-y-2">
                                <h4 className="font-medium">Goals to vote on:</h4>
                                {newGoals.map((g, i) => {
                                    const player = players.find(p => p.id === g.playerId);
                                    return (
                                        <div key={i} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                            <span>{player?.name}: {g.description}</span>
                                            <button
                                                onClick={() => setNewGoals(newGoals.filter((_, j) => j !== i))}
                                                className="text-red-500 text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <button
                            onClick={startVoting}
                            disabled={!newMonth || newGoals.length === 0}
                            className="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold disabled:opacity-50"
                        >
                            🗳️ Start Voting
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
