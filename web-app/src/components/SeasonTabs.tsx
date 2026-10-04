'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/session';
import { Icon } from '@/components/ui/Icon';

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
    seasons?: Season[];
    /** Offer an "All time" tab (default yes) */
    allTime?: boolean;
}

export function SeasonTabs({ tenant, currentSeasonId, onSeasonChange, seasons: initialSeasons, allTime = true }: SeasonTabsProps) {
    const [seasons, setSeasons] = useState<Season[]>(initialSeasons || []);
    const [loading, setLoading] = useState(!initialSeasons);
    const [selectedId, setSelectedId] = useState<string | null>(currentSeasonId || null);

    useEffect(() => {
        if (!initialSeasons) {
            loadSeasons();
        } else {
            setSeasons(initialSeasons);
            setLoading(false);
        }
    }, [tenant, initialSeasons]);

    async function loadSeasons() {
        try {
            const res = await apiFetch('/api/v1/seasons');
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
                <div className="h-10 w-24 bg-surface-raised chamfer-sm animate-pulse" />
                <div className="h-10 w-24 bg-surface-raised chamfer-sm animate-pulse" />
            </div>
        );
    }

    if (seasons.length === 0) {
        return null; // No seasons yet, don't show tabs
    }

    return (
        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Season">
            {allTime && (
                <button
                    type="button"
                    role="tab"
                    aria-selected={!selectedId}
                    onClick={() => handleSelect(null)}
                    className={`btn btn-sm min-h-[40px] ${!selectedId ? 'btn-primary' : 'btn-secondary'}`}
                >
                    All time
                </button>
            )}

            {seasons.map((season) => (
                <button
                    key={season.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedId === season.id}
                    onClick={() => handleSelect(season.id)}
                    className={`btn btn-sm min-h-[40px] ${selectedId === season.id ? 'btn-primary' : 'btn-secondary'}`}
                >
                    {season.name}
                    {season.is_current === 1 && <span className="text-[10px] tracking-widest opacity-80">Now</span>}
                    {season.status === 'archived' && <Icon name="history" className="w-3.5 h-3.5 opacity-70" />}
                </button>
            ))}
        </div>
    );
}
