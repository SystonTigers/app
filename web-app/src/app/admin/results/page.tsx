'use client';

import { useState, useEffect } from 'react';
import { createClientSDK, createResult, deleteResult } from '@/lib/sdk';

export default function ResultsAdminPage() {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        date: '',
        opponent: '',
        venue: 'Home',
        competition: 'League',
        ourScore: 0,
        theirScore: 0,
        scorers: ''
    });

    useEffect(() => {
        loadResults();
    }, []);

    async function loadResults() {
        try {
            const sdk = createClientSDK();
            const data = await sdk.listResults();
            setResults(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.date || !formData.opponent) return;

        try {
            await createResult(formData);
            setFormData({ ...formData, opponent: '', ourScore: 0, theirScore: 0, scorers: '' });
            loadResults();
        } catch (err) {
            alert('Failed to create result');
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
                                <label className="block text-sm font-medium mb-1">Scorers (comma sep)</label>
                                <input
                                    type="text"
                                    value={formData.scorers}
                                    onChange={e => setFormData({ ...formData, scorers: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                    placeholder="Smith, Jones (2)"
                                />
                            </div>
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
