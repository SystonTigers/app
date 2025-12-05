
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { ModernDarkTheme, MatchData } from '@/components/templates/ModernDark';
import { createClientSDK } from '@/lib/sdk';

export default function LiveMatchConsole({ params }: { params: { id: string } }) {
    const [match, setMatch] = useState<any>(null);
    const [players, setPlayers] = useState<any[]>([]);
    const [score, setScore] = useState({ home: 0, away: 0 });
    const [matchTime, setMatchTime] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // -- MODAL STATES --
    const [modalMode, setModalMode] = useState<'goal' | 'card' | 'sub' | null>(null);
    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>('home');

    // GOAL State
    const [selectedScorer, setSelectedScorer] = useState('');
    const [selectedAssister, setSelectedAssister] = useState('');
    const [usePlayerImage, setUsePlayerImage] = useState(true);

    // CARD State
    const [cardType, setCardType] = useState<'yellow' | 'red'>('yellow');
    const [cardPlayer, setCardPlayer] = useState('');

    // SUB State
    const [subIn, setSubIn] = useState('');
    const [subOut, setSubOut] = useState('');

    // Hidden Ref for Image Generation
    const graphicRef = useRef<HTMLDivElement>(null);
    const [latestEventData, setLatestEventData] = useState<MatchData | null>(null);

    useEffect(() => {
        setMatch({
            id: params.id,
            homeTeam: 'Syston Tigers',
            awayTeam: 'Anstey Nomads',
            venue: 'Memorial Park',
            competition: 'League Cup',
            date: 'Live Now'
        });

        setPlayers([
            { id: '1', name: 'J. Smith', number: 9 },
            { id: '2', name: 'D. Jones', number: 10 },
            { id: '3', name: 'A. Johnson', number: 7 },
            { id: '4', name: 'B. Wilson', number: 4 }
        ]);

        let interval: NodeJS.Timeout;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setMatchTime(t => t + 1);
            }, 1000 * 60);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, params.id]);

    // --- BROADCAST HELPER ---
    const broadcastEvent = async (eventData: MatchData, logText: string) => {
        setLatestEventData(eventData);

        setTimeout(async () => {
            if (graphicRef.current) {
                try {
                    const dataUrl = await toPng(graphicRef.current, { cacheBust: true });
                    console.log('BROADCASTING:', { text: logText, image: dataUrl.substring(0, 50) + '...' });
                    alert(`Posted: ${logText}`);
                } catch (err) {
                    console.error('Failed to generate graphic', err);
                }
            }
        }, 500);

        setModalMode(null);
        resetForms();
    };

    const resetForms = () => {
        setSelectedScorer('');
        setSelectedAssister('');
        setCardPlayer('');
        setSubIn('');
        setSubOut('');
    };

    // --- HANDLERS ---
    const handleGoalSubmit = () => {
        const newScore = { ...score };
        if (selectedTeam === 'home') newScore.home++;
        else newScore.away++;
        setScore(newScore);

        const player = players.find(p => p.name === selectedScorer);
        const playerImage = player?.image || '/assets/players/silhouette.png';

        const data: MatchData = {
            type: 'goal',
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            score: newScore,
            competition: match.competition,
            time: `${matchTime}'`,
            scorers: [{ name: selectedScorer, minute: `${matchTime}`, assister: selectedAssister, image: playerImage }],
            showScorerImage: usePlayerImage,
            themeColor: '#f97316'
        };

        broadcastEvent(data, `GOAL! ${selectedScorer} scores for ${selectedTeam === 'home' ? match.homeTeam : match.awayTeam}!`);
    };

    const handleCardSubmit = () => {
        const data: MatchData = {
            type: 'card',
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            score: score,
            competition: match.competition,
            card: { type: cardType, player: cardPlayer, minute: `${matchTime}` },
            themeColor: '#f97316'
        };
        broadcastEvent(data, `${cardType.toUpperCase()} CARD for ${cardPlayer}`);
    };

    const handleSubSubmit = () => {
        const data: MatchData = {
            type: 'sub',
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            score: score,
            competition: match.competition,
            sub: { in: subIn, out: subOut, minute: `${matchTime}` },
            themeColor: '#f97316'
        };
        broadcastEvent(data, `SUBSTITUTION: ${subIn} ON, ${subOut} OFF`);
    };

    const handleMatchState = (type: 'kickoff' | 'halftime' | 'second_half' | 'fulltime') => {
        const data: MatchData = {
            type: type,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            score: score,
            competition: match.competition,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            themeColor: '#f97316'
        };
        broadcastEvent(data, `MATCH UPDATE: ${type.replace('_', ' ').toUpperCase()}`);
    };

    const markChance = () => {
        console.log('CHANCE MARKED AT', matchTime);
        alert(`Chance logged at ${matchTime} mins for Video Editor 🎥`);
    };

    if (!match) return <div className="p-10 text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                <div>
                    <h1 className="text-2xl font-bold">Live Match Console</h1>
                    <p className="text-gray-400">{match.homeTeam} vs {match.awayTeam}</p>
                </div>
                <div className="text-right flex items-center gap-4">
                    <button onClick={markChance} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded font-bold animate-pulse">
                        🎥 Mark Chance
                    </button>
                    <div className="text-4xl font-mono font-bold bg-black px-4 py-2 rounded text-green-500">
                        {matchTime}'
                    </div>
                </div>
            </header>

            {/* Hidden Graphic Generator */}
            <div className="absolute top-[-9999px] left-[-9999px]">
                {latestEventData && <div ref={graphicRef}><ModernDarkTheme data={latestEventData} /></div>}
            </div>

            {/* Scoreboard */}
            <div className="flex justify-center items-center gap-12 mb-8 bg-gray-800 p-8 rounded-2xl">
                <div className="text-center">
                    <h2 className="text-4xl font-bold mb-2">{score.home}</h2>
                    <p className="text-gray-400">{match.homeTeam}</p>
                </div>
                <div className="text-2xl text-gray-600 font-bold">VS</div>
                <div className="text-center">
                    <h2 className="text-4xl font-bold mb-2">{score.away}</h2>
                    <p className="text-gray-400">{match.awayTeam}</p>
                </div>
            </div>

            {/* MAIN ACTIONS */}
            <div className="grid grid-cols-4 gap-4 max-w-5xl mx-auto mb-8">
                <button onClick={() => handleMatchState('kickoff')} className="bg-gray-700 p-4 rounded hover:bg-gray-600 font-bold">KICK OFF</button>
                <button onClick={() => handleMatchState('halftime')} className="bg-gray-700 p-4 rounded hover:bg-gray-600 font-bold">HALF TIME</button>
                <button onClick={() => handleMatchState('second_half')} className="bg-gray-700 p-4 rounded hover:bg-gray-600 font-bold">2ND HALF</button>
                <button onClick={() => handleMatchState('fulltime')} className="bg-gray-700 p-4 rounded hover:bg-gray-600 font-bold">FULL TIME</button>
            </div>

            <div className="grid grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* GOALS */}
                <button onClick={() => { setSelectedTeam('home'); setModalMode('goal'); }} className="bg-green-600 hover:bg-green-500 h-24 rounded-xl text-2xl font-bold flex flex-col items-center justify-center">
                    <span>⚽ GOAL HOME</span>
                </button>
                <button onClick={() => { setSelectedTeam('away'); setModalMode('goal'); }} className="bg-green-800 hover:bg-green-700 h-24 rounded-xl text-2xl font-bold flex flex-col items-center justify-center">
                    <span>⚽ GOAL AWAY</span>
                </button>

                {/* CARDS */}
                <button onClick={() => { setCardType('yellow'); setModalMode('card'); }} className="bg-yellow-600 hover:bg-yellow-500 h-20 rounded-xl text-xl font-bold">
                    🟨 Yellow Card
                </button>
                <button onClick={() => { setCardType('red'); setModalMode('card'); }} className="bg-red-700 hover:bg-red-600 h-20 rounded-xl text-xl font-bold">
                    🟥 Red Card
                </button>

                {/* SUBS */}
                <button onClick={() => setModalMode('sub')} className="bg-blue-600 hover:bg-blue-500 h-20 rounded-xl text-xl font-bold col-span-2">
                    🔄 Substitution
                </button>
            </div>

            {/* MODALS */}
            {modalMode && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700">

                        {/* GOAL MODAL */}
                        {modalMode === 'goal' && (
                            <>
                                <h2 className="text-2xl font-bold mb-4">Goal for {selectedTeam === 'home' ? match.homeTeam : match.awayTeam}</h2>
                                <select className="w-full bg-gray-700 p-3 mb-4 rounded" onChange={e => setSelectedScorer(e.target.value)} value={selectedScorer}>
                                    <option value="">Select Scorer...</option>
                                    {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                                <select className="w-full bg-gray-700 p-3 mb-4 rounded" onChange={e => setSelectedAssister(e.target.value)} value={selectedAssister}>
                                    <option value="">Select Assist (Optional)...</option>
                                    {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                                <div className="flex items-center gap-2 mb-6">
                                    <input type="checkbox" checked={usePlayerImage} onChange={e => setUsePlayerImage(e.target.checked)} className="w-5 h-5 rounded" />
                                    <span>Show Player Image?</span>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => setModalMode(null)} className="flex-1 bg-gray-600 py-3 rounded">Cancel</button>
                                    <button onClick={handleGoalSubmit} disabled={!selectedScorer} className="flex-1 bg-green-600 py-3 rounded font-bold disabled:opacity-50">POST GOAL</button>
                                </div>
                            </>
                        )}

                        {/* CARD MODAL */}
                        {modalMode === 'card' && (
                            <>
                                <h2 className="text-2xl font-bold mb-4">{cardType === 'yellow' ? 'Yellow' : 'Red'} Card</h2>
                                <select className="w-full bg-gray-700 p-3 mb-6 rounded" onChange={e => setCardPlayer(e.target.value)} value={cardPlayer}>
                                    <option value="">Select Player...</option>
                                    {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                                <div className="flex gap-4">
                                    <button onClick={() => setModalMode(null)} className="flex-1 bg-gray-600 py-3 rounded">Cancel</button>
                                    <button onClick={handleCardSubmit} disabled={!cardPlayer} className="flex-1 bg-yellow-600 py-3 rounded font-bold disabled:opacity-50">POST CARD</button>
                                </div>
                            </>
                        )}

                        {/* SUB MODAL */}
                        {modalMode === 'sub' && (
                            <>
                                <h2 className="text-2xl font-bold mb-4">Substitution</h2>
                                <div className="mb-4">
                                    <label className="text-green-500 font-bold">ON ⬆</label>
                                    <select className="w-full bg-gray-700 p-3 rounded mt-1" onChange={e => setSubIn(e.target.value)} value={subIn}>
                                        <option value="">Select Person ON...</option>
                                        {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="mb-6">
                                    <label className="text-red-500 font-bold">OFF ⬇</label>
                                    <select className="w-full bg-gray-700 p-3 rounded mt-1" onChange={e => setSubOut(e.target.value)} value={subOut}>
                                        <option value="">Select Person OFF...</option>
                                        {players.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => setModalMode(null)} className="flex-1 bg-gray-600 py-3 rounded">Cancel</button>
                                    <button onClick={handleSubSubmit} disabled={!subIn || !subOut} className="flex-1 bg-blue-600 py-3 rounded font-bold disabled:opacity-50">POST SUB</button>
                                </div>
                            </>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}
