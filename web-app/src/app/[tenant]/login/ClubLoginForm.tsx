'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API_BASE, homeFor, saveSession, type SessionUser } from '@/lib/session';
import { useAuth } from '@/context/AuthContext';
import { AuthError, AuthField } from '@/components/ui/AuthShell';
import { Icon, type IconName } from '@/components/ui/Icon';
import { appSignUpLink } from '@/lib/app-link';

type LoginMethod = 'password' | 'code' | 'fan';
type Role = 'parent' | 'player' | 'coach';

interface ClubChoice {
  id: string;
  name: string;
  slug?: string;
}

const METHODS: { id: LoginMethod; label: string }[] = [
  { id: 'password', label: 'Email' },
  { id: 'code', label: 'Code' },
  { id: 'fan', label: 'Supporter' },
];

const ROLES: { id: Role; label: string; icon: IconName }[] = [
  { id: 'parent', label: 'Parent', icon: 'users' },
  { id: 'player', label: 'Player', icon: 'shirt' },
  { id: 'coach', label: 'Coach', icon: 'whistle' },
];

const OFFLINE = "We couldn't reach the server. Check your connection and try again.";

/** Coach codes end in -C and 3-4 digits, e.g. ROVERS-C1234. */
const isCoachCode = (code: string) => /-C\d{3,4}$/.test(code);

async function readJson(res: Response): Promise<Record<string, unknown> & { error?: { message?: string } }> {
  return res.json().catch(() => ({}));
}

