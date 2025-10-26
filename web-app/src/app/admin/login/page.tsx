'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startMagicLogin } from '@/lib/sdk';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [devMagicLink, setDevMagicLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    setDevMagicLink('');

    try {
      console.log('[Login] Sending magic link for:', email);
      // Send magic link request
      await startMagicLogin({ email });
      console.log('[Login] Magic link sent successfully');
      setSent(true);

      // Always try to fetch dev magic link for convenience (backend will return it if in dev mode)
      try {
        const devRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE || 'https://syston-postbus.team-platform-2025.workers.dev'}/dev/auth/magic-link`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          }
        );
        if (devRes.ok) {
          const data = await devRes.json();
          if (data.magicLink) {
            setDevMagicLink(data.magicLink);
          }
        }
      } catch (devErr) {
        console.log('[Login] Dev magic link not available (production mode)');
      }
    } catch (err: any) {
      console.error('[Login] Magic link error:', err);
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLinkClick = () => {
    if (devMagicLink) {
      // Extract token from the link
      const url = new URL(devMagicLink);
      const token = url.searchParams.get('token');
      if (token) {
        // Navigate to the onboard page with the token
        router.push(`/admin/onboard?token=${token}`);
      }
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Check your email</h1>
          <p className="text-gray-600 mb-6">
            We've sent a magic link to <strong>{email}</strong>. Click the link in the email to
            sign in.
          </p>

          {devMagicLink && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800 mb-3">
                <strong>Development mode:</strong> For testing, you can use this magic link
                directly:
              </p>
              <button
                onClick={handleDevLinkClick}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition"
              >
                Open Magic Link
              </button>
            </div>
          )}

          <button
            onClick={() => {
              setSent(false);
              setEmail('');
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Sign In</h1>
        <p className="text-gray-600 mb-6">Enter your email to receive a magic link</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dan@example.com"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
      </div>
    </div>
  );
}
