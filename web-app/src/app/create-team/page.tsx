'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE, clearSession, errorMessage, getSessionToken, saveSession } from '@/lib/session';
import { slugify } from '@/lib/slug';
import { AuthError, AuthField, AuthShell } from '@/components/ui/AuthShell';

const TRIAL_DAYS = 14;
const LEGAL_BASE = 'https://boosthuddle-legal.pages.dev';
/** Sign-up gives each club a placeholder URL like "club-1a2b3c4d" until the owner picks one. */
const PLACEHOLDER_SLUG = /^club-[0-9a-f]{8}$/;

type Step = 'loading' | 'account' | 'club';

function CreateTeamContent() {
  const [step, setStep] = useState<Step>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const [account, setAccount] = useState({ name: '', email: '', password: '', clubName: '' });
  const [club, setClub] = useState({ name: '', slug: '', primaryColor: '#FFD700', secondaryColor: '#000000' });
  const [slugEdited, setSlugEdited] = useState(false);

  // Resume an unfinished sign-up, or send a finished club to its dashboard.
  useEffect(() => {
    const stored = getSessionToken();
    if (!stored) {
      setStep('account');
      return;
    }
    fetch(`${API_BASE}/api/v1/tenants/me`, { headers: { Authorization: `Bearer ${stored}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error('signed out');
        const { tenant } = await res.json();
        if (tenant?.slug && !PLACEHOLDER_SLUG.test(tenant.slug)) {
          window.location.href = `/${tenant.slug}/admin`;
          return;
        }
        setToken(stored);
        setClub((c) => ({
          ...c,
          name: tenant?.name && tenant.name !== 'New Club' ? tenant.name : '',
          slug: tenant?.name && tenant.name !== 'New Club' ? slugify(tenant.name) : '',
          primaryColor: tenant?.primary_color || c.primaryColor,
          secondaryColor: tenant?.secondary_color || c.secondaryColor,
        }));
        setStep('club');
      })
      .catch(() => {
        clearSession();
        setStep('account');
      });
  }, []);

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (account.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: account.name,
          email: account.email,
          password: account.password,
          clubName: account.clubName,
        }),
      });
      if (!res.ok) {
        setError(await errorMessage(res, 'Sign-up failed. Please try again.'));
        return;
      }
      const { data } = await res.json();
      saveSession(data.token, data.user);
      setToken(data.token);
      setClub((c) => ({ ...c, name: account.clubName, slug: slugify(account.clubName) }));
      setStep('club');
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const finishSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/tenants/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: club.name,
          slug: club.slug,
          primaryColor: club.primaryColor,
          secondaryColor: club.secondaryColor,
        }),
      });
      if (res.status === 401) {
        clearSession();
        setStep('account');
        setError('Your session expired. Please log in to finish setting up your club.');
        return;
      }
      if (!res.ok) {
        setError(await errorMessage(res, "We couldn't save your club. Please try again."));
        return;
      }
      const { tenant } = await res.json();
      try {
        const stored = JSON.parse(localStorage.getItem('user_data') || '{}');
        localStorage.setItem('user_data', JSON.stringify({ ...stored, tenant_slug: tenant.slug }));
      } catch {
        // Storage blocked: the redirect below still works
      }
      window.location.href = `/${tenant.slug}/admin?welcome=1`;
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (step === 'loading') {
    return <LoadingShell />;
  }

  const legalLinks = (
    <p className="text-xs text-muted text-center">
      By signing up you agree to our{' '}
      <a href={`${LEGAL_BASE}/terms`} target="_blank" rel="noreferrer" className="underline hover:text-brand">Terms</a> and{' '}
      <a href={`${LEGAL_BASE}/privacy`} target="_blank" rel="noreferrer" className="underline hover:text-brand">Privacy Policy</a>.
    </p>
  );

  return (
    <AuthShell
      title={step === 'account' ? 'Start your club' : 'Set up your club'}
      subtitle={
        <>
          {step === 'account'
            ? `Free for ${TRIAL_DAYS} days. No card needed.`
            : 'Choose your club web address and colours. You can change these later.'}
          <span className="block mt-2 eyebrow text-xs">Step {step === 'account' ? 1 : 2} of 2</span>
        </>
      }
      footer={step === 'account' ? (
        <>
          <p>Already have an account? <Link href="/login" className="text-brand font-bold hover:underline">Log in</Link></p>
          <p>Joining a club? <Link href="/signup" className="text-brand font-bold hover:underline">Create an account</Link></p>
        </>
      ) : undefined}
    >
      <div className="space-y-5">
        <AuthError>{error}</AuthError>

        {step === 'account' ? (
          <form onSubmit={createAccount} className="space-y-5">
            <AuthField id="clubName" label="Club name" required minLength={2} maxLength={80} placeholder="e.g. Riverside Rovers FC"
              value={account.clubName} onChange={(e) => setAccount({ ...account, clubName: e.target.value })} />
            <AuthField id="name" label="Your name" required autoComplete="name"
              value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} />
            <AuthField id="email" label="Email" type="email" required autoComplete="email" placeholder="you@example.com"
              value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
            <AuthField id="password" label="Password (8+ characters)" type="password" required minLength={8} autoComplete="new-password"
              value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />

            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? 'Creating your club…' : 'Create my club'}
            </button>
            {legalLinks}
          </form>
        ) : (
          <form onSubmit={finishSetup} className="space-y-5">
            <AuthField id="setupName" label="Club name" required minLength={2} maxLength={80}
              value={club.name}
              onChange={(e) => setClub({ ...club, name: e.target.value, slug: slugEdited ? club.slug : slugify(e.target.value) })} />
            <div>
              <label htmlFor="slug" className="label">Club web address</label>
              <div className="flex items-stretch">
                <span className="px-3 flex items-center bg-surface-raised border border-r-0 border-border text-muted text-sm" aria-hidden="true">
                  …/
                </span>
                <input id="slug" required minLength={3} maxLength={40} pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  aria-describedby="slug-hint"
                  title="Lowercase letters, numbers and single dashes" className="field font-mono min-w-0"
                  value={club.slug}
                  onChange={(e) => { setSlugEdited(true); setClub({ ...club, slug: slugify(e.target.value) }); }} />
              </div>
              <p id="slug-hint" className="mt-1.5 text-xs text-muted">Lowercase letters, numbers and dashes. This is the link you share with families.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ColourField id="primaryColor" label="Main colour" value={club.primaryColor} onChange={(v) => setClub({ ...club, primaryColor: v })} />
              <ColourField id="secondaryColor" label="Second colour" value={club.secondaryColor} onChange={(v) => setClub({ ...club, secondaryColor: v })} />
            </div>

            <div className="chamfer-sm p-6 text-center" style={{ backgroundColor: club.primaryColor, color: club.secondaryColor }}>
              <p className="font-display font-extrabold text-2xl uppercase italic break-words">{club.name || 'Your club'}</p>
              <p className="text-xs opacity-80 mt-1">Official club app</p>
            </div>

            <button type="submit" disabled={busy} className="btn btn-primary w-full">
              {busy ? 'Saving…' : 'Finish and open my dashboard'}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}

function LoadingShell() {
  return (
    <AuthShell title="Start your club">
      <p className="text-center text-muted" role="status">Loading…</p>
    </AuthShell>
  );
}

function ColourField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-12 w-full cursor-pointer bg-background border border-border chamfer-sm" />
    </div>
  );
}

export default function CreateTeamPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <CreateTeamContent />
    </Suspense>
  );
}