/** Log in to one club: email and password, a player/coach code, or a supporter code. */
export function ClubLoginForm({ tenant }: { tenant: string }) {
  const router = useRouter();
  const { login } = useAuth();

  const [method, setMethod] = useState<LoginMethod>('password');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<Role>('parent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fanCode, setFanCode] = useState('');
  const [clubs, setClubs] = useState<ClubChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const coachCode = isCoachCode(code);

  const switchMethod = (m: LoginMethod) => {
    setMethod(m);
    setError('');
  };

  const handleCodeChange = (value: string) => {
    const upper = value.toUpperCase();
    setCode(upper);
    if (role === 'coach' && !isCoachCode(upper)) setRole('parent');
  };

  /** Finish an email login: save the session and go to the right home page. */
  const finishPasswordLogin = (token: string, user: SessionUser, slug?: string) => {
    const withSlug = { ...user, tenant_slug: user.tenant_slug || slug || tenant };
    saveSession(token, withSlug);
    login(token, withSlug);
    window.location.href = homeFor(withSlug);
  };

  const handleSelectClub = async (club: ClubChoice) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenant_id: club.id }),
        credentials: 'include',
      });
      const data = await readJson(res);
      if (!res.ok) {
        setError(data.error?.message || "We couldn't log you in to that club. Please try again.");
        setLoading(false);
        return;
      }
      const { token, user } = data.data as { token: string; user: SessionUser };
      finishPasswordLogin(token, user, club.slug);
    } catch {
      setError(OFFLINE);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    let leaving = false;

    try {
      if (method === 'code') {
        const res = await fetch(`${API_BASE}/api/v1/auth/code-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, role, tenant }),
          credentials: 'include',
        });
        const data = await readJson(res);
        if (!res.ok) {
          setError(res.status === 401 || !data.error?.message
            ? "That code didn't work. Check it with your manager and try again."
            : data.error.message);
          return;
        }
        login(data.token as string, { role });
        if (typeof data.playerId === 'string') localStorage.setItem('player_id', data.playerId);
        localStorage.setItem('user_role', role);
        leaving = true;
        router.push(`/${tenant}`);
      } else if (method === 'password') {
        // No club id: the server finds every club this email belongs to.
        const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        });
        const data = await readJson(res);
        if (data.multipleTenants) {
          setClubs((data.tenants as ClubChoice[]) || []);
          return;
        }
        if (!res.ok) {
          setError(res.status === 401 || !data.error?.message
            ? 'That email and password don’t match. Check them and try again, or reset your password.'
            : data.error.message);
          return;
        }
        const { token, user } = data.data as { token: string; user: SessionUser };
        leaving = true;
        finishPasswordLogin(token, user);
      } else {
        const res = await fetch(`${API_BASE}/api/v1/auth/fan-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, fanCode, tenant }),
          credentials: 'include',
        });
        const data = await readJson(res);
        if (!res.ok) {
          setError(res.status === 401 || !data.error?.message
            ? "That supporter code didn't work. Check it with the club and try again."
            : data.error.message);
          return;
        }
        login(data.token as string, { role: 'fan', email });
        localStorage.setItem('user_role', 'fan');
        leaving = true;
        router.push(`/${tenant}`);
      }
    } catch {
      setError(OFFLINE);
    } finally {
      if (!leaving) setLoading(false);
    }
  };

  if (clubs.length > 0) {
    return (
      <div className="card p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-2xl uppercase text-foreground text-center">Choose your club</h2>
        <p className="text-muted text-center">Your email is used at more than one club. Which one do you want?</p>
        <AuthError>{error}</AuthError>
        <ul className="space-y-2">
          {clubs.map((c) => (
            <li key={c.id}>
              <button type="button" disabled={loading} onClick={() => handleSelectClub(c)} className="btn btn-secondary w-full justify-between normal-case">
                <span className="truncate">{c.name}</span>
                <Icon name="chevronRight" className="w-4 h-4 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setClubs([])} className="btn btn-ghost btn-sm w-full">Back</button>
      </div>
    );
  }

  const canSubmit =
    method === 'code' ? !!code : method === 'fan' ? !!email && !!fanCode : !!email && !!password;

  return (
    <>
      <div role="tablist" aria-label="How do you log in?" className="grid grid-cols-3 gap-1 p-1 bg-surface border border-border chamfer-sm mb-4">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={method === m.id}
            onClick={() => switchMethod(m.id)}
            className={`min-h-[40px] px-2 text-sm font-display font-bold uppercase tracking-wider transition-colors ${
              method === m.id ? 'bg-brand text-brand-foreground' : 'text-muted hover:text-foreground'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthError>{error}</AuthError>

          {method === 'password' && (
            <>
              <AuthField id="email" label="Email" type="email" autoComplete="email" required placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <div>
                <AuthField id="password" label="Password" type="password" autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)} />
                <div className="mt-2 text-right">
                  <Link href="/forgot-password" className="inline-block py-1 text-sm text-muted hover:text-brand">Forgotten your password?</Link>
                </div>
              </div>
            </>
          )}

          {method === 'code' && (
            <>
              <AuthField id="code" label="Your login code" required autoComplete="off" spellCheck={false} placeholder="e.g. ROVERS-8472"
                hint="The code your team manager gave you."
                className="field chamfer-sm text-center text-lg font-mono tracking-widest uppercase"
                value={code} onChange={(e) => handleCodeChange(e.target.value)} />
              <fieldset>
                <legend className="label">I am a</legend>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => {
                    const disabled = r.id === 'coach' && !coachCode;
                    const selected = role === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        aria-pressed={selected}
                        disabled={disabled}
                        onClick={() => setRole(r.id)}
                        className={`min-h-[48px] flex flex-col items-center justify-center gap-1 border text-sm font-bold chamfer-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          selected ? 'border-brand bg-brand/10 text-brand' : 'border-border text-muted hover:text-foreground hover:border-brand/40'
                        }`}
                      >
                        <Icon name={r.icon} className="w-5 h-5" />
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                {!coachCode && <p className="mt-2 text-xs text-muted">Coaches need a coach code from the manager.</p>}
              </fieldset>
            </>
          )}

          {method === 'fan' && (
            <>
              <AuthField id="fan-email" label="Email" type="email" autoComplete="email" required placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <AuthField id="fan-code" label="Supporter code" required autoComplete="off" spellCheck={false} placeholder="e.g. ROVERS-FAN"
                hint="Ask the club for their supporter code."
                className="field chamfer-sm text-center font-mono tracking-widest uppercase"
                value={fanCode} onChange={(e) => setFanCode(e.target.value.toUpperCase())} />
            </>
          )}

          <button type="submit" disabled={loading || !canSubmit} className="btn btn-primary w-full">
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>

      <div className="mt-6 text-center text-sm text-muted space-y-2">
        <p>New here? <a href={appSignUpLink(tenant)} className="text-brand font-bold hover:underline">Create an account in the club app</a></p>
        <p>Club staff log in with their email.</p>
      </div>
    </>
  );
}
