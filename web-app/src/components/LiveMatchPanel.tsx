'use client';

import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

interface LiveMatchPanelProps {
    matchData: any;
    liveUpdates: any[];
    tenant: string;
}

export function LiveMatchPanel({ matchData, liveUpdates: initialUpdates, tenant }: LiveMatchPanelProps) {
    const [liveUpdates, setLiveUpdates] = useState(initialUpdates);
    const [prevScore, setPrevScore] = useState(matchData?.score);
    const playerRef = useRef<any>(null);
    const [isReplayMode, setIsReplayMode] = useState(false);

    // Auto-refresh during live matches
    const [lastEventId, setLastEventId] = useState<string | null>(null);
    const [overlayEvent, setOverlayEvent] = useState<any>(null);

    useEffect(() => {
        if (matchData?.status !== 'live') return;

        const refreshInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/v1/matches/${matchData.id}/updates`);
                const data = await response.json();

                // Check for new goals or major events
                if (data.score && prevScore) {
                    if (data.score.home > prevScore.home || data.score.away > prevScore.away) {
                        fireConfetti();
                    }
                }

                const newUpdates = data.updates || [];
                setLiveUpdates(newUpdates);
                setPrevScore(data.score);

                // Detect NEW latest event for overlay
                if (newUpdates.length > 0) {
                    const latest = newUpdates[newUpdates.length - 1]; // items are appended? or verify order. Server sends DESC usually?
                    // The server route says "ORDER BY minute ASC, ts ASC", so last is latest.

                    if (latest.id !== lastEventId) {
                        setLastEventId(latest.id);

                        // Trigger Overlay for Goal
                        if (latest.type === 'goal') {
                            setOverlayEvent(latest);
                            // Hide after 6 seconds
                            setTimeout(() => setOverlayEvent(null), 6000);
                        }
                    }
                }

            } catch (error) {
                console.error('Failed to refresh live data:', error);
            }
        }, 5000); // Poll faster (5s) for live overlays

        return () => clearInterval(refreshInterval);
    }, [matchData?.status, matchData?.id, prevScore, lastEventId]);

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

    const performInstantReplay = () => {
        if (playerRef.current && playerRef.current.seekTo) {
            const currentTime = playerRef.current.getCurrentTime();
            // Seek back 30 seconds for the goal
            playerRef.current.seekTo(currentTime - 30, true);
            setIsReplayMode(true);

            // Auto-return to live after 20 seconds? Or let user click.
        }
    };

    const returnToLive = () => {
        if (playerRef.current && playerRef.current.seekTo) {
            const duration = playerRef.current.getDuration();
            // Seek to live edge
            playerRef.current.seekTo(duration, true);
            setIsReplayMode(false);
        }
    };

    if (!matchData) return null;

    const { youtubeLiveId, youtubeStatus, status, score, minute, homeTeam, awayTeam } = matchData;
    const now = Date.now();
    const kickoff = new Date(matchData.kickoffIso).getTime();
    const withinWindow = now >= kickoff - 24 * 60 * 60 * 1000 && now <= kickoff + 3 * 60 * 60 * 1000;
    const showYouTube = withinWindow && youtubeLiveId && (youtubeStatus === 'live' || youtubeStatus === 'upcoming');
    const isActive = status === 'live' || status === 'halftime' || status === 'ft';

    // Initialize YouTube API
    useEffect(() => {
        if (showYouTube && !playerRef.current) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            // Ensure we don't duplicate script
            if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
            }

            window.onYouTubeIframeAPIReady = () => {
                playerRef.current = new window.YT.Player('yt-player-frame', {
                    videoId: youtubeLiveId,
                    playerVars: {
                        autoplay: 1,
                        modestbranding: 1,
                        playsinline: 1,
                        rel: 0
                    },
                    events: {
                        onStateChange: (event: any) => {
                            // Detect if user manually seeks to live?
                        }
                    }
                });
            };
        }
    }, [showYouTube, youtubeLiveId]);

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

                {/* YouTube embed container */}
                <div className="relative pb-[56.25%] h-0 overflow-hidden bg-black group">
                    <div id="yt-player-frame" className="absolute top-0 left-0 w-full h-full" />

                    {/* Return to Live Button */}
                    {isReplayMode && (
                        <button
                            onClick={returnToLive}
                            className="absolute top-4 right-4 z-40 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 animate-bounce"
                        >
                            <span>🔴</span> RETURN TO LIVE
                        </button>
                    )}

                    {/* --- BROADCAST OVERLAYS --- */}

                    {/* 1. Scorebug (Top Left) */}
                    {isActive && (
                        <div className="absolute top-4 left-4 z-20 flex flex-col font-sans">
                            {/* Main Bar */}
                            <div className="flex items-center shadow-lg overflow-hidden rounded-md">
                                {/* Home */}
                                <div className="bg-white text-gray-900 px-3 py-1 font-bold flex items-center gap-2 min-w-[80px] justify-between border-r border-gray-200">
                                    <span>{homeTeam.substring(0, 3).toUpperCase()}</span>
                                    {isActive && <span className="bg-gray-800 text-white px-1.5 rounded text-sm">{score?.home ?? 0}</span>}
                                </div>

                                {/* Time / Status */}
                                <div className="bg-gray-900 text-white px-3 py-1 text-sm font-mono font-bold min-w-[60px] text-center border-r border-gray-700">
                                    {status === 'halftime' ? 'HT' : status === 'ft' ? 'FT' : `${minute}'`}
                                </div>

                                {/* Away */}
                                <div className="bg-white text-gray-900 px-3 py-1 font-bold flex items-center gap-2 min-w-[80px] justify-between">
                                    {isActive && <span className="bg-gray-800 text-white px-1.5 rounded text-sm">{score?.away ?? 0}</span>}
                                    <span>{awayTeam.substring(0, 3).toUpperCase()}</span>
                                </div>
                            </div>
                            {/* Branding / Tagline usually below */}
                            <div className="bg-green-600 text-white text-[10px] uppercase font-bold text-center py-0.5 rounded-b-md mx-2 shadow-sm">
                                Live Match
                            </div>
                        </div>
                    )}

                    {/* 2. Goal Overlay (Bottom Center) */}
                    <AnimatePresence>
                        {overlayEvent && overlayEvent.type === 'goal' && (
                            <motion.div
                                initial={{ y: 100, opacity: 0, scale: 0.8 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: 50, opacity: 0 }}
                                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center"
                            >
                                <div className="bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col items-center min-w-[300px] border-2 border-green-500">
                                    <div className="bg-green-600 text-white w-full text-center py-1 font-black text-xl italic tracking-wider animate-pulse">
                                        GOAL!
                                    </div>
                                    <div className="p-4 flex flex-col items-center">
                                        {/* Scorer Name - Try to parse from text or use extra field */}
                                        <h3 className="text-2xl font-bold text-gray-900 uppercase">
                                            {overlayEvent.text?.replace('GOAL! ', '').split('scores')[0] || overlayEvent.extra?.player_name || 'GOAL'}
                                        </h3>

                                        {/* Updated Score */}
                                        <div className="text-4xl font-black text-gray-800 mt-2">
                                            {score?.home ?? 0} - {score?.away ?? 0}
                                        </div>

                                        <div className="text-gray-500 text-sm font-mono mt-1">
                                            {overlayEvent.minute}'
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

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
