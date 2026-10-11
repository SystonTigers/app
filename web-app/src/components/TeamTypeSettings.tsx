'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/session';
import { findClub } from '@/lib/club';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/admin/AdminUi';

type TeamType = 'junior' | 'adult';

const OPTIONS: Array<{ value: TeamType; label: string; hint: string }> = [
    { value: 'junior', label: 'Juniors (under 18)', hint: "Parents answer for their children. Photos and clips need a parent's yes; kick-off times and grounds are only shown to members; posts use initials." },
    { value: 'adult', label: 'Adults', hint: 'Players answer for themselves. Photos and clips are used unless a player says no; fixtures are public; posts use full names.' },
];

/**
 * Junior or adult team (tenants.team_type). Switching also sets the matching
 * name and photo defaults for posts, which can still be changed below.
 * Only club admins can change it (the server checks).
 */
export function TeamTypeSettings() {
    const params = useParams<{ tenant: string }>();
    const tenant = params?.tenant ?? '';
    const [current, setCurrent] = useState<TeamType | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

    useEffect(() => {
        if (!tenant) return;
        findClub(tenant).then((club) => setCurrent(club?.teamType === 'adult' ? 'adult' : 'junior')).catch(() => setCurrent('junior'));
    }, [tenant]);

    const save = async (next: TeamType) => {
        if (next === current) return;
        setBusy(true);
        setMessage(null);
        try {
            const res = await apiFetch('/api/v1/tenants/me', { method: 'PATCH', body: JSON.stringify({ teamType: next }) });
            if (!res.ok) {
                setMessage({ text: await errorMessage(res, "That didn't save. Please try again."), error: true });
                return;
            }
            setCurrent(next);
            setMessage({ text: next === 'adult' ? 'Saved: adult team. Players now answer for themselves. Reload to see the name settings below change.' : 'Saved: junior team. Parents answer for their children again.', error: false });
        } catch {
            setMessage({ text: "We couldn't reach the server. Check your connection and try again.", error: true });
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="card" aria-labelledby="team-type-title">
            <h2 id="team-type-title" className="text-2xl flex items-center gap-2"><Icon name="users" className="w-5 h-5 text-brand" /> Team type</h2>
            <p className="text-sm text-muted mt-1">Junior or adult team. Only club admins can change it.</p>
            <fieldset className="mt-5 space-y-3" disabled={current === null || busy}>
                <legend className="sr-only">Team type</legend>
                {OPTIONS.map((o) => (
                    <label key={o.value} htmlFor={`team-type-${o.value}`} className={`flex items-start gap-3 p-3 border cursor-pointer ${current === o.value ? 'border-brand' : 'border-border'}`}>
                        <input
                            id={`team-type-${o.value}`}
                            type="radio"
                            name="team-type"
                            className="mt-1 h-5 w-5 accent-[rgb(var(--brand-rgb))]"
                            checked={current === o.value}
                            onChange={() => save(o.value)}
                        />
                        <span className="text-sm text-foreground">
                            {o.label}
                            <span className="block text-muted">{o.hint}</span>
                        </span>
                    </label>
                ))}
            </fieldset>
            {message && <div className="mt-4"><Notice tone={message.error ? 'error' : 'success'}>{message.text}</Notice></div>}
        </section>
    );
}
