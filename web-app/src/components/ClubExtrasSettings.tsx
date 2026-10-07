'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch, errorMessage, isClubAdmin } from '@/lib/session';
import { CLUB_MODULES, type ClubModule } from '@/lib/club';
import { setClubModule, useClubModules } from '@/lib/clubModules';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/admin/AdminUi';

const EXTRAS: Record<ClubModule, { label: string; text: string }> = {
    subs: { label: 'Subs and fees', text: 'Ask families for subs and send reminders.' },
    signingOn: { label: 'Signing on', text: "Each season, families fill in their child's details, emergency contacts and consent." },
    shop: { label: 'Club shop', text: 'Club kit and personalised gifts.' },
};

/**
 * Club extras: Subs and fees, Signing on and the Shop. All off until a club
 * admin switches one on; when off, nobody at the club sees it (the server
 * refuses its pages too). Same wording as the app's Club Settings.
 */
export function ClubExtrasSettings() {
    const params = useParams<{ tenant: string }>();
    const tenant = params?.tenant ?? '';
    const modules = useClubModules(tenant);
    const [admin, setAdmin] = useState(false);
    const [busy, setBusy] = useState<ClubModule | null>(null);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

    useEffect(() => {
        setAdmin(isClubAdmin());
    }, []);

    const save = async (module: ClubModule, next: boolean) => {
        setBusy(module);
        setMessage(null);
        try {
            const res = await apiFetch('/api/v1/tenants/me', { method: 'PATCH', body: JSON.stringify({ modules: { [module]: next } }) });
            if (!res.ok) {
                setMessage({ text: await errorMessage(res, "That didn't save. Please try again."), error: true });
                return;
            }
            setClubModule(tenant, module, next);
            const { label } = EXTRAS[module];
            setMessage({
                text: next ? `${label} is on. You'll find it in the admin menu.` : `${label} is off. Nobody at the club sees it now.`,
                error: false,
            });
        } catch {
            setMessage({ text: "We couldn't reach the server. Check your connection and try again.", error: true });
        } finally {
            setBusy(null);
        }
    };

    return (
        <section id="club-extras" className="card scroll-mt-24" aria-labelledby="club-extras-title">
            <h2 id="club-extras-title" className="text-2xl flex items-center gap-2"><Icon name="sparkles" className="w-5 h-5 text-brand" /> Club extras</h2>
            <p className="text-sm text-muted mt-1">
                Switch on only what your club uses. If you already use something else for subs or signing on, leave those off and nobody sees them.
            </p>
            <div className="mt-5 space-y-4">
                {CLUB_MODULES.map((module) => {
                    const { label, text } = EXTRAS[module];
                    const id = `club-extra-${module}`;
                    return (
                        <label key={module} htmlFor={id} className={`flex items-start gap-3 ${admin ? 'cursor-pointer' : ''}`}>
                            <input
                                id={id}
                                type="checkbox"
                                className="mt-1 h-5 w-5 accent-[rgb(var(--brand-rgb))]"
                                checked={modules?.[module] ?? false}
                                disabled={!admin || modules === null || busy !== null}
                                onChange={(e) => save(module, e.target.checked)}
                            />
                            <span className="text-sm text-foreground">
                                {label}
                                <span className="block text-muted">{text}</span>
                            </span>
                        </label>
                    );
                })}
            </div>
            {!admin && <p className="mt-4 text-sm text-muted">Only club admins can change these.</p>}
            {message && <div className="mt-4"><Notice tone={message.error ? 'error' : 'success'}>{message.text}</Notice></div>}
        </section>
    );
}
