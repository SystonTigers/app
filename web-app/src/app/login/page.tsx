'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error?.message || 'Login failed');
            }

            // Store token
            localStorage.setItem('user_token', data.data.token);
            localStorage.setItem('user_data', JSON.stringify(data.data.user));

            // Redirect based on whether user has a team
            if (data.data.user?.tenant_id) {
                // User has a team - go to dashboard
                window.location.href = `/${data.data.user.tenant_slug || 'dashboard'}`;
            } else {
                // No team yet - go to join page
                router.push('/join');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
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
                        Identify Yourself
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
                                Comm ID (Email)
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="YOU@EXAMPLE.COM"
                                className="w-full px-4 py-3 bg-black/50 border border-gray-700 text-white placeholder-gray-600 focus:border-brand focus:ring-1 focus:ring-brand focus:bg-black/80 transition-all chamfer-sm outline-none font-bold uppercase"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                                Passcode
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
                                    Lost Passcode?
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
                                    AUTHENTICATING...
                                </span>
                            ) : (
                                'ACCESS TERMINAL'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center border-t border-gray-800 pt-6">
                        <p className="text-sm text-gray-500 font-mono">
                            New Commander?{' '}
                            <Link href="/signup" className="text-brand hover:text-white font-bold transition-colors uppercase tracking-wider">
                                Initialize Account
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
