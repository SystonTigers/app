'use client';

import { useState, useEffect, use } from 'react';
import { createClientSDK, createFixture, deleteFixture } from '@/lib/sdk';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function FixturesAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const sdk = createClientSDK(tenant);
    const [fixtures, setFixtures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importMessage, setImportMessage] = useState('');
    const [formData, setFormData] = useState({
        date: '',
        time: '',
        opponent: '',
        venue: 'Home',
        competition: 'League'
    });

    async function handleAutoImport() {
        setImporting(true);
        setImportMessage('');
        try {
            const result = await sdk.autoImportFixtures();
            if (result.success) {
                setImportMessage(`✅ Imported ${result.imported || 0} fixtures!`);
                loadFixtures();
            } else {
                setImportMessage(`❌ ${(result as any).error || 'Import failed'}`);
            }
        } catch (err: any) {
            setImportMessage(`❌ ${err.message || 'Import failed'}`);
        } finally {
            setImporting(false);
        }
    }

    useEffect(() => {
        loadFixtures();
    }, [tenant]);
    async function loadFixtures() {
        try {
            const sdk = createClientSDK(tenant);
            const data = await sdk.listFixtures();
            // Public API returns { success: true, data: [...] } or just [...] depending on implementation.
            // My implementation in sdk.ts uses http<any[]> which implies it expects array directly?
            // Wait, http helper returns T.
            // In sdk.ts I wrote: return http<any[]>(...);
            // But public.ts returns { success: true, data: [...] }.
            // So http<any[]> will return the whole object { success: true, data: [...] }.
            // I need to handle that.
            // Let's check sdk.ts http helper again.
            // It returns data as T.
            // So if T is any[], it expects array.
            // But API returns object.
            // I should update sdk.ts to unwrap data if needed, or update here.
            // Let's assume for now I need to unwrap it here or fix sdk.ts.
            // Actually, let's fix sdk.ts to return data.data if it exists, or just return data.
            // But for now, let's handle it here safely.
            if ((data as any).success && Array.isArray((data as any).data)) {
                setFixtures((data as any).data);
            } else if (Array.isArray(data)) {
                setFixtures(data);
            } else {
                setFixtures([]);
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

        try {
            await createFixture(formData);
            setFormData({ ...formData, opponent: '' }); // Reset some fields
            loadFixtures();
        } catch (err) {
            alert('Failed to create fixture');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this fixture?')) return;
        try {
            await deleteFixture(id);
            loadFixtures();
        } catch (err) {
            alert('Failed to delete fixture');
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fixtures Manager</h1>
                <div className="flex items-center gap-4">
                    {importMessage && <span className="text-sm">{importMessage}</span>}
                    <a
                        href={`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/calendar/export`}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                    >
                        📅 Export Calendar
                    </a>
                    <button
                        onClick={handleAutoImport}
                        disabled={importing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {importing ? (
                            <><span className="animate-spin">⏳</span> Importing...</>
                        ) : (
                            <>📥 Auto-Import from FA</>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Add Fixture</h2>
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
                                <label className="block text-sm font-medium mb-1">Time</label>
                                <input
                                    type="time"
                                    value={formData.time}
                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700"
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
                            <div>
                                <label className="block text-sm font-medium mb-1">Venue</label>
                                <select
                                    value={formData.venue}
                                    onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                >
                                    <option value="Home">Home</option>
                                    <option value="Away">Away</option>
                                    <option value="Neutral">Neutral</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Competition</label>
                                <input
                                    type="text"
                                    value={formData.competition}
                                    onChange={e => setFormData({ ...formData, competition: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                />
                            </div>
                            <button type="submit" className="w-full bg-black text-white py-2 rounded hover:bg-gray-800">
                                Add Fixture
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opponent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Venue</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {fixtures.map((fixture: any) => (
                                    <tr key={fixture.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {new Date(fixture.date).toLocaleDateString()} {fixture.time}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                                            {fixture.awayTeam === 'Opponent' ? fixture.homeTeam : fixture.awayTeam}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded text-xs ${fixture.venue === 'Home' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {fixture.venue || 'Home'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <Link
                                                href={`/${tenant}/admin/fixtures/${fixture.id}/report`}
                                                className="text-blue-600 hover:text-blue-900 mr-4 font-medium"
                                            >
                                                Report
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(fixture.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {fixtures.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                            No upcoming fixtures found.
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
