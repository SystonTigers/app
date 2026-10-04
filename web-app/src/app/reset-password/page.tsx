'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '@/lib/session';
import { AuthError, AuthField, AuthShell } from '@/components/ui/AuthShell';
import { Icon } from '@/components/ui/Icon';

const backToLogin = <p><Link href="/login" className="text-brand font-bold hover:underline">Back to log in</Link></p>;

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPassword.length < 8) {
      setError('Your new password needs at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two passwords don’t match. Type them again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const expired = data.error?.code === 'INVALID_TOKEN';
        setLinkExpired(expired);
        setError(expired
          ? 'This link has expired or was already used. Ask for a new one below.'
          : data.error?.message || "We couldn't change your password. Please try again.");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Link not working" footer={backToLogin}>
        <div className="text-center space-y-5">
          <p className="text-muted">This reset link is incomplete. Open the link from your email again, or ask for a new one.</p>
          <Link href="/forgot-password" className="btn btn-primary w-full">Send me a new link</Link>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell title="Password changed" footer={backToLogin}>
        <div className="text-center space-y-4" role="status">
          <div className="w-14 h-14 mx-auto hexagon bg-brand/15 text-brand flex items-center justify-center">
            <Icon name="check" className="w-7 h-7" />
          </div>
          <p className="text-foreground">You can now log in with your new password.</p>
          <p className="text-sm text-muted">Taking you to log in…</p>
          <Link href="/login" className="btn btn-primary w-full">Log in now</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a password you don’t use anywhere else." footer={backToLogin}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthError>{error}</AuthError>
        <AuthField id="new-password" label="New password (8+ characters)" type="password" autoComplete="new-password" required minLength={8}
          value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <AuthField id="confirm-password" label="Type it again" type="password" autoComplete="new-password" required minLength={8}
          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <button type="submit" disabled={loading || !newPassword || !confirmPassword} className="btn btn-primary w-full">
          {loading ? 'Saving…' : 'Save new password'}
        </button>
        {linkExpired && (
          <Link href="/forgot-password" className="btn btn-secondary w-full">Send me a new link</Link>
        )}
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthShell title="Set a new password"><p className="text-center text-muted" role="status">Loading…</p></AuthShell>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
