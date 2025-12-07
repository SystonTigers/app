'use client';

import { useEffect, useState } from 'react';

interface FunStat {
    key: string;
    label: string;
    value: string | number;
    description: string;
    icon?: string;
}

interface FunStatsCardProps {
    tenant: string;
    seasonId?: string | null;
}

export function FunStatsCard({ tenant, seasonId }: FunStatsCardProps) {
    const [stats, setStats] = useState<FunStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, [tenant, seasonId]);

    async function loadStats() {
        try {
            setLoading(true);
            const query = seasonId ? `?seasonId=${seasonId}` : '';
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/public/${tenant}/stats/fun${query}`);
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
            <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                <h2 className="text-2xl font-black uppercase tracking-tight mb-6 text-brand">Fun Stats</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </section>
        );
    }

    if (stats.length === 0) {
        return null;
    }

    return (
        <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                <span className="text-brand">Fun Stats</span>
                <span className="text-2xl">🎯</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.key}
                        className="group p-6 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 hover:from-brand/10 hover:to-brand/5 border border-gray-200 dark:border-gray-700 hover:border-brand/30 transition-all duration-200 hover:scale-[1.02]"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                {stat.label}
                            </h3>
                            {stat.icon && (
                                <span className="text-2xl group-hover:scale-110 transition-transform">
                                    {stat.icon}
                                </span>
                            )}
                        </div>

                        <div className="text-3xl font-black text-brand mb-2">
                            {stat.value}
                        </div>

                        {stat.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {stat.description}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
