'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { SeasonTabs } from '@/components/SeasonTabs';
import { FunStats } from '@/components/FunStats';
import { createClientSDK } from '@/lib/sdk';

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

interface SeasonStats {
    season: Season;
    summary: { // was record
        played: number;
        won: number;
        drawn: number;
        lost: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
        points: number;
        cleanSheets: number;
    };
    topScorer?: { name: string; goals: number };
    topAssister?: { name: string; assists: number };
    isFrozen?: boolean;
}

interface Award {
    id: string;
    award_name: string;
    player_name: string;
    notes?: string;
    photo_url?: string;
}

export default function HistoryPage({ params }: PageProps) {
    const { tenant } = use(params);

    const [seasons, setSeasons] = useState<Season[]>([]);
    const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
    const [stats, setStats] = useState<SeasonStats | null>(null);
    const [awards, setAwards] = useState<Award[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSeasons();
    }, [tenant]);

    useEffect(() => {
        if (selectedSeason) {
            loadSeasonData(selectedSeason);
        }
    }, [selectedSeason]);

    async function loadSeasons() {
        try {
            // Using tenant query param for public access if needed, or token
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons?tenant=${tenant}`);
            const data = await res.json();
            if (data.success && data.data) {
                setSeasons(data.data);
                // Auto-select first (most recent) season
                if (data.data.length > 0) {
                    setSelectedSeason(data.data[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to load seasons:', err);
        } finally {
            setLoading(false);
        }
    }

    async function loadSeasonData(seasonId: string) {
        setStats(null);
        setAwards([]);
        try {
            // Fetch Stats
            const resStats = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/${seasonId}/stats?tenant=${tenant}`);
            const dataStats = await resStats.json();
            if (dataStats.success) {
                setStats(dataStats);
            }

            // Fetch Awards
            const resAwards = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/${seasonId}/awards?tenant=${tenant}`);
            const dataAwards = await resAwards.json();
            if (dataAwards.success) {
                setAwards(dataAwards.data);
            }

        } catch (err) {
            console.error('Failed to load season data:', err);
        }
    }

    if (loading) return <div className="p-8 dark:text-gray-200">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">📚 Season History</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Browse past seasons and relive the memories</p>

            {seasons.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                    <div className="text-4xl mb-4">📅</div>
                    <h2 className="text-xl font-semibold mb-2 dark:text-white">No Seasons Yet</h2>
                    <p className="text-gray-500 mb-4">Create your first season to start tracking history</p>
                    <Link
                        href={`/${tenant}/admin/seasons`}
                        className="inline-block bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand/90"
                    >
                        Manage Seasons
                    </Link>
                </div>
            ) : (
                <>
                    {/* Season Tabs */}
                    <SeasonTabs
                        tenant={tenant}
                        currentSeasonId={selectedSeason || undefined}
                        onSeasonChange={(id) => setSelectedSeason(id)}
                        seasons={seasons}
                    />

                    {selectedSeason && stats && (
                        <div className="space-y-8 mt-6">
                            {/* Season Header */}
                            <div className="bg-gradient-to-r from-brand to-brand/80 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
                                <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-3xl font-bold">{stats.season.name} Season</h2>
                                        {stats.season.is_current === 1 && (
                                            <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-sm font-medium border border-white/30">Current</span>
                                        )}
                                        {stats.season.status === 'archived' && (
                                            <span className="bg-yellow-500/80 backdrop-blur px-3 py-1 rounded-full text-sm font-medium border border-yellow-300/30 flex items-center gap-1">
                                                <span>📦</span> Archived
                                            </span>
                                        )}
                                        {stats.isFrozen && (
                                            <span className="bg-blue-500/80 backdrop-blur px-3 py-1 rounded-full text-sm font-medium border border-blue-300/30 flex items-center gap-1" title="Stats are frozen from snapshot">
                                                <span>❄️</span> Frozen Stats
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-brand-100 font-mono">
                                        {stats.summary.points} Pts
                                    </div>
                                </div>

                                {/* Record */}
                                <div className="grid grid-cols-4 md:grid-cols-8 gap-4 text-center mt-8 pt-8 border-t border-white/20">
                                    <div>
                                        <div className="text-3xl font-bold">{stats.summary.played}</div>
                                        <div className="text-sm opacity-80">Played</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-green-300">{stats.summary.won}</div>
                                        <div className="text-sm opacity-80">Won</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-yellow-300">{stats.summary.drawn}</div>
                                        <div className="text-sm opacity-80">Drawn</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-red-300">{stats.summary.lost}</div>
                                        <div className="text-sm opacity-80">Lost</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold">{stats.summary.goalsFor}</div>
                                        <div className="text-sm opacity-80">GF</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold">{stats.summary.goalsAgainst}</div>
                                        <div className="text-sm opacity-80">GA</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold">
                                            {stats.summary.goalDifference >= 0 ? '+' : ''}{stats.summary.goalDifference}
                                        </div>
                                        <div className="text-sm opacity-80">GD</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold">{stats.summary.cleanSheets}</div>
                                        <div className="text-sm opacity-80">CS</div>
                                    </div>
                                </div>
                            </div>

                            {/* Awards and Top Players */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Awards Section */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                                        <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                            🏆 Season Awards
                                        </h3>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {awards.length === 0 ? (
                                            <p className="text-gray-500 italic text-center py-4">No awards recorded for this season.</p>
                                        ) : (
                                            awards.map((award, i) => (
                                                <div key={i} className="flex items-center gap-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                                                    <div className="text-3xl">🏅</div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-gray-100">{award.award_name}</div>
                                                        <div className="text-brand dark:text-brand-300 font-medium">{award.player_name}</div>
                                                        {award.notes && <div className="text-xs text-gray-500 mt-1">"{award.notes}"</div>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Top Performers */}
                                <div className="space-y-4">
                                    {stats.topScorer && (
                                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">⚽</div>
                                            <div>
                                                <div className="text-sm text-gray-500 uppercase font-semibold">Top Scorer</div>
                                                <div className="font-bold text-lg dark:text-white">{stats.topScorer.name}</div>
                                                <div className="text-brand font-bold">{stats.topScorer.goals} Goals</div>
                                            </div>
                                        </div>
                                    )}
                                    {stats.topAssister && (
                                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">👟</div>
                                            <div>
                                                <div className="text-sm text-gray-500 uppercase font-semibold">Most Assists</div>
                                                <div className="font-bold text-lg dark:text-white">{stats.topAssister.name}</div>
                                                <div className="text-brand font-bold">{stats.topAssister.assists} Assists</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Fun Stats */}
                            <div>
                                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">📊 Detailed Stats</h3>
                                <FunStats tenant={tenant} seasonId={selectedSeason} type="team" />
                            </div>

                            {/* Quick Links */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Link
                                    href={`/${tenant}/fixtures?season=${selectedSeason}`}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    <div className="text-3xl mb-2">📅</div>
                                    <div className="font-medium dark:text-white">Fixtures</div>
                                </Link>
                                <Link
                                    href={`/${tenant}/results?season=${selectedSeason}`}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    <div className="text-3xl mb-2">📊</div>
                                    <div className="font-medium dark:text-white">Results</div>
                                </Link>
                                <Link
                                    href={`/${tenant}/table?season=${selectedSeason}`}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    <div className="text-3xl mb-2">🏆</div>
                                    <div className="font-medium dark:text-white">League Table</div>
                                </Link>
                                <Link
                                    href={`/${tenant}/squad?season=${selectedSeason}`}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                                >
                                    <div className="text-3xl mb-2">👥</div>
                                    <div className="font-medium dark:text-white">Squad</div>
                                </Link>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

