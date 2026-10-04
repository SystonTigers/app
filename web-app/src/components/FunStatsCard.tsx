'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { API_BASE } from '@/lib/session';
import { Icon, type IconName } from '@/components/ui/Icon';

interface FunStat {
    key: string;
    label: string;
    value: string | number;
    description: string;
}

interface FunStatsCardProps {
    tenant: string;
    seasonId?: string | null;
}

/** Our icons for the server's fun stats (it sends emoji, which the website doesn't use). */
const ICONS: Record<string, IconName> = {
    avg_goals_per_match: 'chart',
    biggest_win: 'trophy',
    clean_sheets: 'shield',
    comeback_wins: 'refresh',
    different_scorers: 'users',
    disciplinary_record: 'whistle',
    goals_first_15: 'sparkles',
    hattrick_count: 'ball',
    home_win_pct: 'home',
    overall_win_pct: 'chart',
    scoring_streak_best: 'ball',
    unbeaten_streak_best: 'shield',
    win_streak_best: 'trophy',
};

const CARD_COLOURS: Record<string, { label: string; className: string }> = {
    '🟨': { label: 'yellow', className: 'bg-yellow-400' },
    '🟥': { label: 'red', className: 'bg-red-500' },
};

/** "2🟨 1🟥" becomes 2 [yellow card] 1 [red card]; other values show as they are. */
function StatValue({ value }: { value: string | number }): ReactNode {
    const text = String(value);
    if (!/[🟨🟥]/u.test(text)) return text;
    return (
        <span className="inline-flex items-center gap-3">
            {text.split(/\s+/).filter(Boolean).map((part) => {
                const card = Object.keys(CARD_COLOURS).find((c) => part.includes(c));
                if (!card) return <span key={part}>{part}</span>;
                const count = part.replace(card, '');
                return (
                    <span key={part} className="inline-flex items-center gap-1.5">
                        {count}
                        <span className={`inline-block w-3.5 h-5 rounded-[2px] ${CARD_COLOURS[card].className}`} aria-hidden="true" />
                        <span className="sr-only">{CARD_COLOURS[card].label}</span>
                    </span>
                );
            })}
        </span>
    );
}

export function FunStatsCard({ tenant, seasonId }: FunStatsCardProps) {
    const [stats, setStats] = useState<FunStat[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const query = seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : '';
            const res = await fetch(`${API_BASE}/public/${encodeURIComponent(tenant)}/stats/fun${query}`, { cache: 'no-store' });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) setStats(data.data);
        } catch (err) {
            console.error('Failed to load fun stats:', err);
        } finally {
            setLoading(false);
        }
    }, [tenant, seasonId]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) {
        return (
            <section aria-busy="true" aria-label="Loading fun stats">
                <h2 className="text-2xl italic mb-4">Fun stats</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-32 card animate-pulse" />)}
                </div>
            </section>
        );
    }

    // Extras only: nothing to show is fine (the season numbers below still show)
    if (stats.length === 0) return null;

    return (
        <section aria-labelledby="fun-stats">
            <h2 id="fun-stats" className="text-2xl italic mb-4">Fun stats</h2>
            <ul className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {stats.map((stat) => (
                    <li key={stat.key} className="card p-4 md:p-5 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-xs md:text-sm font-sans font-bold text-muted uppercase tracking-wider leading-snug">{stat.label}</h3>
                            <Icon name={ICONS[stat.key] ?? 'star'} className="w-5 h-5 text-brand" />
                        </div>
                        <p className="font-display text-3xl md:text-4xl font-extrabold text-foreground mb-1">
                            <StatValue value={stat.value} />
                        </p>
                        {stat.description && <p className="text-xs text-muted mt-auto">{stat.description}</p>}
                    </li>
                ))}
            </ul>
        </section>
    );
}
