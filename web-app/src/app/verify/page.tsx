'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, saveSession } from '@/lib/session';
import { AuthShell } from '@/components/ui/AuthShell';
import { Icon } from '@/components/ui/Icon';

type Status = 'verifying' | 'success' | 'error';

/** Confirms a personal account's email (link from the sign-up email), then sends them to enter their club code. */
function VerifyPageContent() {
  const token = useSearchParams().get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('This link is missing its code. Open the link from your email again.');
      return;
    }
    // React's dev double-run would spend the link twice
    if (started.current === attempt) return;
    started.current = attempt;
    setStatus('verifying');

    apiFetch('/api/v1/auth/verify-signup', { method: 'POST', body: JSON.stringify({ token }) })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          setStatus('error');
          setErrorMsg(res.status === 401
            ? 'This link has expired or was already used. Sign up again to get a new one, or log in if you already confirmed.'
            : data.error?.message || "We couldn't confirm your email. Please try again.");
          return;
        }
        saveSession(data.data.token, data.data.user);
        setStatus('success');
        setTimeout(() => { window.location.href = data.data.redirect || '/join'; }, 2000);
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg("We couldn't reach the server. Check your connection and try again.");
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
          <p className="text-foreground">Thanks. Next, enter the code your club gave you.</p>
          <Link href="/join" className="btn btn-primary w-full">Enter club code</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="We couldn’t confirm your email"
      footer={<p>Already confirmed? <Link href="/login" className="text-brand font-bold hover:underline">Log in</Link></p>}
    >
      <div className="space-y-4">
        <p role="alert" className="text-center text-foreground">{errorMsg}</p>
        {token && (
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="btn btn-primary w-full">
            <Icon name="refresh" className="w-4 h-4" /> Try again
          </button>
        )}
        <Link href="/signup" className="btn btn-secondary w-full">Back to sign up</Link>
      </div>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<AuthShell title="Checking your link"><p className="text-center text-muted" role="status">Loading…</p></AuthShell>}>
      <VerifyPageContent />
    </Suspense>
  );
}
