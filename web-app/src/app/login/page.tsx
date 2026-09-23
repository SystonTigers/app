'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_BASE, homeFor, saveSession } from '@/lib/session';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [clubs, setClubs] = useState<{ id: string; name: string; slug: string }[]>([]);

    const logIn = async (tenantId?: string) => {
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, ...(tenantId ? { tenant_id: tenantId } : {}) })
            });

            const data = await response.json().catch(() => ({}));

            if (data.multipleTenants) {
                // Same email in more than one club: ask which one
                setClubs(data.tenants || []);
                return;
            }
            if (!response.ok || !data.success) {
                throw new Error(data.error?.message || 'Wrong email or password.');
            }

            saveSession(data.data.token, data.data.user);
            window.location.href = homeFor(data.data.user);
        } catch (err: any) {
            setError(err.message === 'Failed to fetch' ? "We couldn't reach the server. Check your connection and try again." : err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void logIn();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0D0F] bg-[url('/assets/hero-bg.jpg')] bg-cover bg-center bg-no-repeat relative">
            <div className="absolute inset-0 bg-[#0B0D0F]/90 backdrop-blur-sm" />

            <div className="relative z-10 max-w-md w-full px-4">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        Boost Huddle
                    </h1>
                    <p className="text-brand font-bold uppercase tracking-widest text-sm bg-brand/10 inline-block px-3 py-1 chamfer-sm border border-brand/20">
                        Log in to your club
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-gray-900/60 chamfer-lg border border-gray-800 p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-2 h-2 bg-brand" />
                    <div className="absolute top-0 right-0 w-2 h-2 bg-brand" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 bg-brand" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-brand" />

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-900/20 border border-red-500/50 text-red-400 text-sm font-bold text-center chamfer-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 bg-black/50 border border-gray-700 text-white placeholder-gray-600 focus:border-brand focus:ring-1 focus:ring-brand focus:bg-black/80 transition-all chamfer-sm outline-none font-bold"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-black/50 border border-gray-700 text-white placeholder-gray-600 focus:border-brand focus:ring-1 focus:ring-brand focus:bg-black/80 transition-all chamfer-sm outline-none font-bold tracking-widest"
                                required
                            />
                            <div className="mt-2 text-right">
                                <Link href="/forgot-password" className="text-xs font-mono text-gray-500 hover:text-brand uppercase transition-colors">
                                    Forgotten password?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 px-6 bg-brand text-black font-black uppercase italic tracking-wider chamfer-sm hover:bg-white hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 transform active:scale-[0.98]"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    LOGGING IN...
                                </span>
                            ) : (
                                'LOG IN'
                            )}
                        </button>
                    </form>

                    {clubs.length > 0 && (
                        <div className="mt-6 space-y-2">
                            <p className="text-sm text-gray-400 text-center">You're in more than one club. Which one?</p>
                            {clubs.map((c) => (
                                <button key={c.id} type="button" disabled={loading} onClick={() => logIn(c.id)}
                                    className="w-full py-3 px-4 bg-black/50 border border-gray-700 text-white font-bold chamfer-sm hover:border-brand">
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 text-center border-t border-gray-800 pt-6 space-y-2">
                        <p className="text-sm text-gray-400">
                            Running a club?{' '}
                            <Link href="/create-team" className="text-brand hover:text-white font-bold transition-colors">
                                Start a free trial
                            </Link>
                        </p>
                        <p className="text-sm text-gray-500">
                            Joining a club?{' '}
                            <Link href="/signup" className="text-gray-300 hover:text-white font-bold transition-colors">
                                Create an account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
