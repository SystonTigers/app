'use client';

import { useState, useEffect } from 'react';
import { getPlayerCareerStats, CareerStatsResult } from '@/lib/sdk';
import { Icon } from '@/components/ui/Icon';
import { getSessionToken } from '@/lib/session';

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
            // Career history needs a club login; visitors just don't see the card
            if (!getSessionToken()) {
                setLoading(false);
                return;
            }
            try {
                const stats = await getPlayerCareerStats(playerId);
                setCareerStats(stats);
            } catch {
                // Not every player has a history at other clubs (or the viewer isn't logged in)
                setError('No career history available');
            } finally {
                setLoading(false);
            }
        }
        loadCareerStats();
    }, [playerId]);

    if (loading) {
        return <div className="card h-40 animate-pulse" aria-busy="true" aria-label="Loading career history" />;
    }

    // Nothing to show when the player has no history at other clubs
    if (error || !careerStats || !careerStats.hasCareerHistory) {
        return null;
    }

    const totals = [
        { label: 'Goals', value: careerStats.careerTotals.goals },
        { label: 'Assists', value: careerStats.careerTotals.assists },
        { label: 'Apps', value: careerStats.careerTotals.appearances },
    ];

    return (
        <section className="card" aria-label={`${playerName}'s career`}>
            <h3 className="text-xl mb-4 flex items-center gap-2">
                <Icon name="history" className="w-5 h-5 text-brand" /> Career
            </h3>

            <dl className="grid grid-cols-3 gap-2 mb-6">
                {totals.map((t) => (
                    <div key={t.label} className="bg-surface-raised border border-border chamfer-sm p-3 text-center flex flex-col-reverse">
                        <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{t.label}</dt>
                        <dd className="font-display text-3xl font-extrabold">{t.value}</dd>
                    </div>
                ))}
            </dl>

            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                Clubs ({careerStats.careerTotals.clubs})
            </p>
            <ul className="space-y-2">
                {careerStats.clubHistory.map((club, index) => (
                    <li
                        key={`${club.club}-${index}`}
                        className={`p-3 chamfer-sm border ${club.isCurrent ? 'border-brand/50 bg-brand/10' : 'border-border bg-surface-raised'}`}
                    >
                        <p className="font-bold flex items-center gap-2 mb-1">
                            {club.club}
                            {club.isCurrent && <span className="text-[11px] font-bold uppercase tracking-wider text-brand">Now</span>}
                        </p>
                        <p className="text-sm text-muted">
                            {club.stats.goals} goals · {club.stats.assists} assists · {club.stats.appearances} apps
                        </p>
                    </li>
                ))}
            </ul>
        </section>
    );
}
