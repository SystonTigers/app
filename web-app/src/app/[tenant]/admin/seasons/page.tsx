'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { StartSeasonModal } from '@/components/admin/seasons/StartSeasonModal';
import { EndSeasonModal } from '@/components/admin/seasons/EndSeasonModal';

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
    archived_at?: number;
}

export default function SeasonsAdminPage({ params }: PageProps) {
    const { tenant } = use(params);

    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showStartModal, setShowStartModal] = useState(false);
    const [showEndModal, setShowEndModal] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);

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

    async function handleReopen(seasonId: string) {
        if (!confirm('Are you sure you want to reopen this season? It will become active again.')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/${seasonId}/reopen`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                loadSeasons();
            } else {
                alert(data.error || 'Failed to reopen season');
            }
        } catch (err) {
            alert('Failed to reopen season');
        }
    }

    const openEndSeasonModal = (season: Season) => {
        setSelectedSeason(season);
        setShowEndModal(true);
    };

    if (loading) return <div className="p-8 dark:text-gray-200">Loading...</div>;

    const currentSeason = seasons.find(s => s.is_current === 1);

    return (
        <div className="container mx-auto py-8 px-4">
            <StartSeasonModal
                isOpen={showStartModal}
                onClose={() => setShowStartModal(false)}
                onSuccess={loadSeasons}
                tenantId={tenant}
            />

            {showEndModal && selectedSeason && (
                <EndSeasonModal
                    isOpen={showEndModal}
                    onClose={() => setShowEndModal(false)}
                    onSuccess={loadSeasons}
                    season={selectedSeason}
                    tenantId={tenant}
                />
            )}

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">📅 Seasons Manager</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage season lifecycle, archives, and awards.</p>
                </div>
                <div className="flex gap-4">
                    <Link
                        href={`/${tenant}/history`}
                        className="text-brand hover:underline flex items-center gap-1"
                    >
                        View Public History →
                    </Link>
                    <button
                        onClick={() => setShowStartModal(true)}
                        className="bg-brand text-white px-4 py-2 rounded hover:bg-brand/90 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <span>+</span> Start New Season
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {/* Current Season Card */}
                {currentSeason && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 border-green-500 p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-1">Current Active Season</div>
                                <h2 className="text-2xl font-bold dark:text-white">{currentSeason.name}</h2>
                                <p className="text-gray-500 mt-1">Started: {currentSeason.start_date}</p>
                            </div>
                            <button
                                onClick={() => openEndSeasonModal(currentSeason)}
                                className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors"
                            >
                                End Season...
                            </button>
                        </div>
                    </div>
                )}

                {/* Seasons List */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <h2 className="text-xl font-semibold p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        Season History
                    </h2>
                    {seasons.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No seasons found. Start your first season!
                        </div>
                    ) : (
                        <div className="divide-y dark:divide-gray-700">
                            {seasons.map(season => {
                                const isCurrent = season.is_current === 1;
                                const isArchived = season.status === 'archived';

                                return (
                                    <div key={season.id} className={`p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isCurrent ? 'bg-green-50/30' : ''}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl">
                                                {isCurrent ? '🟢' : isArchived ? '📦' : '⚪'}
                                            </div>
                                            <div>
                                                <div className="font-semibold flex items-center gap-2 text-lg dark:text-white">
                                                    {season.name}
                                                    {isCurrent && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded border border-green-200">Active</span>
                                                    )}
                                                    {isArchived && (
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">Archived</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                    {season.start_date} {season.end_date ? `— ${season.end_date}` : '— Present'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {!isCurrent && !isArchived && (
                                                <button
                                                    onClick={() => handleSetCurrent(season.id)}
                                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded hover:bg-blue-50"
                                                >
                                                    Set Active
                                                </button>
                                            )}
                                            {isArchived && (
                                                <button
                                                    onClick={() => handleReopen(season.id)}
                                                    className="text-sm text-yellow-600 hover:text-yellow-800 font-medium px-3 py-1 rounded hover:bg-yellow-50"
                                                >
                                                    Reopen
                                                </button>
                                            )}
                                            <Link
                                                href={`/${tenant}/history?season=${season.id}`}
                                                className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 px-3 py-1"
                                            >
                                                View Stats
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
