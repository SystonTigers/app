'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE, saveSession } from '@/lib/session';

function VerifyEmailContent() {
  const token = useSearchParams().get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('This link is missing its verification code.');
      return;
    }
    fetch(`${API_BASE}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          setStatus('error');
          setError(data.error?.message || 'This link has expired or was already used.');
          return;
        }
        saveSession(data.data.token, data.data.user);
        setStatus('success');
        setTimeout(() => { window.location.href = data.data.redirect || '/create-team'; }, 1500);
      })
      .catch(() => {
        setStatus('error');
        setError("We couldn't reach the server. Check your connection and try again.");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0D0F] px-4">
      <div className="max-w-md w-full bg-gray-900/60 chamfer-lg border border-gray-800 p-8 text-center">
        {status === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent mx-auto mb-4" />
            <h1 className="text-2xl font-black text-white">Checking your email link…</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-black text-white mb-2">Email confirmed</h1>
            <p className="text-gray-400">Taking you to your club…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-black text-white mb-2">We couldn't confirm your email</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link href="/login" className="inline-block w-full py-3 bg-brand text-black font-black uppercase chamfer-sm hover:bg-white">
              Log in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
