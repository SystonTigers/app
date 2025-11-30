'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MagicLinkPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const router = useRouter();

    const sendMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/v1/auth/magic/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (data.success) {
                setSent(true);
            } else {
                alert(data.error || 'Failed to send magic link');
            }
        } catch (error) {
            alert('Failed to send magic link');
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                    <div className="text-6xl mb-4">📧</div>
                    <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        We've sent a magic link to <strong>{email}</strong>
                    </p>
                    <p className="text-sm text-gray-500">
                        Click the link in the email to sign in. The link will expire in 15 minutes.
                    </p>
                    <button
                        onClick={() => setSent(false)}
                        className="mt-6 text-brand hover:underline text-sm"
                    >
                        Send to a different email
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Sign In</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        We'll send you a magic link to sign in without a password
                    </p>
                </div>

                <form onSubmit={sendMagicLink}>
                    <div className="mb-6">
                        <label htmlFor="email" className="block text-sm font-medium mb-2">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="vous@example.com"
                            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !email}
                        className="w-full bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                        {loading ? 'Sending...' : 'Send Magic Link'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/auth/admin-login')}
                        className="text-sm text-brand hover:underline"
                    >
                        Admin? Sign in here
                    </button>
                </div>
            </div>
        </div>
    );
}
