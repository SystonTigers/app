'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinPage() {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [userName, setUserName] = useState('');

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('user_token');
        const userData = localStorage.getItem('user_data');

        if (!token) {
            // Not logged in, redirect to signup
            router.push('/signup');
            return;
        }

        if (userData) {
            try {
                const user = JSON.parse(userData);
                setUserName(user.name || user.email?.split('@')[0] || 'there');
            } catch (e) {
                console.error('Error parsing user data');
            }
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const token = localStorage.getItem('user_token');
        if (!token) {
            router.push('/signup');
            return;
        }

        try {
            // Try code-login endpoint (handles both player and fan codes)
            const response = await fetch('/api/v1/auth/code-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: code.toUpperCase() })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error?.message || 'Invalid code');
            }

            // Update token if new one provided
            if (data.data?.token) {
                localStorage.setItem('user_token', data.data.token);
            }
            if (data.data?.user) {
                localStorage.setItem('user_data', JSON.stringify(data.data.user));
            }

            // Redirect to welcome page with team info
            router.push('/welcome');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-600 px-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">Hi {userName}!</h1>
                    <p className="text-green-100">Enter your team code to get started</p>
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        <div>
                            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Access Code
                            </label>
                            <input
                                id="code"
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="TEAM-XXXX"
                                className="w-full px-4 py-4 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 dark:border-gray-600 rounded-xl 
                                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase
                                         focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                required
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                                Ask your team manager for your access code
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !code}
                            className="w-full py-4 px-4 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold text-lg
                                     rounded-xl hover:from-green-600 hover:to-teal-600 focus:ring-2 focus:ring-green-500 
                                     focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Joining...
                                </span>
                            ) : (
                                'Join Team'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Want to create your own team?
                        </p>
                        <Link
                            href="/create-team"
                            className="block w-full py-3 px-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                                     font-medium rounded-xl text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        >
                            Create a Team
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
