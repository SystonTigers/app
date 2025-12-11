'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface DashboardStats {
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    monthlyRevenue: number;
    recentSignups: number;
    proPlans: number;
    starterPlans: number;
}

const API_BASE = 'http://localhost:8787'; // Forced local for debugging

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Check localStorage auth first
        const isAuthenticated = localStorage.getItem('owner_authenticated');
        if (!isAuthenticated) {
            window.location.href = '/login';
            return;
        }
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('owner_token');
            const response = await fetch(`${API_BASE}/api/v1/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Don't set error, just redirect silently
                    setLoading(false);
                    window.location.href = '/login';
                    return;
                }
                throw new Error('Failed to fetch stats');
            }

            const data = await response.json();
            if (data.success) {
                // Map the response to our stats format
                const byStatus = data.stats.byStatus || [];
                const byPlan = data.stats.byPlan || [];

                setStats({
                    totalTenants: byStatus.reduce((sum: number, s: any) => sum + (s.count || 0), 0),
                    activeTenants: byStatus.find((s: any) => s.status === 'active')?.count || 0,
                    trialTenants: byStatus.find((s: any) => s.status === 'trial')?.count || 0,
                    monthlyRevenue: calculateMRR(byPlan),
                    recentSignups: data.stats.recentSignups || 0,
                    proPlans: byPlan.find((p: any) => p.plan === 'pro')?.count || 0,
                    starterPlans: byPlan.find((p: any) => p.plan === 'starter')?.count || 0,
                });
            }
            setLoading(false);
        } catch (err: any) {
            // Ignore NEXT_REDIRECT errors
            if (err.message?.includes('NEXT_REDIRECT')) {
                return;
            }
            setError(err.message || 'Failed to load dashboard');
            setLoading(false);
        }
    };

    const calculateMRR = (byPlan: any[]) => {
        const proCount = byPlan.find((p: any) => p.plan === 'pro')?.count || 0;
        const starterCount = byPlan.find((p: any) => p.plan === 'starter')?.count || 0;
        return proCount * 29.99 + starterCount * 14.99;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-card p-6 text-center">
                <div className="text-red-400 mb-4">{error}</div>
                <button onClick={fetchStats} className="btn-primary">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-500 mt-1">Platform overview and key metrics</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Monthly Revenue"
                    value={`£${stats?.monthlyRevenue?.toFixed(2) || '0.00'}`}
                    change="+12%"
                    changeType="positive"
                    icon={<RevenueIcon />}
                    delay={0}
                />
                <StatCard
                    title="Active Tenants"
                    value={stats?.activeTenants?.toString() || '0'}
                    subtitle={`${stats?.trialTenants || 0} in trial`}
                    icon={<TenantsIcon />}
                    delay={0.1}
                />
                <StatCard
                    title="Pro Plans"
                    value={stats?.proPlans?.toString() || '0'}
                    subtitle={`${stats?.starterPlans || 0} starter`}
                    icon={<ProIcon />}
                    delay={0.2}
                />
                <StatCard
                    title="Recent Signups"
                    value={stats?.recentSignups?.toString() || '0'}
                    subtitle="Last 30 days"
                    icon={<SignupIcon />}
                    delay={0.3}
                />
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-1">
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                        <div className="space-y-2">
                            <QuickAction href="/tenants" label="View All Tenants" />
                            <QuickAction href="/promo-codes" label="Create Promo Code" />
                            <QuickAction href="/support" label="Check Support Tickets" />
                            <QuickAction href="/settings" label="Platform Settings" />
                        </div>
                    </div>
                </div>

                {/* Platform Health */}
                <div className="lg:col-span-2">
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Platform Health</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <HealthMetric label="API Uptime" value="99.9%" status="healthy" />
                            <HealthMetric label="Avg Response" value="45ms" status="healthy" />
                            <HealthMetric label="Error Rate" value="0.1%" status="healthy" />
                            <HealthMetric label="Active Users" value="127" status="neutral" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Revenue Chart Placeholder */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Revenue Trend</h2>
                <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-xl">
                    <div className="text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                        <p>Revenue chart coming soon</p>
                        <p className="text-sm">Connect Stripe for detailed analytics</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Stat Card Component
function StatCard({
    title,
    value,
    change,
    changeType,
    subtitle,
    icon,
    delay = 0,
}: {
    title: string;
    value: string;
    change?: string;
    changeType?: 'positive' | 'negative';
    subtitle?: string;
    icon: React.ReactNode;
    delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className="stat-card group"
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                    {change && (
                        <p className={`text-sm mt-1 ${changeType === 'positive' ? 'text-green-400' : 'text-red-400'}`}>
                            {change} from last month
                        </p>
                    )}
                    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}

// Quick Action Button
function QuickAction({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
        >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
            <span className="text-sm text-gray-300 group-hover:text-white">{label}</span>
        </a>
    );
}

// Health Metric
function HealthMetric({ label, value, status }: { label: string; value: string; status: 'healthy' | 'warning' | 'critical' | 'neutral' }) {
    const statusColors = {
        healthy: 'bg-green-500',
        warning: 'bg-yellow-500',
        critical: 'bg-red-500',
        neutral: 'bg-gray-500',
    };

    return (
        <div className="text-center p-4 rounded-xl bg-white/5">
            <div className="flex items-center justify-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                <span className="text-lg font-semibold text-white">{value}</span>
            </div>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    );
}

// Icons
function RevenueIcon() {
    return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function TenantsIcon() {
    return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function ProIcon() {
    return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
    );
}

function SignupIcon() {
    return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
    );
}
