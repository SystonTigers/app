'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/session';
import { AuthError, AuthField, AuthShell } from '@/components/ui/AuthShell';
import { Icon } from '@/components/ui/Icon';

/** Ask for a password reset link by email. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error?.message || "We couldn't send the email just now. Please try again in a minute.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const footer = <p><Link href="/login" className="text-brand font-bold hover:underline">Back to log in</Link></p>;

  if (success) {
    return (
      <AuthShell title="Check your email" footer={footer}>
        <div className="text-center space-y-4" role="status">
          <div className="w-14 h-14 mx-auto hexagon bg-brand/15 text-brand flex items-center justify-center">
            <Icon name="mail" className="w-7 h-7" />
          </div>
          <p className="text-foreground">
            If there&apos;s an account for <strong className="text-brand break-all">{email}</strong>, we&apos;ve sent it a link to set a new password.
          </p>
          <p className="text-sm text-muted">The link works for 1 hour. Can&apos;t see it? Check your junk folder.</p>
          <button type="button" onClick={() => setSuccess(false)} className="btn btn-ghost btn-sm">
            Try a different email
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgotten password" subtitle="Enter your email and we’ll send you a link to set a new one." footer={footer}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthError>{error}</AuthError>
        <AuthField id="email" label="Email" type="email" autoComplete="email" required placeholder="you@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" disabled={loading || !email} className="btn btn-primary w-full">
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  );
}
