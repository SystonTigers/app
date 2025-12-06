'use client';

import { useState } from 'react';

interface PlayerStats {
    id: string;
    name: string;
    position: string;
    number: number;
    appearances: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    minutesPlayed: number;
    passAccuracy: number;
    tacklesWon: number;
    rating: number;
}

interface PlayerComparisonProps {
    players: PlayerStats[];
    onClose?: () => void;
}

export function PlayerComparison({ players, onClose }: PlayerComparisonProps) {
    const [player1Id, setPlayer1Id] = useState<string>(players[0]?.id || '');
    const [player2Id, setPlayer2Id] = useState<string>(players[1]?.id || '');

    const player1 = players.find(p => p.id === player1Id);
    const player2 = players.find(p => p.id === player2Id);

    const stats: Array<{ key: keyof PlayerStats; label: string; icon: string; decimals?: number; suffix?: string }> = [
        { key: 'appearances', label: 'Appearances', icon: '👕' },
        { key: 'goals', label: 'Goals', icon: '⚽' },
        { key: 'assists', label: 'Assists', icon: '🅰️' },
        { key: 'rating', label: 'Avg Rating', icon: '⭐', decimals: 1 },
        { key: 'passAccuracy', label: 'Pass %', icon: '🎯', suffix: '%' },
        { key: 'tacklesWon', label: 'Tackles Won', icon: '🛡️' },
        { key: 'minutesPlayed', label: 'Minutes', icon: '⏱️' },
        { key: 'yellowCards', label: 'Yellow Cards', icon: '🟨' },
        { key: 'redCards', label: 'Red Cards', icon: '🟥' },
    ];

    const getBarWidth = (value1: number, value2: number, forPlayer1: boolean) => {
        if (value1 === 0 && value2 === 0) return '50%';
        const total = value1 + value2;
        const percentage = forPlayer1 ? (value1 / total) * 100 : (value2 / total) * 100;
        return `${Math.max(10, percentage)}%`;
    };

    const isWinning = (value1: number, value2: number, forPlayer1: boolean, key: string) => {
        // For cards, lower is better
        if (key === 'yellowCards' || key === 'redCards') {
            return forPlayer1 ? value1 < value2 : value2 < value1;
        }
        return forPlayer1 ? value1 > value2 : value2 > value1;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-brand to-brand/80 text-white">
                <div className="flex items-center justify-between">
                    <h3 className="font-black text-xl uppercase tracking-tight">Player Comparison</h3>
                    {onClose && (
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Player Selectors */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Player 1</label>
                        <select
                            value={player1Id}
                            onChange={(e) => setPlayer1Id(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold"
                        >
                            {players.map(p => (
                                <option key={p.id} value={p.id} disabled={p.id === player2Id}>
                                    #{p.number} {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Player 2</label>
                        <select
                            value={player2Id}
                            onChange={(e) => setPlayer2Id(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold"
                        >
                            {players.map(p => (
                                <option key={p.id} value={p.id} disabled={p.id === player1Id}>
                                    #{p.number} {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Player Headers */}
            {player1 && player2 && (
                <>
                    <div className="grid grid-cols-3 p-6 bg-gray-50 dark:bg-gray-900/50">
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-brand to-brand/60 rounded-full flex items-center justify-center text-white text-2xl font-black mb-2">
                                {player1.number}
                            </div>
                            <div className="font-black text-lg">{player1.name}</div>
                            <div className="text-sm text-gray-500">{player1.position}</div>
                        </div>
                        <div className="flex items-center justify-center">
                            <span className="text-4xl font-black text-gray-300 dark:text-gray-600">VS</span>
                        </div>
                        <div className="text-center">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-600 to-purple-400 rounded-full flex items-center justify-center text-white text-2xl font-black mb-2">
                                {player2.number}
                            </div>
                            <div className="font-black text-lg">{player2.name}</div>
                            <div className="text-sm text-gray-500">{player2.position}</div>
                        </div>
                    </div>

                    {/* Stats Comparison */}
                    <div className="p-6 space-y-4">
                        {stats.map(({ key, label, icon, decimals, suffix }) => {
                            const val1 = player1[key] as number;
                            const val2 = player2[key] as number;

                            return (
                                <div key={key} className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className={`font-black ${isWinning(val1, val2, true, key) ? 'text-brand' : 'text-gray-400'}`}>
                                            {decimals ? val1.toFixed(decimals) : val1}{suffix || ''}
                                        </span>
                                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                            <span>{icon}</span>
                                            <span className="font-medium">{label}</span>
                                        </span>
                                        <span className={`font-black ${isWinning(val1, val2, false, key) ? 'text-purple-600' : 'text-gray-400'}`}>
                                            {decimals ? val2.toFixed(decimals) : val2}{suffix || ''}
                                        </span>
                                    </div>
                                    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                                        <div
                                            className={`transition-all duration-500 ${isWinning(val1, val2, true, key) ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            style={{ width: getBarWidth(val1, val2, true) }}
                                        />
                                        <div
                                            className={`transition-all duration-500 ${isWinning(val1, val2, false, key) ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                            style={{ width: getBarWidth(val1, val2, false) }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
