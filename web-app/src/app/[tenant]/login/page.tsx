'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

type LoginMethod = 'code' | 'fan';
type Role = 'parent' | 'player' | 'coach' | 'fan';

export default function LoginPage() {
    const router = useRouter();
    const params = useParams();
    const tenant = params.tenant as string;

    const [method, setMethod] = useState<LoginMethod>('code');
    const [code, setCode] = useState('');
    const [role, setRole] = useState<Role>('parent');
    const [email, setEmail] = useState(''); // For fans
    const [fanCode, setFanCode] = useState(''); // Team fan code
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [coachCodeValid, setCoachCodeValid] = useState(false);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

    const validateCode = async (inputCode: string) => {
        // Check if code is a coach code (format: TEAM-CXXXX)
        const isCoachCode = /-C\d{3,4}$/.test(inputCode);
        setCoachCodeValid(isCoachCode);

        // If switching to coach role but no coach code, reset
        if (role === 'coach' && !isCoachCode) {
            setRole('parent');
        }
    };

    const handleCodeChange = (value: string) => {
        const upperValue = value.toUpperCase();
        setCode(upperValue);
        validateCode(upperValue);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (method === 'code') {
                // Login with player/coach code
                const response = await fetch(`${API_BASE}/api/v1/auth/code-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        role,
                        tenant,
                    }),
                    credentials: 'include',
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error?.message || 'Invalid code');
                }

                const data = await response.json();
                // Store session
                localStorage.setItem('user_role', role);
                localStorage.setItem('user_token', data.token);
                if (data.playerId) {
                    localStorage.setItem('player_id', data.playerId);
                }

                // Redirect based on role
                router.push(`/${tenant}`);
            } else {
                // Fan login with email + team fan code
                const response = await fetch(`${API_BASE}/api/v1/auth/fan-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        fanCode,
                        tenant,
                    }),
                    credentials: 'include',
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error?.message || 'Invalid fan code');
                }

                const data = await response.json();
                localStorage.setItem('user_role', 'fan');
                localStorage.setItem('user_token', data.token);

                router.push(`/${tenant}`);
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 px-4">
            <div className="max-w-md w-full">
                {/* Logo/Team Name */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-black dark:bg-white rounded-2xl flex items-center justify-center">
                        <span className="text-2xl font-bold text-white dark:text-black">
                            {tenant?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                        {tenant?.replace(/-/g, ' ')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Sign in to access your team</p>
                </div>

                {/* Method Tabs */}
                <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1 mb-6">
                    <button
                        type="button"
                        onClick={() => setMethod('code')}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${method === 'code'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                            : 'text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        Login Code
                    </button>
                    <button
                        type="button"
                        onClick={() => setMethod('fan')}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${method === 'fan'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                            : 'text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        Fan Access
                    </button>
                </div>

                {/* Login Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {method === 'code' ? (
                            <>
                                {/* Code Entry */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Your Login Code
                                    </label>
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => handleCodeChange(e.target.value)}
                                        placeholder="TIGERS-8472"
                                        className="w-full px-4 py-3 text-center text-lg font-mono tracking-wider border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1.5">
                                        Enter the code provided by your team manager
                                    </p>
                                </div>

                                {/* Role Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        I am a...
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setRole('parent')}
                                            className={`py-3 px-2 rounded-lg border-2 text-sm font-medium transition-all ${role === 'parent'
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                }`}
                                        >
                                            👨‍👩‍👧 Parent
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRole('player')}
                                            className={`py-3 px-2 rounded-lg border-2 text-sm font-medium transition-all ${role === 'player'
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                }`}
                                        >
                                            ⚽ Player
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => coachCodeValid && setRole('coach')}
                                            disabled={!coachCodeValid}
                                            className={`py-3 px-2 rounded-lg border-2 text-sm font-medium transition-all ${role === 'coach'
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : coachCodeValid
                                                    ? 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                    : 'border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                }`}
                                        >
                                            🏃 Coach
                                        </button>
                                    </div>
                                    {!coachCodeValid && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            Coach role requires a coach code from your manager
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Fan Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Your Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="fan@email.com"
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>

                                {/* Team Fan Code */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Team Fan Code
                                    </label>
                                    <input
                                        type="text"
                                        value={fanCode}
                                        onChange={(e) => setFanCode(e.target.value.toUpperCase())}
                                        placeholder="TIGERS-FAN"
                                        className="w-full px-4 py-3 text-center font-mono tracking-wider border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1.5">
                                        Ask the team for their fan access code
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || (method === 'code' && !code) || (method === 'fan' && (!email || !fanCode))}
                            className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                {/* Manager Link */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    Team manager?{' '}
                    <a href={`/${tenant}/admin/login`} className="text-blue-600 hover:underline">
                        Sign in here
                    </a>
                </p>
            </div>
        </div>
    );
}
