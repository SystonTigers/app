'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE, saveSession } from '@/lib/session';
import { AuthShell } from '@/components/ui/AuthShell';
import { Icon } from '@/components/ui/Icon';

type Status = 'verifying' | 'success' | 'error';

/** Confirms a club owner's email (link from the club sign-up email), then opens club set-up. */
function VerifyEmailContent() {
  const token = useSearchParams().get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('This link is missing its verification code. Open the link from your email again.');
      return;
    }
    if (started.current === attempt) return;
    started.current = attempt;
    setStatus('verifying');

    fetch(`${API_BASE}/api/v1/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          setStatus('error');
          setError(data.error?.message || 'This link has expired or was already used. Log in to carry on.');
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
  }, [token, attempt]);

  if (status === 'verifying') {
    return (
      <AuthShell title="Checking your link">
        <div className="flex flex-col items-center gap-4" role="status">
          <span className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <p className="text-muted">Confirming your email…</p>
        </div>
      </AuthShell>
    );
  }

  if (status === 'success') {
    return (
      <AuthShell title="Email confirmed">
        <div className="text-center space-y-4" role="status">
          <div className="w-14 h-14 mx-auto hexagon bg-brand/15 text-brand flex items-center justify-center">
            <Icon name="check" className="w-7 h-7" />
          </div>
          <p className="text-foreground">Taking you to your club…</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="We couldn’t confirm your email">
      <div className="space-y-4">
        <p role="alert" className="text-center text-foreground">{error}</p>
        {token && (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-secondary w-full">
            <Icon name="refresh" className="w-4 h-4" /> Try again
          </button>
        )}
        <Link href="/login" className="btn btn-primary w-full">Log in</Link>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthShell title="Checking your link"><p className="text-center text-muted" role="status">Loading…</p></AuthShell>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
