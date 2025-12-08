'use client';

import { useState, useEffect } from 'react';
import { getPlayerCareerStats, CareerStatsResult } from '@/lib/sdk';

interface CareerHistoryProps {
    playerId: string;
    playerName: string;
}

export function CareerHistory({ playerId, playerName }: CareerHistoryProps) {
    const [careerStats, setCareerStats] = useState<CareerStatsResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadCareerStats() {
            try {
                const stats = await getPlayerCareerStats(playerId);
                setCareerStats(stats);
            } catch (err: any) {
                // Career stats not available (player has no global profile)
                setError('No career history available');
            } finally {
                setLoading(false);
            }
        }
        loadCareerStats();
    }, [playerId]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    // Don't show anything if no career history  
    if (error || !careerStats || !careerStats.hasCareerHistory) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 text-white p-6 rounded-3xl shadow-lg">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">🌍</span>
                <h3 className="text-lg font-black uppercase tracking-tight">Career History</h3>
            </div>

            {/* Career Totals */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-lg">
                    <div className="text-3xl font-black">{careerStats.careerTotals.goals}</div>
                    <div className="text-xs font-bold uppercase opacity-75">Goals</div>
                </div>
                <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-lg">
                    <div className="text-3xl font-black">{careerStats.careerTotals.assists}</div>
                    <div className="text-xs font-bold uppercase opacity-75">Assists</div>
                </div>
                <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-lg">
                    <div className="text-3xl font-black">{careerStats.careerTotals.appearances}</div>
                    <div className="text-xs font-bold uppercase opacity-75">Apps</div>
                </div>
            </div>

            {/* By Club Breakdown */}
            <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider opacity-75 mb-3">
                    Club History ({careerStats.careerTotals.clubs} clubs)
                </div>
                {careerStats.clubHistory.map((club, index) => (
                    <div
                        key={index}
                        className={`p-3 rounded-lg hover:bg-white/20 transition-colors ${club.isCurrent ? 'bg-white/20 border border-white/30' : 'bg-white/10'
                            }`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold flex items-center gap-2">
                                {club.club}
                                {club.isCurrent && (
                                    <span className="text-xs bg-green-500 px-2 py-0.5 rounded-full">Current</span>
                                )}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div>
                                <span className="font-bold">{club.stats.goals}</span>
                                <span className="text-white/60 ml-1">G</span>
                            </div>
                            <div>
                                <span className="font-bold">{club.stats.assists}</span>
                                <span className="text-white/60 ml-1">A</span>
                            </div>
                            <div>
                                <span className="font-bold">{club.stats.appearances}</span>
                                <span className="text-white/60 ml-1">Apps</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
