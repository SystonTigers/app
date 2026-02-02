// app/admin/page.tsx
// Owner Console Dashboard

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdminStats, type AdminStats } from '@/lib/sdk';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getAdminStats();
      setStats(data.stats);
      setError('');
    } catch (err: any) {
      console.error('Admin stats error:', err);
      // If unauthorized, redirect to login
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        router.push('/admin/login');
      } else {
        setError(err?.message || 'Failed to fetch stats');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D0F] flex items-center justify-center">
        <div className="text-brand font-mono animate-pulse">Initializing Command...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0D0F] flex items-center justify-center">
        <div className="max-w-md w-full space-y-4">
          <div className="bg-red-900/20 border border-red-800 chamfer-lg p-6 text-red-500 text-center">
            {error}
          </div>
          <Link
            href="/admin/login"
            className="block w-full bg-brand text-[#0B0D0F] py-3 px-4 font-bold uppercase tracking-wider hover:bg-white transition-colors text-center chamfer-sm"
          >
            Access Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D0F]">
      {/* Header */}
      <header className="bg-[#0B0D0F] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-black uppercase italic text-white tracking-wider">
              <span className="text-brand">Master</span> Command
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 border border-gray-700 chamfer-sm">
              <span className="w-2 h-2 bg-brand rotate-45 animate-pulse" />
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Platform Admin
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-900/50 chamfer-lg border border-gray-800 p-6 relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-2 text-6xl font-black text-gray-800 -rotate-12 select-none z-0">01</div>
            <div className="relative z-10">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">New Signups</div>
              <div className="text-4xl font-black text-white">
                {stats?.recentSignups || 0}
              </div>
              <div className="mt-2 text-xs text-brand font-mono">Last 30 days</div>
            </div>
          </div>

          <div className="bg-gray-900/50 chamfer-lg border border-gray-800 p-6 relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-2 text-6xl font-black text-gray-800 -rotate-12 select-none z-0">02</div>
            <div className="relative z-10">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">System Usage</div>
              <div className="text-4xl font-black text-white">
                {stats?.monthlyUsage?.toLocaleString() || 0}
              </div>
              <div className="mt-2 text-xs text-brand font-mono">Ops this month</div>
            </div>
          </div>

          <div className="bg-gray-900/50 chamfer-lg border border-gray-800 p-6 relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-2 text-6xl font-black text-gray-800 -rotate-12 select-none z-0">03</div>
            <div className="relative z-10">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Active Tenants</div>
              <div className="text-4xl font-black text-green-500">
                {stats?.byStatus.find(s => s.status === 'active')?.count || 0}
              </div>
              <div className="mt-2 text-xs text-gray-400 font-mono">
                {stats?.byStatus.find(s => s.status === 'trial')?.count || 0} in trial
              </div>
            </div>
          </div>

          <div className="bg-gray-900/50 chamfer-lg border border-gray-800 p-6 relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-2 text-6xl font-black text-gray-800 -rotate-12 select-none z-0">04</div>
            <div className="relative z-10">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Pro Tier</div>
              <div className="text-4xl font-black text-brand">
                {stats?.byPlan.find(p => p.plan === 'pro')?.count || 0}
              </div>
              <div className="mt-2 text-xs text-gray-400 font-mono">
                Lifetime & Monthly
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl font-black text-white uppercase italic mb-6">Operations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link href="/admin/tenants" className="bg-gray-900/80 chamfer-lg border border-gray-800 p-8 hover:border-brand hover:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all group">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-900/30 border border-blue-500/30 chamfer-sm flex items-center justify-center group-hover:bg-brand group-hover:text-black transition-colors">
                <svg className="h-6 w-6 text-blue-400 group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-lg font-bold text-white uppercase tracking-tight">Manage Tenants</div>
                <div className="text-xs text-gray-500 font-mono">View & Edit Accounts</div>
              </div>
            </div>
          </Link>

          <Link href="/admin/promo-codes" className="bg-gray-900/80 chamfer-lg border border-gray-800 p-8 hover:border-brand hover:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all group">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-12 h-12 bg-green-900/30 border border-green-500/30 chamfer-sm flex items-center justify-center group-hover:bg-brand group-hover:text-black transition-colors">
                <svg className="h-6 w-6 text-green-400 group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-lg font-bold text-white uppercase tracking-tight">Promo Codes</div>
                <div className="text-xs text-gray-500 font-mono">Create Discounts</div>
              </div>
            </div>
          </Link>

          <Link href="/admin/analytics" className="bg-gray-900/80 chamfer-lg border border-gray-800 p-8 hover:border-brand hover:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all group">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-900/30 border border-purple-500/30 chamfer-sm flex items-center justify-center group-hover:bg-brand group-hover:text-black transition-colors">
                <svg className="h-6 w-6 text-purple-400 group-hover:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-lg font-bold text-white uppercase tracking-tight">Analytics</div>
                <div className="text-xs text-gray-500 font-mono">Global Metrics</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900/50 chamfer-lg border border-gray-800 p-6">
            <h3 className="text-lg font-black uppercase italic text-white mb-6">Tenants by Status</h3>
            <div className="space-y-4">
              {stats?.byStatus.map((item: any) => (
                <div key={item.status} className="flex items-center justify-between group">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rotate-45 mr-3 transition-all group-hover:scale-125 ${item.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                        item.status === 'trial' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                          item.status === 'suspended' ? 'bg-yellow-500' :
                            'bg-gray-500'
                      }`} />
                    <span className="text-sm font-bold text-gray-300 capitalize tracking-wider">
                      {item.status}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-brand">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900/50 chamfer-lg border border-gray-800 p-6">
            <h3 className="text-lg font-black uppercase italic text-white mb-6">Tenants by Plan</h3>
            <div className="space-y-4">
              {stats?.byPlan.map((item: any) => (
                <div key={item.plan} className="flex items-center justify-between group">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rotate-45 mr-3 transition-all group-hover:scale-125 ${item.plan === 'pro' ? 'bg-brand shadow-[0_0_8px_rgba(0,255,255,0.5)]' : 'bg-gray-400'
                      }`} />
                    <span className="text-sm font-bold text-gray-300 capitalize tracking-wider">
                      {item.plan}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-brand">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
