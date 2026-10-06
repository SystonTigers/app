'use client';

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/session';

interface Season {
    id: string;
    name: string;
    isCurrent: boolean;
    status: string;
}

interface PublicSeasonTabsProps {
    tenant: string;
    /** seasonId null = All time; isCurrent is true only for the season happening now */
    onSeasonChange: (seasonId: string | null, isCurrent: boolean) => void;
    currentSeasonId?: string | null;
}

export function PublicSeasonTabs({ tenant, onSeasonChange, currentSeasonId }: PublicSeasonTabsProps) {
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(currentSeasonId || null);

    useEffect(() => {
        loadSeasons();
    }, [tenant]);

    async function loadSeasons() {
        try {
            const res = await fetch(`${API_BASE}/public/${encodeURIComponent(tenant)}/seasons`);
            const data = await res.json();
            if (data.success && data.data) {
                setSeasons(data.data);
                // Auto-select current season if none selected
                if (!selectedId) {
                    const current = data.data.find((s: Season) => s.isCurrent);
                    if (current) {
                        setSelectedId(current.id);
                        onSeasonChange(current.id, true);
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
        onSeasonChange(seasonId, seasons.some((s) => s.id === seasonId && s.isCurrent));
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
        <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Season">
            {/* All-time option */}
            <button
                type="button"
                role="tab"
                aria-selected={!selectedId}
                onClick={() => handleSelect(null)}
                className={`btn btn-sm min-h-[40px] ${!selectedId ? 'btn-primary' : 'btn-secondary'}`}
            >
                All time
            </button>

            {/* Season tabs */}
            {seasons.map((season) => (
                <button
                    type="button"
                    key={season.id}
                    role="tab"
                    aria-selected={selectedId === season.id}
                    onClick={() => handleSelect(season.id)}
                    className={`btn btn-sm min-h-[40px] ${selectedId === season.id ? 'btn-primary' : 'btn-secondary'}`}
                >
                    {season.name}
                    {season.isCurrent && (
                        <span className="text-[10px] tracking-widest opacity-80">Now</span>
                    )}
                </button>
            ))}
        </div>
    );
}
