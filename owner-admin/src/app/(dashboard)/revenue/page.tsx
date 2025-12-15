'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface RevenueSummary {
    period: string;
    totalRevenue: number;
    breakdown: {
        subscriptions: number;
        duesFees: number;
        shopCommission: number;
        printifyMargin: number;
    };
    activeSubscriptions: number;
    topTenants: Array<{ name: string; slug: string; revenue: number }>;
    recentTransactions: Array<{
        id: string;
        type: string;
        amount: number;
        description: string;
        createdAt: number;
    }>;
}

interface Projections {
    mrr: number;
    arr: number;
    byPlan: Record<string, { count: number; mrr: number }>;
    projections: {
        month1: number;
        month3: number;
        month6: number;
        month12: number;
    };
}

export default function RevenuePage() {
    const [summary, setSummary] = useState<RevenueSummary | null>(null);
    const [projections, setProjections] = useState<Projections | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

    useEffect(() => {
        fetchData();
    }, [period]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('owner_token');
            const [summaryRes, projectionsRes] = await Promise.all([
                fetch(`${API_BASE}/owner-api/revenue/summary?period=${period}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/owner-api/revenue/projections`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
            ]);

            const [summaryData, projectionsData] = await Promise.all([
                summaryRes.json(),
                projectionsRes.json(),
            ]);

            if (summaryData.success) setSummary(summaryData.data);
            if (projectionsData.success) setProjections(projectionsData.data);
        } catch (error) {
            console.error('Failed to fetch revenue data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

    const revenueTypeLabels: Record<string, string> = {
        subscription: '📅 Subscription',
        dues_fee: '💳 Dues Fee',
        shop_commission: '🛍️ Shop Commission',
        printify_margin: '👕 Printify Margin',
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-in">
                <div>
                    <h1 className="text-2xl font-bold text-white">Revenue</h1>
                    <p className="text-gray-500 mt-1">Loading revenue data...</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="glass-card p-6 animate-pulse">
                            <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                            <div className="h-8 bg-gray-700 rounded w-3/4"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Revenue Dashboard</h1>
                    <p className="text-gray-500 mt-1">Platform earnings and projections</p>
                </div>
                <div className="flex gap-2">
                    {(['day', 'week', 'month', 'year'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p
                                    ? 'bg-primary-500 text-white'
                                    : 'glass-card text-gray-400 hover:text-white'
                                }`}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-green-500/20 to-green-600/10 glass-card p-6 border border-green-500/20"
                >
                    <div className="text-sm text-green-400">Total Revenue ({period})</div>
                    <div className="text-3xl font-bold text-white mt-1">{formatCurrency(summary?.totalRevenue || 0)}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 glass-card p-6 border border-blue-500/20"
                >
                    <div className="text-sm text-blue-400">Monthly Recurring (MRR)</div>
                    <div className="text-3xl font-bold text-white mt-1">{formatCurrency(projections?.mrr || 0)}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 glass-card p-6 border border-purple-500/20"
                >
                    <div className="text-sm text-purple-400">Annual Recurring (ARR)</div>
                    <div className="text-3xl font-bold text-white mt-1">{formatCurrency(projections?.arr || 0)}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 glass-card p-6 border border-orange-500/20"
                >
                    <div className="text-sm text-orange-400">Active Subscriptions</div>
                    <div className="text-3xl font-bold text-white mt-1">{summary?.activeSubscriptions || 0}</div>
                </motion.div>
            </div>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass-card p-6"
                >
                    <h2 className="font-semibold text-white mb-4">Revenue Breakdown</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">📅 Subscriptions</span>
                            <span className="font-medium text-white">{formatCurrency(summary?.breakdown.subscriptions || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">💳 Dues Collection Fees</span>
                            <span className="font-medium text-white">{formatCurrency(summary?.breakdown.duesFees || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">🛍️ Shop Commission</span>
                            <span className="font-medium text-white">{formatCurrency(summary?.breakdown.shopCommission || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400">👕 Printify Margin</span>
                            <span className="font-medium text-white">{formatCurrency(summary?.breakdown.printifyMargin || 0)}</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="glass-card p-6"
                >
                    <h2 className="font-semibold text-white mb-4">Subscribers by Plan</h2>
                    <div className="space-y-4">
                        {projections?.byPlan && Object.entries(projections.byPlan).map(([plan, data]) => (
                            <div key={plan} className="flex items-center justify-between">
                                <span className="text-gray-400 capitalize">{plan.replace('_', ' ')}</span>
                                <div className="text-right">
                                    <span className="font-medium text-white">{data.count} clubs</span>
                                    <span className="text-gray-500 ml-2">({formatCurrency(data.mrr)}/mo)</span>
                                </div>
                            </div>
                        ))}
                        {!projections?.byPlan && (
                            <p className="text-gray-500">No subscription data yet</p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Top Tenants & Projections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="glass-card overflow-hidden"
                >
                    <div className="p-4 border-b border-white/5">
                        <h2 className="font-semibold text-white">Top Earning Clubs</h2>
                    </div>
                    <div className="divide-y divide-white/5">
                        {(summary?.topTenants || []).map((tenant, i) => (
                            <div key={tenant.slug} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center text-xs font-medium text-primary-400">
                                        {i + 1}
                                    </span>
                                    <span className="font-medium text-white">{tenant.name}</span>
                                </div>
                                <span className="text-green-400 font-medium">{formatCurrency(tenant.revenue)}</span>
                            </div>
                        ))}
                        {(!summary?.topTenants?.length) && (
                            <div className="p-8 text-center text-gray-500">No revenue data yet</div>
                        )}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="glass-card overflow-hidden"
                >
                    <div className="p-4 border-b border-white/5">
                        <h2 className="font-semibold text-white">Revenue Projections</h2>
                    </div>
                    <div className="p-4 space-y-4">
                        {projections?.projections && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">1 month</span>
                                    <span className="font-medium text-white">{formatCurrency(projections.projections.month1)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">3 months</span>
                                    <span className="font-medium text-white">{formatCurrency(projections.projections.month3)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">6 months</span>
                                    <span className="font-medium text-white">{formatCurrency(projections.projections.month6)}</span>
                                </div>
                                <div className="flex justify-between pt-4 border-t border-white/10">
                                    <span className="text-white font-medium">12 months (ARR)</span>
                                    <span className="font-bold text-green-400 text-lg">{formatCurrency(projections.projections.month12)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Recent Transactions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="glass-card overflow-hidden"
            >
                <div className="p-4 border-b border-white/5">
                    <h2 className="font-semibold text-white">Recent Transactions</h2>
                </div>
                <div className="divide-y divide-white/5">
                    {(summary?.recentTransactions || []).map((txn) => (
                        <div key={txn.id} className="p-4 flex items-center justify-between">
                            <div>
                                <span className="text-sm mr-2">{revenueTypeLabels[txn.type] || txn.type}</span>
                                <span className="text-gray-500 text-sm">{txn.description}</span>
                            </div>
                            <div className="text-right">
                                <span className="font-medium text-green-400">{formatCurrency(txn.amount)}</span>
                                <div className="text-xs text-gray-500">
                                    {new Date(txn.createdAt * 1000).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!summary?.recentTransactions?.length) && (
                        <div className="p-8 text-center text-gray-500">No transactions yet</div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
