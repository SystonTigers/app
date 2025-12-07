'use client';

import { useState, useEffect, use } from 'react';
import { createClientSDK } from '@/lib/sdk';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

interface Season {
    id: string;
    name: string;
    is_current: number;
    status: string;
    start_date: string;
    end_date?: string;
}

export default function SeasonsAdminPage({ params }: PageProps) {
    const { tenant } = use(params);

    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New season form
    const [newName, setNewName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [setCurrent, setSetCurrent] = useState(false);

    useEffect(() => {
        loadSeasons();
    }, [tenant]);

    async function loadSeasons() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSeasons(data.data || []);
            }
        } catch (err) {
            console.error('Failed to load seasons:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!newName || !startDate) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newName,
                    startDate,
                    endDate: endDate || undefined,
                    setCurrent
                })
            });
            const data = await res.json();
            if (data.success) {
                setNewName('');
                setStartDate('');
                setEndDate('');
                setSetCurrent(false);
                loadSeasons();
            } else {
                alert(data.error || 'Failed to create season');
            }
        } catch (err) {
            alert('Failed to create season');
        } finally {
            setSaving(false);
        }
    }

    async function handleSetCurrent(seasonId: string) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/set-current`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ seasonId })
            });
            loadSeasons();
        } catch (err) {
            alert('Failed to set current season');
        }
    }

    async function handleArchive(seasonId: string) {
        if (!confirm('Archive this season? It will still be accessible in history.')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/archive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ seasonId })
            });
            loadSeasons();
        } catch (err) {
            alert('Failed to archive season');
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📅 Seasons Manager</h1>
                <Link
                    href={`/${tenant}/history`}
                    className="text-brand hover:underline"
                >
                    View Public History →
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Season Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Create Season</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Season Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g., 2024-25"
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="setCurrent"
                                    checked={setCurrent}
                                    onChange={e => setSetCurrent(e.target.checked)}
                                    className="rounded"
                                />
                                <label htmlFor="setCurrent" className="text-sm">Set as current season</label>
                            </div>
                            <button
                                type="submit"
                                disabled={saving || !newName || !startDate}
                                className="w-full bg-brand text-white py-2 rounded hover:bg-brand/90 disabled:opacity-50"
                            >
                                {saving ? 'Creating...' : 'Create Season'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Seasons List */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <h2 className="text-xl font-semibold p-6 border-b dark:border-gray-700">All Seasons</h2>
                        {seasons.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No seasons created yet. Create your first season to start tracking history.
                            </div>
                        ) : (
                            <div className="divide-y dark:divide-gray-700">
                                {seasons.map(season => (
                                    <div key={season.id} className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl">
                                                {season.is_current === 1 ? '🟢' : season.status === 'archived' ? '📦' : '⚪'}
                                            </div>
                                            <div>
                                                <div className="font-semibold flex items-center gap-2">
                                                    {season.name}
                                                    {season.is_current === 1 && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Current</span>
                                                    )}
                                                    {season.status === 'archived' && (
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Archived</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {season.start_date} {season.end_date ? `→ ${season.end_date}` : '(ongoing)'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {season.is_current !== 1 && season.status !== 'archived' && (
                                                <button
                                                    onClick={() => handleSetCurrent(season.id)}
                                                    className="text-sm text-blue-600 hover:underline"
                                                >
                                                    Set Current
                                                </button>
                                            )}
                                            {season.status !== 'archived' && (
                                                <button
                                                    onClick={() => handleArchive(season.id)}
                                                    className="text-sm text-gray-500 hover:underline"
                                                >
                                                    Archive
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
