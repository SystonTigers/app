'use client';

import { useState, useEffect, use } from 'react';
import { createClientSDK, createResult, deleteResult } from '@/lib/sdk';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function ResultsAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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
    const [squad, setSquad] = useState<Array<{ id: string; name: string; number: number | null }>>([]);
    const [pick, setPick] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadResults();
        createClientSDK(tenant).getSquad()
            .then((rows) => setSquad(rows.map((r) => ({ id: String(r.id), name: String(r.name ?? ''), number: r.number == null ? null : Number(r.number) }))))
            .catch(() => setSquad([]));
    }, [tenant]);

    const goalsLeft = formData.ourScore - scorerIds.length - ownGoals;
    const scorerCounts = scorerIds.reduce<Map<string, number>>((m, id) => m.set(id, (m.get(id) ?? 0) + 1), new Map());

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

    async function loadResults() {
        try {
            const sdk = createClientSDK(tenant);
            const data = await sdk.listResults();
            if ((data as any).success && Array.isArray((data as any).data)) {
                setResults((data as any).data);
            } else if (Array.isArray(data)) {
                setResults(data);
            } else {
                setResults([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.date || !formData.opponent) return;

        if (goalsLeft < 0) {
            setError(`You've picked more scorers than goals (${formData.ourScore}).`);
            return;
        }
        setError('');
        try {
            await createResult({ ...formData, scorerIds, ownGoals });
            setFormData({ ...formData, opponent: '', ourScore: 0, theirScore: 0 });
            setScorerIds([]);
            setOwnGoals(0);
            loadResults();
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : "The result didn't save. Please try again.");
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this result?')) return;
        try {
            await deleteResult(id);
            loadResults();
        } catch (err) {
            alert('Failed to delete result');
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Results Manager</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Add Result</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Opponent</label>
                                <input
                                    type="text"
                                    value={formData.opponent}
                                    onChange={e => setFormData({ ...formData, opponent: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Us</label>
                                    <input
                                        type="number"
                                        value={formData.ourScore}
                                        onChange={e => setFormData({ ...formData, ourScore: parseInt(e.target.value) })}
                                        className="w-full p-2 border rounded dark:bg-gray-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Them</label>
                                    <input
                                        type="number"
                                        value={formData.theirScore}
                                        onChange={e => setFormData({ ...formData, theirScore: parseInt(e.target.value) })}
                                        className="w-full p-2 border rounded dark:bg-gray-700"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="scorer-pick" className="block text-sm font-medium mb-1">Scorers</label>
                                <div className="flex gap-2">
                                    <select
                                        id="scorer-pick"
                                        value={pick}
                                        onChange={e => setPick(e.target.value)}
                                        disabled={goalsLeft <= 0}
                                        className="flex-1 p-2 border rounded dark:bg-gray-700"
                                    >
                                        <option value="">{goalsLeft > 0 ? `Who scored? (${goalsLeft} left)` : formData.ourScore ? 'Every goal has a scorer' : 'Enter our score first'}</option>
                                        {squad.map((p) => <option key={p.id} value={p.id}>{p.number != null ? `${p.number}. ` : ''}{p.name}</option>)}
                                        <option value="og">Own goal</option>
                                    </select>
                                    <button type="button" onClick={addScorer} disabled={!pick || goalsLeft <= 0} className="px-3 rounded border disabled:opacity-40">Add</button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Add a player once for each goal they scored. Picked scorers count in player stats.</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {[...scorerCounts].map(([id, n]) => (
                                        <button key={id} type="button" onClick={() => removeScorer(id)} className="text-sm px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700" aria-label={`Remove one goal for ${squad.find((p) => p.id === id)?.name ?? 'player'}`}>
                                            ⚽ {squad.find((p) => p.id === id)?.name ?? 'Player'}{n > 1 ? ` ×${n}` : ''} ✕
                                        </button>
                                    ))}
                                    {ownGoals ? (
                                        <button type="button" onClick={() => setOwnGoals(ownGoals - 1)} className="text-sm px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700" aria-label="Remove one own goal">
                                            ⚽ Own goal{ownGoals > 1 ? ` ×${ownGoals}` : ''} ✕
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                            {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
                            <button type="submit" className="w-full bg-black text-white py-2 rounded hover:bg-gray-800">
                                Add Result
                            </button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {results.map((result: any) => (
                                    <tr key={result.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(result.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                                            vs {result.awayTeam === 'Opponent' ? result.homeTeam : result.awayTeam}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center font-bold">
                                            {result.homeScore} - {result.awayScore}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => handleDelete(result.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {results.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            No results found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
