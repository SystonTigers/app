'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { SeasonTabs } from '@/components/SeasonTabs';
import { FunStats } from '@/components/FunStats';

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

interface SeasonSummary {
    season: Season;
    record: {
        played: number;
        won: number;
        drawn: number;
        lost: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
        points: number;
    };
    topScorers: { player_name: string; goals: number }[];
}

export default function HistoryPage({ params }: PageProps) {
    const { tenant } = use(params);

    const [seasons, setSeasons] = useState<Season[]>([]);
    const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
    const [summary, setSummary] = useState<SeasonSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSeasons();
    }, [tenant]);

    useEffect(() => {
        if (selectedSeason) {
            loadSeasonSummary(selectedSeason);
        }
    }, [selectedSeason]);

    async function loadSeasons() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons`, {
                headers: { Authorization: `Bearer ${token}` }
            });
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

    async function loadSeasonSummary(seasonId: string) {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/${seasonId}/summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSummary(data.data);
            }
        } catch (err) {
            console.error('Failed to load summary:', err);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">📚 Season History</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Browse past seasons and relive the memories</p>

            {seasons.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                    <div className="text-4xl mb-4">📅</div>
                    <h2 className="text-xl font-semibold mb-2">No Seasons Yet</h2>
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
                    />

                    {selectedSeason && summary && (
                        <div className="space-y-8">
                            {/* Season Header */}
                            <div className="bg-gradient-to-r from-brand to-brand/80 rounded-2xl p-8 text-white">
                                <div className="flex items-center gap-4 mb-4">
                                    <h2 className="text-2xl font-bold">{summary.season.name} Season</h2>
                                    {summary.season.is_current === 1 && (
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Current</span>
                                    )}
                                    {summary.season.status === 'archived' && (
                                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm">📦 Archived</span>
                                    )}
                                </div>

                                {/* Record */}
                                <div className="grid grid-cols-4 md:grid-cols-8 gap-4 text-center">
                                    <div>
                                        <div className="text-3xl font-bold">{summary.record.played}</div>
                                        <div className="text-sm opacity-80">Played</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-green-300">{summary.record.won}</div>
                                        <div className="text-sm opacity-80">Won</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-yellow-300">{summary.record.drawn}</div>
                                        <div className="text-sm opacity-80">Drawn</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-red-300">{summary.record.lost}</div>
                                        <div className="text-sm opacity-80">Lost</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold">{summary.record.goalsFor}</div>
                                        <div className="text-sm opacity-80">GF</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold">{summary.record.goalsAgainst}</div>
                                        <div className="text-sm opacity-80">GA</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold">
                                            {summary.record.goalDifference >= 0 ? '+' : ''}{summary.record.goalDifference}
                                        </div>
                                        <div className="text-sm opacity-80">GD</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold">{summary.record.points}</div>
                                        <div className="text-sm opacity-80">Pts</div>
                                    </div>
                                </div>
                            </div>

                            {/* Fun Stats */}
                            <div>
                                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">📊 Season Stats</h3>
                                <FunStats tenant={tenant} seasonId={selectedSeason} type="team" />
                            </div>

                            {/* Top Scorers */}
                            {summary.topScorers.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">⚽ Top Scorers</h3>
                                    <div className="space-y-3">
                                        {summary.topScorers.map((scorer, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-2xl font-bold text-gray-300 w-8">#{i + 1}</div>
                                                    <span className="font-medium">{scorer.player_name || 'Unknown'}</span>
                                                </div>
                                                <div className="text-xl font-bold text-brand">{scorer.goals} goals</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quick Links */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Link
                                    href={`/${tenant}/fixtures?season=${selectedSeason}`}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow"
                                >
                                    <div className="text-3xl mb-2">📅</div>
                                    <div className="font-medium">Fixtures</div>
                                </Link>
                                <Link
                                    href={`/${tenant}/results?season=${selectedSeason}`}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow"
                                >
                                    <div className="text-3xl mb-2">📊</div>
                                    <div className="font-medium">Results</div>
                                </Link>
                                <Link
                                    href={`/${tenant}/table?season=${selectedSeason}`}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow"
                                >
                                    <div className="text-3xl mb-2">🏆</div>
                                    <div className="font-medium">League Table</div>
                                </Link>
                                <Link
                                    href={`/${tenant}/squad?season=${selectedSeason}`}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow"
                                >
                                    <div className="text-3xl mb-2">👥</div>
                                    <div className="font-medium">Squad</div>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* All-Time View */}
                    {!selectedSeason && (
                        <div className="space-y-8">
                            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl p-8 text-white">
                                <h2 className="text-2xl font-bold mb-2">📊 All-Time Statistics</h2>
                                <p className="opacity-80">Combined stats across all seasons</p>
                            </div>
                            <FunStats tenant={tenant} type="team" />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
