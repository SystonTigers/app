'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE, clearSession, errorMessage, getSessionToken, saveSession } from '@/lib/session';
import { slugify } from '@/lib/slug';

const TRIAL_DAYS = 14;
const LEGAL_BASE = 'https://boosthuddle-legal.pages.dev';
/** Sign-up gives each club a placeholder URL like "club-1a2b3c4d" until the owner picks one. */
const PLACEHOLDER_SLUG = /^club-[0-9a-f]{8}$/;

type Step = 'loading' | 'account' | 'club';

const inputClass =
  'w-full px-4 py-3 bg-black/50 border border-gray-700 text-white placeholder-gray-600 focus:border-brand focus:ring-1 focus:ring-brand focus:bg-black/80 transition-all chamfer-sm outline-none';
const labelClass = 'block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1';

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
    return <Shell><p className="text-center text-gray-400">Loading…</p></Shell>;
  }

  return (
    <Shell>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black italic uppercase text-white mb-2">
          {step === 'account' ? 'Start your club' : 'Set up your club'}
        </h1>
        <p className="text-gray-400">
          {step === 'account'
            ? `Free for ${TRIAL_DAYS} days. No card needed.`
            : 'Choose your club web address and colours. You can change these later.'}
        </p>
        <p className="mt-3 text-xs font-bold uppercase tracking-widest text-gray-500">
          Step {step === 'account' ? 1 : 2} of 2
        </p>
      </div>

      <div className="bg-gray-900/60 chamfer-lg border border-gray-800 p-8 backdrop-blur-xl shadow-2xl">
        {error && (
          <div role="alert" className="mb-6 p-4 bg-red-900/20 border border-red-500/50 text-red-300 text-sm font-bold text-center chamfer-sm">
            {error}
          </div>
        )}

        {step === 'account' ? (
          <form onSubmit={createAccount} className="space-y-5">
            <Field label="Club name" id="clubName">
              <input id="clubName" required minLength={2} maxLength={80} className={inputClass} placeholder="e.g. Riverside Rovers FC"
                value={account.clubName} onChange={(e) => setAccount({ ...account, clubName: e.target.value })} />
            </Field>
            <Field label="Your name" id="name">
              <input id="name" required autoComplete="name" className={inputClass}
                value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} />
            </Field>
            <Field label="Email" id="email">
              <input id="email" type="email" required autoComplete="email" className={inputClass}
                value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
            </Field>
            <Field label="Password (8+ characters)" id="password">
              <input id="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass}
                value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
            </Field>

            <SubmitButton busy={busy} label="Create my club" busyLabel="Creating your club…" />

            <p className="text-xs text-gray-500 text-center">
              By signing up you agree to our{' '}
              <a href={`${LEGAL_BASE}/terms`} target="_blank" rel="noreferrer" className="underline hover:text-brand">Terms</a> and{' '}
              <a href={`${LEGAL_BASE}/privacy`} target="_blank" rel="noreferrer" className="underline hover:text-brand">Privacy Policy</a>.
            </p>
            <p className="text-sm text-gray-400 text-center border-t border-gray-800 pt-5">
              Already have an account?{' '}
              <Link href="/login" className="text-brand font-bold hover:text-white">Log in</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={finishSetup} className="space-y-5">
            <Field label="Club name" id="setupName">
              <input id="setupName" required minLength={2} maxLength={80} className={inputClass}
                value={club.name}
                onChange={(e) => setClub({ ...club, name: e.target.value, slug: slugEdited ? club.slug : slugify(e.target.value) })} />
            </Field>
            <Field label="Club web address" id="slug">
              <div className="flex items-stretch">
                <span className="px-3 flex items-center bg-black/70 border border-r-0 border-gray-700 text-gray-500 text-sm chamfer-sm">
                  …/
                </span>
                <input id="slug" required minLength={3} maxLength={40} pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Lowercase letters, numbers and single dashes" className={`${inputClass} font-mono`}
                  value={club.slug}
                  onChange={(e) => { setSlugEdited(true); setClub({ ...club, slug: slugify(e.target.value) }); }} />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <ColourField label="Main colour" value={club.primaryColor} onChange={(v) => setClub({ ...club, primaryColor: v })} />
              <ColourField label="Second colour" value={club.secondaryColor} onChange={(v) => setClub({ ...club, secondaryColor: v })} />
            </div>

            <div className="chamfer-sm p-6 text-center" style={{ backgroundColor: club.primaryColor, color: club.secondaryColor }}>
              <p className="font-black text-xl uppercase italic">{club.name || 'Your club'}</p>
              <p className="text-xs opacity-80 mt-1">Official club app</p>
            </div>

            <SubmitButton busy={busy} label="Finish and open my dashboard" busyLabel="Saving…" />
          </form>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0D0F] py-12">
      <div className="max-w-md w-full px-4">{children}</div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function ColourField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <input type="color" aria-label={label} value={value} onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-12 w-full cursor-pointer bg-black/50 border border-gray-700 chamfer-sm" />
    </div>
  );
}

function SubmitButton({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <button type="submit" disabled={busy}
      className="w-full py-4 px-6 bg-brand text-black font-black uppercase italic tracking-wider chamfer-sm hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed">
      {busy ? busyLabel : label}
    </button>
  );
}

export default function CreateTeamPage() {
  return (
    <Suspense fallback={<Shell><p className="text-center text-gray-400">Loading…</p></Shell>}>
      <CreateTeamContent />
    </Suspense>
  );
}
