'use client';

import { useState, useEffect } from 'react';

interface FunStat {
    key: string;
    title: string;
    value: string | number;
    description?: string;
    icon?: string;
}

interface FunStatsProps {
    tenant: string;
    seasonId?: string | null;
    playerId?: string;
    type?: 'team' | 'player';
}

export function FunStats({ tenant, seasonId, playerId, type = 'team' }: FunStatsProps) {
    const [stats, setStats] = useState<FunStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [tenant, seasonId, playerId]);

    async function loadStats() {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const params = seasonId ? `?seasonId=${seasonId}` : '';
            const endpoint = type === 'player' && playerId
                ? `/api/v1/stats/fun/player/${playerId}${params}`
                : `/api/v1/stats/fun${params}`;

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                setStats(data.data);
            }
        } catch (err) {
            console.error('Failed to load fun stats:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (stats.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
                <div
                    key={stat.key}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{stat.icon || '📊'}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                    </div>
                    {stat.description && (
                        <div className="text-xs text-gray-400 mt-1">{stat.description}</div>
                    )}
                </div>
            ))}
        </div>
    );
}
