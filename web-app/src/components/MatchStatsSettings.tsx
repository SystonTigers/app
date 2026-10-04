'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/session';
import { findClub } from '@/lib/club';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/admin/AdminUi';

/**
 * Whether the club records assists. Off = top goalscorers only: Match Centre
 * stops asking who made the goal, and stats, player pages and posts leave
 * assists out. Assists already recorded are kept for if it's switched back on.
 * Only club admins can change it (the server checks).
 */
export function MatchStatsSettings() {
    const params = useParams<{ tenant: string }>();
    const tenant = params?.tenant ?? '';
    const [on, setOn] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

    useEffect(() => {
        if (!tenant) return;
        findClub(tenant).then((club) => setOn(club?.trackAssists !== false)).catch(() => setOn(true));
    }, [tenant]);

    const save = async (next: boolean) => {
        setBusy(true);
        setMessage(null);
        try {
            const res = await apiFetch('/api/v1/tenants/me', { method: 'PATCH', body: JSON.stringify({ trackAssists: next }) });
            if (!res.ok) {
                setMessage({ text: await errorMessage(res, "That didn't save. Please try again."), error: true });
                return;
            }
            setOn(next);
            setMessage({ text: next ? 'Assists are back on. Ones recorded before show again.' : 'Assists are off. Stats now show goals only.', error: false });
        } catch {
            setMessage({ text: "We couldn't reach the server. Check your connection and try again.", error: true });
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="card" aria-labelledby="match-stats-title">
            <h2 id="match-stats-title" className="text-2xl flex items-center gap-2"><Icon name="ball" className="w-5 h-5 text-brand" /> Match stats</h2>
            <p className="text-sm text-muted mt-1">
                Some clubs only keep top goalscorers. Switch assists off and Match Centre stops asking who made each goal; stats, player pages and posts leave assists out.
            </p>
            <label htmlFor="track-assists" className="mt-5 flex items-start gap-3 cursor-pointer">
                <input
                    id="track-assists"
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-[rgb(var(--brand-rgb))]"
                    checked={on ?? true}
                    disabled={on === null || busy}
                    onChange={(e) => save(e.target.checked)}
                />
                <span className="text-sm text-foreground">
                    Record assists
                    <span className="block text-muted">Assists recorded before are kept if you switch this off and on again. Only club admins can change it.</span>
                </span>
            </label>
            {message && <div className="mt-4"><Notice tone={message.error ? 'error' : 'success'}>{message.text}</Notice></div>}
        </section>
    );
}
