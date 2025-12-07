'use client';

import { useState, useEffect } from 'react';

interface Season {
    id: string;
    name: string;
    is_current: number;
    status: string;
}

interface SeasonTabsProps {
    tenant: string;
    currentSeasonId?: string;
    onSeasonChange: (seasonId: string | null) => void;
}

export function SeasonTabs({ tenant, currentSeasonId, onSeasonChange }: SeasonTabsProps) {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(currentSeasonId || null);

    useEffect(() => {
        loadSeasons();
    }, [tenant]);

    async function loadSeasons() {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                setSeasons(data.data);
                // Auto-select current season if none selected
                if (!selectedId) {
                    const current = data.data.find((s: Season) => s.is_current === 1);
                    if (current) {
                        setSelectedId(current.id);
                        onSeasonChange(current.id);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load seasons:', err);
        } finally {
            setLoading(false);
        }
    }

    function handleSelect(seasonId: string | null) {
        setSelectedId(seasonId);
        onSeasonChange(seasonId);
    }

    if (loading) {
        return (
            <div className="flex gap-2 mb-6">
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
        );
    }

    if (seasons.length === 0) {
        return null; // No seasons yet, don't show tabs
    }

    return (
        <div className="flex flex-wrap gap-2 mb-6" role="tablist">
            {/* All-time option */}
            <button
                role="tab"
                aria-selected={!selectedId}
                onClick={() => handleSelect(null)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${!selectedId
                        ? 'bg-brand text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
            >
                All-Time
            </button>

            {/* Season tabs */}
            {seasons.map((season) => (
                <button
                    key={season.id}
                    role="tab"
                    aria-selected={selectedId === season.id}
                    onClick={() => handleSelect(season.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${selectedId === season.id
                            ? 'bg-brand text-white shadow-lg'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    {season.name}
                    {season.is_current === 1 && (
                        <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">Current</span>
                    )}
                    {season.status === 'archived' && (
                        <span className="text-xs opacity-70">📦</span>
                    )}
                </button>
            ))}
        </div>
    );
}
