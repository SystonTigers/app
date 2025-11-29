'use client';

import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

interface LiveMatchPanelProps {
    matchData: any;
    liveUpdates: any[];
    tenant: string;
}

export function LiveMatchPanel({ matchData, liveUpdates: initialUpdates, tenant }: LiveMatchPanelProps) {
    const [liveUpdates, setLiveUpdates] = useState(initialUpdates);
    const [prevScore, setPrevScore] = useState(matchData?.score);

    // Auto-refresh during live matches
    useEffect(() => {
        if (matchData?.status !== 'live') return;

        const refreshInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/matches/${matchData.id}/updates`);
                const data = await response.json();

                // Check for new goals
                if (data.score && prevScore) {
                    if (data.score.home > prevScore.home || data.score.away > prevScore.away) {
                        // GOAL! Trigger celebration
                        fireConfetti();
                    }
                }

                setLiveUpdates(data.updates || []);
                setPrevScore(data.score);
            } catch (error) {
                console.error('Failed to refresh live data:', error);
            }
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(refreshInterval);
    }, [matchData?.status, matchData?.id, prevScore]);

    const fireConfetti = () => {
        // Goal celebration!
        const duration = 3000;
        const end = Date.now() + duration;

        const colors = ['#FFD700', '#FFA500', '#FF6347'];

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors,
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors,
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        })();
    };

    if (!matchData) return null;

    const { youtubeLiveId, youtubeStatus, status, score, minute, homeTeam, awayTeam } = matchData;
    const now = Date.now();
    const kickoff = new Date(matchData.kickoffIso).getTime();
    const withinWindow = now >= kickoff - 24 * 60 * 60 * 1000 && now <= kickoff + 3 * 60 * 60 * 1000;
    const showYouTube = withinWindow && youtubeLiveId && (youtubeStatus === 'live' || youtubeStatus === 'upcoming');
    const isActive = status === 'live' || status === 'halftime' || status === 'ft';

    const getEventIcon = (type: string, card?: string) => {
        switch (type) {
            case 'goal':
                return '⚽';
            case 'card':
                if (card === 'yellow') return '🟨';
                if (card === 'red') return '🟥';
                if (card === 'sinbin') return '🟧';
                return '🟨';
            case 'subs':
                return '🔁';
            default:
                return 'ℹ️';
        }
    };

    // YouTube embed view
    if (showYouTube) {
        const isLive = youtubeStatus === 'live';
        const embedUrl = `https://www.youtube.com/embed/${youtubeLiveId}?autoplay=${isLive ? 1 : 0}&modestbranding=1&playsinline=1`;

        return (
            <section className="card mb-8 p-0 overflow-hidden relative">
                {/* Pulsing LIVE badge */}
                {isLive && (
                    <div className="absolute top-4 left-4 z-10 flex items-center bg-red-600 px-4 py-2.5 rounded-lg gap-2 shadow-glow animate-pulse-glow">
                        <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                        <span className="text-white font-bold text-sm tracking-wide">LIVE NOW</span>
                    </div>
                )}

                {/* YouTube embed */}
                <div className="relative pb-[56.25%] h-0 overflow-hidden">
                    <iframe
                        src={embedUrl}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full border-0"
                    />
                </div>

                {/* Premium scoreboard */}
                {isActive && score && (
                    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            {/* Home team */}
                            <div className="flex-1 text-center">
                                <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                    {homeTeam.substring(0, 2).toUpperCase()}
                                </div>
                                <h3 className="text-xl font-bold">{homeTeam}</h3>
                            </div>

                            {/* Score */}
                            <div className="px-8">
                                <div className="text-5xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    {score.home} – {score.away}
                                </div>
                            </div>

                            {/* Away team */}
                            <div className="flex-1 text-center">
                                <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                    {awayTeam.substring(0, 2).toUpperCase()}
                                </div>
                                <h3 className="text-xl font-bold">{awayTeam}</h3>
                            </div>
                        </div>

                        {/* Match status */}
                        <div className="flex items-center justify-center gap-3">
                            <div
                                className={`px-4 py-2 rounded-xl text-sm font-bold text-white ${status === 'live' ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-glow' : 'bg-gray-500'
                                    }`}
                            >
                                {status === 'live' ? 'LIVE' : status === 'halftime' ? 'HALF TIME' : 'FULL TIME'}
                            </div>
                            {status === 'live' && minute !== undefined && (
                                <div className="text-2xl font-black text-gray-900 dark:text-white">{minute}'</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Live event feed with animations */}
                {isActive && liveUpdates.length > 0 && (
                    <div className="p-6 bg-white dark:bg-gray-900">
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">
                            Latest Events
                        </h4>
                        <div className="flex flex-col gap-3">
                            {liveUpdates.slice(-5).reverse().map((update: any, index: number) => (
                                <div
                                    key={update.id}
                                    className="flex gap-3 items-start p-3 rounded-lg bg-gray-50 dark:bg-gray-800 animate-fade-in-up"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <span className="text-2xl">{getEventIcon(update.type, update.card)}</span>
                                    <div className="flex-1">
                                        <p className="text-base font-medium mb-1">{update.text}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {update.minute}' {update.scoreSoFar && `• ${update.scoreSoFar}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Watch on YouTube button */}
                <div className="p-6">
                    {!isActive && (
                        <>
                            <h2 className="text-2xl font-bold mb-1">
                                {matchData.homeAway === 'H' ? 'vs' : '@'} {matchData.opponent}
                            </h2>
                            {matchData.competition && <p className="text-muted mb-4">{matchData.competition}</p>}
                        </>
                    )}
                    <a
                        href={`https://youtu.be/${youtubeLiveId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary gap-2 no-underline"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        Watch on YouTube
                    </a>
                </div>
            </section>
        );
    }

    return null;
}
