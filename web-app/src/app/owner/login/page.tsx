'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { buttonClass, inputClass } from '@/components/owner/ui';

function safeNext(next: string | null): string {
  // Only paths inside the owner panel, never another site
  return next && next.startsWith('/owner') && !next.startsWith('//') ? next : '/owner';
}

function OwnerLogin() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json().catch(() => null)) as { success?: boolean; error?: { message?: string } } | null;
      if (!res.ok || !body?.success) throw new Error(body?.error?.message || "That email and password don't match.");
      window.location.href = safeNext(params.get('next'));
    } catch (err) {
      setError(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : "Couldn't reach the server. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D0F] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black italic uppercase text-white">Boost Huddle</h1>
          <p className="mt-3 inline-block text-brand font-bold uppercase tracking-widest text-xs bg-brand/10 px-3 py-1 chamfer-sm border border-brand/20">Owner panel</p>
        </div>
        <form onSubmit={submit} className="bg-gray-900/60 border border-gray-800 chamfer-lg p-6 space-y-4">
          {error ? <div role="alert" className="p-3 bg-red-900/20 border border-red-500/50 text-red-300 text-sm chamfer-sm">{error}</div> : null}
          <div>
            <label htmlFor="owner-email" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Email</label>
            <input id="owner-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="owner-password" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Password</label>
            <input id="owner-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </div>
          <button type="submit" disabled={busy} className={`${buttonClass} w-full py-3`}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="text-xs text-gray-500 text-center">For Boost Huddle staff. Club managers sign in <a href="/login" className="text-brand">here</a>.</p>
        </form>
      </div>
    </div>
  );
}

export default function OwnerLoginPage() {
  return (
    <Suspense fallback={null}>
      <OwnerLogin />
    </Suspense>
  );
}
