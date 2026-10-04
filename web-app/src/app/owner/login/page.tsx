'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthError, AuthField, AuthShell } from '@/components/ui/AuthShell';

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
      if (!res.ok || !body?.success) throw new Error(body?.error?.message || "That email and password don't match. Check them and try again.");
      window.location.href = safeNext(params.get('next'));
    } catch (err) {
      setError(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : "We couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Owner panel"
      subtitle="For Boost Huddle staff. Log in to look after every club."
      footer={<p>Run a club? <Link href="/login" className="text-brand font-bold hover:underline">Log in to your club</Link></p>}
    >
      <form onSubmit={submit} className="space-y-5">
        <AuthError>{error}</AuthError>
        <AuthField id="owner-email" label="Email" type="email" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <AuthField id="owner-password" label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </AuthShell>
  );
}

export default function OwnerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-busy="true" />}>
      <OwnerLogin />
    </Suspense>
  );
}
