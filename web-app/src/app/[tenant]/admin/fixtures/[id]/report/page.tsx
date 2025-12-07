'use client';

import { use, useState, useEffect } from 'react';
import { createClientSDK } from '@/lib/sdk';
import { useRouter } from 'next/navigation';

interface PageProps {
    params: Promise<{ tenant: string; id: string }>;
}

interface MatchEvent {
    playerId: string;
    eventType: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'motm';
    minute?: number;
}

interface Player {
    id: string;
    name: string;
    number?: number;
}

export default function MatchReportPage({ params }: PageProps) {
    const { tenant, id: fixtureId } = use(params);
    const router = useRouter();
    const sdk = createClientSDK(tenant);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [players, setPlayers] = useState<Player[]>([]);

    // Form State
    const [homeScore, setHomeScore] = useState(0);
    const [awayScore, setAwayScore] = useState(0);
    const [events, setEvents] = useState<MatchEvent[]>([]);

    // New Event State
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [selectedType, setSelectedType] = useState('goal');
    const [minute, setMinute] = useState('');

    useEffect(() => {
        loadData();
    }, [tenant, fixtureId]);

    async function loadData() {
        try {
            const [squadData, reportData] = await Promise.all([
                sdk.getSquad(),
                sdk.getMatchReport(fixtureId).catch(() => ({ events: [] })) // Handle 404/Empty gracefully
            ]);

            if ((squadData as any).success) {
                setPlayers((squadData as any).data);
            }

            if (reportData && reportData.events) {
                // Ideally we also fetch the score from the result if it exists
                // For now, start with 0-0 or what we have.
                // If we want to pre-fill score, we'd need to fetch the fixture/result details too.
                // Let's assume user inputs score for now.
                setEvents(reportData.events);
            }
        } catch (err) {
            console.error('Failed to load data', err);
        } finally {
            setLoading(false);
        }
    }

    function addEvent() {
        if (!selectedPlayer) return;
        const newEvent: MatchEvent = {
            playerId: selectedPlayer,
            eventType: selectedType as any,
            minute: minute ? parseInt(minute) : undefined
        };
        setEvents([...events, newEvent]);
        // Reset inputs
        setSelectedPlayer('');
        setMinute('');
    }

    function removeEvent(index: number) {
        setEvents(events.filter((_, i) => i !== index));
    }

    async function handleSave() {
        setSaving(true);
        try {
            await sdk.saveMatchReport(fixtureId, {
                homeScore,
                awayScore,
                events
            });
            alert('Match report saved!');
            router.push(`/${tenant}/admin/fixtures`);
        } catch (err) {
            console.error(err);
            alert('Failed to save report');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Match Report</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Score Section */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Final Score</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 text-center">
                            <label className="block text-sm font-medium mb-1">Us</label>
                            <input
                                type="number"
                                value={homeScore}
                                onChange={(e) => setHomeScore(parseInt(e.target.value))}
                                className="w-20 text-center text-2xl p-2 border rounded dark:bg-gray-700 font-bold"
                            />
                        </div>
                        <span className="text-2xl font-bold text-gray-400">-</span>
                        <div className="flex-1 text-center">
                            <label className="block text-sm font-medium mb-1">Them</label>
                            <input
                                type="number"
                                value={awayScore}
                                onChange={(e) => setAwayScore(parseInt(e.target.value))}
                                className="w-20 text-center text-2xl p-2 border rounded dark:bg-gray-700 font-bold"
                            />
                        </div>
                    </div>
                </div>

                {/* Event Input */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Add Event</h2>
                    <div className="flex flex-col gap-3">
                        <select
                            value={selectedPlayer}
                            onChange={(e) => setSelectedPlayer(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-gray-700"
                        >
                            <option value="">Select Player...</option>
                            {players.map(p => (
                                <option key={p.id} value={p.id}>{p.number ? `#${p.number} ` : ''}{p.name}</option>
                            ))}
                        </select>
                        <div className="flex gap-2">
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="flex-1 p-2 border rounded dark:bg-gray-700"
                            >
                                <option value="goal">⚽ Goal</option>
                                <option value="assist">👟 Assist</option>
                                <option value="yellow_card">🟨 Yellow Card</option>
                                <option value="red_card">🟥 Red Card</option>
                                <option value="motm">⭐ Man of the Match</option>
                            </select>
                            <input
                                type="number"
                                placeholder="Min"
                                value={minute}
                                onChange={(e) => setMinute(e.target.value)}
                                className="w-20 p-2 border rounded dark:bg-gray-700"
                            />
                        </div>
                        <button
                            onClick={addEvent}
                            disabled={!selectedPlayer}
                            className="bg-brand text-white py-2 rounded hover:bg-brand/90 disabled:opacity-50"
                        >
                            Add Event
                        </button>
                    </div>
                </div>
            </div>

            {/* Timeline / List */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <h2 className="text-xl font-semibold p-6 border-b dark:border-gray-700">Match Events</h2>
                {events.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No events recorded.</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {events.map((ev, i) => {
                                const player = players.find(p => p.id === ev.playerId);
                                return (
                                    <tr key={i}>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{ev.minute || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {ev.eventType === 'goal' && '⚽ Goal'}
                                            {ev.eventType === 'assist' && '👟 Assist'}
                                            {ev.eventType === 'yellow_card' && '🟨 Yellow Card'}
                                            {ev.eventType === 'red_card' && '🟥 Red Card'}
                                            {ev.eventType === 'motm' && '⭐ MOTM'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                                            {player ? player.name : 'Unknown Player'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => removeEvent(i)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-bold shadow-lg disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Match Report'}
                </button>
            </div>
        </div>
    );
}
