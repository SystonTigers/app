'use client';

import { useState, useEffect } from 'react';
import { MatchTimeline } from '@/components/ui/MatchTimeline';
import { ShareButton } from '@/components/ui/SocialShare';

interface LiveMatchHubProps {
    tenant: string;
    matchId?: string;
}

interface MatchData {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    minute: number;
    status: 'live' | 'halftime' | 'finished' | 'not_started';
    events: any[];
    stats: {
        possession: [number, number];
        shots: [number, number];
        shotsOnTarget: [number, number];
        corners: [number, number];
        fouls: [number, number];
    };
}

export function LiveMatchHub({ tenant, matchId }: LiveMatchHubProps) {
    const [match, setMatch] = useState<MatchData | null>(null);
    const [commentary, setCommentary] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock live match data - replace with real API
        const mockMatch: MatchData = {
            id: '1',
            homeTeam: 'Syston Tigers',
            awayTeam: 'Anstey Nomads',
            homeScore: 2,
            awayScore: 1,
            minute: 67,
            status: 'live',
            events: [
                { id: '1', minute: 12, type: 'goal', team: 'home', player: 'James Smith', description: 'Header from corner' },
                { id: '2', minute: 34, type: 'yellow-card', team: 'away', player: 'D. Brown' },
                { id: '3', minute: 45, type: 'half-time', team: 'home' },
                { id: '4', minute: 58, type: 'goal', team: 'away', player: 'M. Johnson', description: 'Long range strike' },
                { id: '5', minute: 63, type: 'goal', team: 'home', player: 'A. Wilson', description: 'Penalty' },
                { id: '6', minute: 65, type: 'substitution', team: 'home', player: 'B. Davis', playerOff: 'J. Smith' },
            ],
            stats: {
                possession: [58, 42],
                shots: [12, 7],
                shotsOnTarget: [5, 3],
                corners: [6, 2],
                fouls: [8, 11],
            },
        };

        const mockCommentary = [
            "67' Great save by the keeper!",
            "65' SUBSTITUTION: Davis comes on for Smith",
            "63' GOAL! Wilson scores from the penalty spot! 2-1!",
            "61' Penalty awarded to Syston Tigers!",
            "58' GOAL! Johnson with a stunning strike from 25 yards! 1-1!",
            "55' Free kick to Anstey Nomads in a dangerous position",
            "52' Yellow card for a late challenge",
            "46' Second half underway!",
            "45+2' Half-time: Syston Tigers 1-0 Anstey Nomads",
            "45' Two minutes of added time",
        ];

        setTimeout(() => {
            setMatch(mockMatch);
            setCommentary(mockCommentary);
            setLoading(false);
        }, 500);

        // Simulate live updates
        const interval = setInterval(() => {
            setMatch(prev => prev ? {
                ...prev,
                minute: Math.min(90, prev.minute + 1)
            } : null);
        }, 60000);

        return () => clearInterval(interval);
    }, [matchId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 font-bold">Loading match...</p>
                </div>
            </div>
        );
    }

    if (!match) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚽</div>
                    <h2 className="text-2xl font-black mb-2">No Live Match</h2>
                    <p className="text-gray-500">Check back when a match is in progress</p>
                </div>
            </div>
        );
    }

    const StatBar = ({ label, values }: { label: string; values: [number, number] }) => (
        <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold">
                <span>{values[0]}</span>
                <span className="text-gray-500">{label}</span>
                <span>{values[1]}</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                <div
                    className="bg-brand transition-all duration-500"
                    style={{ width: `${(values[0] / (values[0] + values[1])) * 100}%` }}
                />
                <div
                    className="bg-gray-400 dark:bg-gray-500 transition-all duration-500"
                    style={{ width: `${(values[1] / (values[0] + values[1])) * 100}%` }}
                />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
            {/* Live Header */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
                <div className="container py-8">
                    {/* Live Badge */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <span className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-full text-sm font-bold animate-pulse">
                            <span className="w-2 h-2 bg-white rounded-full" />
                            LIVE • {match.minute}'
                        </span>
                    </div>

                    {/* Score */}
                    <div className="flex items-center justify-center gap-8 mb-6">
                        <div className="text-center flex-1">
                            <div className="w-20 h-20 mx-auto bg-white/10 rounded-2xl flex items-center justify-center text-3xl font-black mb-3">
                                {match.homeTeam[0]}
                            </div>
                            <h2 className="text-2xl font-black uppercase">{match.homeTeam}</h2>
                        </div>

                        <div className="text-center">
                            <div className="text-6xl md:text-7xl font-black tracking-wider">
                                {match.homeScore} - {match.awayScore}
                            </div>
                        </div>

                        <div className="text-center flex-1">
                            <div className="w-20 h-20 mx-auto bg-white/10 rounded-2xl flex items-center justify-center text-3xl font-black mb-3">
                                {match.awayTeam[0]}
                            </div>
                            <h2 className="text-2xl font-black uppercase">{match.awayTeam}</h2>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center justify-center gap-4">
                        <ShareButton
                            title={`${match.homeTeam} vs ${match.awayTeam} - LIVE`}
                            text={`⚽ LIVE: ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam} (${match.minute}')`}
                            className="bg-white/10 hover:bg-white/20 text-white"
                        />
                        <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-colors">
                            <span>🔔</span>
                            <span>Get Alerts</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="container py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Column - Timeline & Commentary */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Match Timeline */}
                        <MatchTimeline
                            events={match.events}
                            homeTeam={match.homeTeam}
                            awayTeam={match.awayTeam}
                            homeScore={match.homeScore}
                            awayScore={match.awayScore}
                            currentMinute={match.minute}
                            isLive={match.status === 'live'}
                        />

                        {/* Live Commentary */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                <h3 className="font-black text-xl uppercase">Live Commentary</h3>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {commentary.map((comment, i) => (
                                    <div key={i} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                        <p className="text-gray-700 dark:text-gray-300">{comment}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Side Column - Stats */}
                    <div className="space-y-6">
                        {/* Match Stats */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="font-black text-lg uppercase">Match Stats</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                <StatBar label="Possession %" values={match.stats.possession} />
                                <StatBar label="Shots" values={match.stats.shots} />
                                <StatBar label="Shots on Target" values={match.stats.shotsOnTarget} />
                                <StatBar label="Corners" values={match.stats.corners} />
                                <StatBar label="Fouls" values={match.stats.fouls} />
                            </div>
                        </div>

                        {/* Next Goals Prediction */}
                        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-3xl p-6">
                            <h3 className="font-black text-lg uppercase mb-4">🔮 Fan Prediction</h3>
                            <p className="text-purple-200 text-sm mb-4">Who will score the next goal?</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button className="py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-colors">
                                    {match.homeTeam.split(' ')[0]}
                                </button>
                                <button className="py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-colors">
                                    {match.awayTeam.split(' ')[0]}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
