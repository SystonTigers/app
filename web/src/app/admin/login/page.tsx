'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithPassword, requestMagicLink } from '@/lib/api';

function persistAdminToken(token: string, expiresAt?: string) {
  if (typeof document === 'undefined') return;
  const cookieParts = [
    `admin_token=${encodeURIComponent(token)}`,
    'path=/',
    'SameSite=Lax',
  ];

  if (expiresAt) {
    const parsed = new Date(expiresAt);
    if (!Number.isNaN(parsed.getTime())) {
      cookieParts.push(`expires=${parsed.toUTCString()}`);
    }
  }

  if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
    cookieParts.push('Secure');
  }

  document.cookie = cookieParts.join('; ');
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [email, setEmail] = useState('');
  const [tenant, setTenant] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const isPasswordMode = mode === 'password';

  const actionLabel = useMemo(
    () => (isPasswordMode ? (loading ? 'Signing In…' : 'Sign In') : loading ? 'Sending…' : 'Send Magic Link'),
    [isPasswordMode, loading],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setStatus(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }

    if (isPasswordMode && !password) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'magic') {
        const redirectUrl =
          typeof window !== 'undefined' ? `${window.location.origin}/admin/login` : undefined;
        const response = await requestMagicLink({
          email: trimmedEmail,
          tenant,
          redirectUrl,
        });
        setStatus(response?.message || 'Check your email for a secure sign-in link.');
      } else {
        const result = await loginWithPassword({
          email: trimmedEmail,
          password,
          tenant,
        });

        if (!result?.token) {
          throw new Error('Login response missing token');
        }

        persistAdminToken(result.token, typeof result.expiresAt === 'string' ? result.expiresAt : undefined);
        setStatus('Signed in successfully');
        router.push(result.redirectUrl || '/admin');
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to sign in';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-2xl)',
        background: 'var(--bg)',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: 'var(--spacing-2xl)' }}>
        <header style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>Admin Console Access</h1>
          <p style={{ color: 'var(--text-muted)' }}>Sign in to manage your club&apos;s automation suite.</p>
        </header>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
          {(['magic', 'password'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={option === mode ? 'btn btn-primary' : 'btn btn-outline'}
              aria-pressed={option === mode}
              style={{ flex: 1 }}
              disabled={loading}
            >
              {option === 'magic' ? 'Email Link' : 'Password'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span style={{ fontWeight: 600 }}>Work Email *</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@club.co.uk"
              required
              style={{
                width: '100%',
                padding: 'var(--spacing-sm)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
              disabled={loading}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span style={{ fontWeight: 600 }}>Club Slug</span>
            <input
              type="text"
              value={tenant}
              onChange={(event) => setTenant(event.target.value)}
              placeholder="syston-tigers"
              style={{
                width: '100%',
                padding: 'var(--spacing-sm)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
              disabled={loading}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Used to locate your tenant if you manage multiple clubs.
            </span>
          </label>

          {isPasswordMode && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <span style={{ fontWeight: 600 }}>Password *</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
                disabled={loading}
              />
            </label>
          )}

          {error && (
            <div
              role="alert"
              style={{
                color: 'var(--error)',
                background: 'rgba(255,0,0,0.05)',
                padding: 'var(--spacing-sm)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {error}
            </div>
          )}

          {status && !error && (
            <div
              role="status"
              style={{
                color: 'var(--success)',
                background: 'rgba(0,128,0,0.08)',
                padding: 'var(--spacing-sm)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {status}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {actionLabel}
          </button>
        </form>

        <div style={{ marginTop: 'var(--spacing-lg)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {mode === 'magic' ? (
            <span>
              Prefer a password?
              {' '}
              <button type="button" className="link" onClick={() => setMode('password')} disabled={loading}>
                Use password instead
              </button>
            </span>
          ) : (
            <span>
              Prefer one-tap email access?
              {' '}
              <button type="button" className="link" onClick={() => setMode('magic')} disabled={loading}>
                Send a magic link
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
