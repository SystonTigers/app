'use client';

import { useState, useEffect } from 'react';

interface ShareButtonProps {
    title: string;
    text: string;
    url?: string;
    image?: string;
    className?: string;
}

export function ShareButton({ title, text, url, className = '' }: ShareButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    const shareOptions = [
        {
            name: 'Twitter / X',
            icon: '𝕏',
            color: 'bg-black text-white',
            action: () => {
                window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
                    '_blank',
                    'width=550,height=420'
                );
            },
        },
        {
            name: 'Facebook',
            icon: 'f',
            color: 'bg-blue-600 text-white',
            action: () => {
                window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`,
                    '_blank',
                    'width=550,height=420'
                );
            },
        },
        {
            name: 'WhatsApp',
            icon: '📱',
            color: 'bg-green-500 text-white',
            action: () => {
                window.open(
                    `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`,
                    '_blank'
                );
            },
        },
        {
            name: 'Copy Link',
            icon: '🔗',
            color: 'bg-gray-600 text-white',
            action: async () => {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
        },
    ];

    // Native share if available
    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url: shareUrl });
            } catch (error) {
                // User cancelled or error, fall back to dropdown
                setIsOpen(true);
            }
        } else {
            setIsOpen(true);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleShare}
                className={`flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-bold text-sm transition-colors ${className}`}
            >
                <span>📤</span>
                <span>Share</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden p-2">
                        {shareOptions.map((option) => (
                            <button
                                key={option.name}
                                onClick={() => {
                                    option.action();
                                    if (option.name !== 'Copy Link') setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${option.color}`}>
                                    {option.icon}
                                </span>
                                <span className="font-medium">
                                    {option.name === 'Copy Link' && copied ? '✓ Copied!' : option.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// Result card share with generated image preview
export function ShareResultCard({
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    competition,
    date
}: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    competition: string;
    date: string;
}) {
    const text = `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} | ${competition}`;

    return (
        <ShareButton
            title={`Match Result: ${homeTeam} vs ${awayTeam}`}
            text={text}
        />
    );
}

// Player stats share
export function SharePlayerStats({
    playerName,
    stats,
}: {
    playerName: string;
    stats: { goals: number; assists: number; appearances: number };
}) {
    const text = `${playerName} Stats: ⚽ ${stats.goals} Goals | 🅰️ ${stats.assists} Assists | 👕 ${stats.appearances} Apps`;

    return (
        <ShareButton
            title={`${playerName} Player Stats`}
            text={text}
        />
    );
}
