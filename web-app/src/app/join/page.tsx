'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, errorMessage, getSessionToken, saveSession, type SessionUser } from '@/lib/session';
import { AuthError, AuthField, AuthShell } from '@/components/ui/AuthShell';

interface MyClub {
  id: string;
  name: string;
  slug: string;
}

type StoredUser = Partial<SessionUser> & { profile?: { name?: string } };

function storedUser(): StoredUser {
  try {
    return JSON.parse(localStorage.getItem('user_data') || '{}') as StoredUser;
  } catch {
    return {};
  }
}

/**
 * Join a club with the code the manager gave you. The code links this
 * account to a player at that club; we then switch the session to that club
 * and show the welcome page.
 */
export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!getSessionToken()) {
      router.replace('/signup');
      return;
    }
    const user = storedUser();
    setFirstName((user.name || user.profile?.name || '').trim().split(/\s+/)[0] || '');
    setReady(true);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setExpired(false);
    if (!getSessionToken()) {
      router.replace('/signup');
      return;
    }
    setLoading(true);
    try {
      const linked = await apiFetch('/api/v1/auth/link-player', {
        method: 'POST',
        body: JSON.stringify({ code: code.replace(/\s/g, '').toUpperCase() }),
      });
      if (linked.status === 401) {
        setExpired(true);
        setError('Your session has run out. Log in again, then enter your code.');
        return;
      }
      if (!linked.ok) {
        setError(linked.status === 404
          ? "We don't recognise that code. Check it with your manager and try again."
          : await errorMessage(linked, "We couldn't join that club. Please try again."));
        return;
      }
      const { tenant } = (await linked.json()) as { tenant?: { id: string; name?: string } };
      if (!tenant?.id) {
        router.push('/welcome');
        return;
      }

      // Move the session over to the club we just joined.
      const switched = await apiFetch('/api/v1/auth/switch-tenant', {
        method: 'POST',
        body: JSON.stringify({ targetTenantId: tenant.id }),
      });
      if (switched.ok) {
        const data = (await switched.json()) as { token: string; user: SessionUser };
        const clubsRes = await apiFetch('/api/v1/auth/me/tenants', { headers: { Authorization: `Bearer ${data.token}` } });
        const clubs = clubsRes.ok ? ((await clubsRes.json()) as { tenants?: MyClub[] }).tenants ?? [] : [];
        const slug = clubs.find((c) => c.id === tenant.id)?.slug ?? null;
        saveSession(data.token, { ...data.user, name: storedUser().name || storedUser().profile?.name, tenant_slug: slug });
      }
      router.push('/welcome');
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <AuthShell title="Join your club">
        <p className="text-center text-muted" role="status">Loading…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={firstName ? `Hi ${firstName}` : 'Join your club'}
      subtitle="Enter the code your club gave you to get started."
      footer={<p>Running a club? <Link href="/create-team" className="text-brand font-bold hover:underline">Start a free trial</Link></p>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthError>{error}</AuthError>
        <AuthField
          id="code"
          label="Club code"
          type="text"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="e.g. ROVERS-1234"
          hint="Ask your team manager or coach for your code."
          className="field chamfer-sm text-center text-xl font-mono tracking-widest uppercase"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button type="submit" disabled={loading || !code.trim()} className="btn btn-primary w-full">
          {loading ? 'Joining…' : 'Join club'}
        </button>
        {expired && (
          <Link href="/login" className="btn btn-secondary w-full">Log in again</Link>
        )}
      </form>
    </AuthShell>
  );
}
