'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Get token from cookie
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('admin_token='))
        ?.split('=')[1];

      if (!token) {
        throw new Error('Not authenticated. Please log in again.');
      }

      await apiFetch('/api/v1/auth/set-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${decodeURIComponent(token)}`,
        },
        json: {
          password,
          confirmPassword,
        },
      });

      // Success! Redirect to admin dashboard
      router.push('/admin');
    } catch (err: any) {
      const message = err?.message || 'Failed to set password';
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
          <h1 style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>Set Your Password</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Create a secure password to access your admin console. You can use this instead of magic links.
          </p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <span style={{ fontWeight: 600 }}>Password *</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
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
            <span style={{ fontWeight: 600 }}>Confirm Password *</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
              required
              minLength={8}
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

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Setting Password...' : 'Set Password'}
          </button>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            After setting your password, you can log in using either your password or a magic link.
          </p>
        </form>
      </div>
    </div>
  );
}
