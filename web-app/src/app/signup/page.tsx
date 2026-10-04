'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/session';
import { AuthError, AuthField, AuthShell } from '@/components/ui/AuthShell';
import { Icon } from '@/components/ui/Icon';

const LEGAL_BASE = 'https://boosthuddle-legal.pages.dev';

/** Create a personal account (for players, parents and coaches joining a club). */
export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Your password needs at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch('/api/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      if (!response.ok) {
        setError(await errorMessage(response, "We couldn't create your account. Please try again."));
        return;
      }
      setSuccess(true);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell
        title="Check your email"
        subtitle="One more step and you're in."
        footer={<p>Wrong email? <button type="button" onClick={() => setSuccess(false)} className="text-brand font-bold hover:underline">Start again</button></p>}
      >
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto hexagon bg-brand/15 text-brand flex items-center justify-center">
            <Icon name="mail" className="w-7 h-7" />
          </div>
          <p className="text-foreground">
            We&apos;ve sent a link to <strong className="text-brand break-all">{email}</strong>.
          </p>
          <p className="text-sm text-muted">
            Open it to confirm your email, then enter the code your club gave you. The link works for 24 hours. Can&apos;t see it? Check your junk folder.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="For players, parents and coaches joining a club."
      footer={
        <>
          <p>Already have an account? <Link href="/login" className="text-brand font-bold hover:underline">Log in</Link></p>
          <p>Running a club? <Link href="/create-team" className="text-brand font-bold hover:underline">Start a free trial</Link></p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthError>{error}</AuthError>
        <AuthField id="name" label="Your name" type="text" autoComplete="name" required maxLength={80}
          value={name} onChange={(e) => setName(e.target.value)} />
        <AuthField id="email" label="Email" type="email" autoComplete="email" required placeholder="you@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <AuthField id="password" label="Password (8+ characters)" type="password" autoComplete="new-password" required minLength={8}
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Creating your account…' : 'Create account'}
        </button>
        <p className="text-xs text-muted text-center">
          By signing up you agree to our{' '}
          <a href={`${LEGAL_BASE}/terms`} target="_blank" rel="noreferrer" className="underline hover:text-brand">Terms</a> and{' '}
          <a href={`${LEGAL_BASE}/privacy`} target="_blank" rel="noreferrer" className="underline hover:text-brand">Privacy Policy</a>.
        </p>
      </form>
    </AuthShell>
  );
}
