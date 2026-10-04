'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_BASE, homeFor, saveSession } from '@/lib/session';
import { AuthError, AuthField, AuthShell } from '@/components/ui/AuthShell';
import { Icon } from '@/components/ui/Icon';

interface ClubChoice {
  id: string;
  name: string;
  slug: string;
}

/** Log in with email and password, for everyone (club staff, parents, players). */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clubs, setClubs] = useState<ClubChoice[]>([]);

  const logIn = async (tenantId?: string) => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(tenantId ? { tenant_id: tenantId } : {}) }),
      });
      const data = await response.json().catch(() => ({}));

      if (data.multipleTenants) {
        // Same email in more than one club: ask which one
        setClubs(data.tenants || []);
        return;
      }
      if (!response.ok || !data.success) {
        setError(response.status === 401 || !data.error?.message
          ? 'That email and password don’t match. Check them and try again, or reset your password.'
          : data.error.message);
        return;
      }
      saveSession(data.data.token, data.data.user);
      window.location.href = homeFor(data.data.user);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void logIn();
  };

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back. Log in to your club."
      footer={
        <>
          <p>New here? <Link href="/signup" className="text-brand font-bold hover:underline">Create an account</Link></p>
          <p>Running a club? <Link href="/create-team" className="text-brand font-bold hover:underline">Start a free trial</Link></p>
        </>
      }
    >
      {clubs.length > 0 ? (
        <div className="space-y-4">
          <AuthError>{error}</AuthError>
          <p className="text-foreground text-center">You&apos;re in more than one club. Which one do you want?</p>
          <ul className="space-y-2">
            {clubs.map((c) => (
              <li key={c.id}>
                <button type="button" disabled={loading} onClick={() => logIn(c.id)} className="btn btn-secondary w-full justify-between normal-case">
                  <span className="truncate">{c.name}</span>
                  <Icon name="chevronRight" className="w-4 h-4 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setClubs([])} className="btn btn-ghost btn-sm w-full">
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthError>{error}</AuthError>
          <AuthField id="email" label="Email" type="email" autoComplete="email" required placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <div>
            <AuthField id="password" label="Password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="mt-2 text-right">
              <Link href="/forgot-password" className="inline-block py-1 text-sm text-muted hover:text-brand">
                Forgotten your password?
              </Link>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
