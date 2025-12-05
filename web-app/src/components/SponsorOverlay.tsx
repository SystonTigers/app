'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Sponsor {
    id: string;
    name: string;
    logo: string; // URL
    tier: 'title' | 'gold' | 'silver' | 'bronze';
}

// Mock Sponsors Data
export const MOCK_SPONSORS: Sponsor[] = [
    { id: '1', name: 'Local Scaffolding', logo: '/assets/sponsors/scaffolding.png', tier: 'title' },
    { id: '2', name: 'Joe\'s Burgers', logo: '/assets/sponsors/burgers.png', tier: 'gold' },
    { id: '3', name: 'Tigers Gym', logo: '/assets/sponsors/gym.png', tier: 'gold' },
    { id: '4', name: 'Tech Solutions', logo: '/assets/sponsors/tech.png', tier: 'silver' },
    { id: '5', name: 'Community Bank', logo: '/assets/sponsors/bank.png', tier: 'bronze' }
];

interface SponsorOverlayProps {
    layout?: 'ticker' | 'corner' | 'sidebar';
    sponsors?: Sponsor[];
    className?: string;
}

export function SponsorOverlay({ layout = 'ticker', sponsors = MOCK_SPONSORS, className = '' }: SponsorOverlayProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Rotate sponsors for corner view
    useEffect(() => {
        if (layout === 'corner') {
            const interval = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % sponsors.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [layout, sponsors.length]);

    if (layout === 'ticker') {
        return (
            <div className={`w-full bg-white/95 dark:bg-gray-900/95 border-y border-gray-200 dark:border-gray-800 overflow-hidden py-3 ${className}`}>
                <div className="flex animate-scroll-left w-[200%]">
                    {/* Double the list for seamless loop */}
                    {[...sponsors, ...sponsors].map((sponsor, i) => (
                        <div key={`${sponsor.id}-${i}`} className="flex items-center gap-3 px-8 opacity-80 hover:opacity-100 transition-opacity whitespace-nowrap">
                            {/* Placeholder for actual image if missing */}
                            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600">
                                {sponsor.name[0]}
                            </div>
                            <span className="font-bold text-sm uppercase tracking-wider text-gray-800 dark:text-gray-200">
                                {sponsor.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (layout === 'corner') {
        const currentSponsor = sponsors[currentIndex];
        return (
            <div className={`absolute top-24 right-4 z-40 ${className}`}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSponsor.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white/90 dark:bg-black/80 backdrop-blur px-4 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex items-center gap-3"
                    >
                        <div className="text-[10px] font-bold uppercase text-gray-500 mb-0.5 absolute -top-3 right-0 bg-white dark:bg-black px-1 rounded border border-gray-200 dark:border-gray-700">
                            Sponsored By
                        </div>
                        <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center font-bold text-gray-500">
                            {currentSponsor.name[0]}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{currentSponsor.name}</span>
                            <span className="text-[10px] text-gray-500 uppercase">{currentSponsor.tier} Partner</span>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        );
    }

    return null;
}
