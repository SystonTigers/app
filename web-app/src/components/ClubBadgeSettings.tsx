'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE, errorMessage, getSessionToken } from '@/lib/session';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/admin/AdminUi';

const MAX_BYTES = 3 * 1024 * 1024;

/**
 * The club's own badge: in the app, on the club pages and on every graphic
 * posted to the app, Facebook and Instagram. Club admins upload a PNG or JPG.
 */
export function ClubBadgeSettings() {
    const params = useParams();
    const tenant = params.tenant as string;
    const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

    useEffect(() => {
        fetch(`${API_BASE}/public/${encodeURIComponent(tenant)}/info`)
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => setBadgeUrl(body?.data?.badgeUrl ?? null))
            .catch(() => undefined)
            .finally(() => setLoaded(true));
    }, [tenant]);

    const auth = (): Record<string, string> => {
        const token = getSessionToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const upload = async (file: File) => {
        if (!/^image\/(png|jpeg)$/.test(file.type)) {
            setMessage({ text: 'Please choose a PNG or JPG. A PNG with a see-through background looks best.', error: true });
            return;
        }
        if (file.size > MAX_BYTES) {
            setMessage({ text: 'That picture is too big. Please use one under 3 MB.', error: true });
            return;
        }
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/v1/club/badge`, {
                method: 'POST',
                headers: { 'Content-Type': file.type, ...auth() },
                body: await file.arrayBuffer(),
            });
            if (!res.ok) {
                setMessage({ text: await errorMessage(res, "The badge didn't upload. Please try again."), error: true });
                return;
            }
            setBadgeUrl((await res.json()).data.badgeUrl);
            setMessage({ text: 'Badge saved. New posts and graphics use it.', error: false });
        } catch {
            setMessage({ text: "We couldn't reach the server. Check your connection and try again.", error: true });
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/v1/club/badge`, { method: 'DELETE', headers: auth() });
            if (!res.ok) {
                setMessage({ text: await errorMessage(res, "The badge wasn't removed."), error: true });
                return;
            }
            setBadgeUrl(null);
            setMessage({ text: "Badge removed. Your club's initials are shown instead.", error: false });
        } catch {
            setMessage({ text: "We couldn't reach the server. Check your connection and try again.", error: true });
        } finally {
            setBusy(false);
        }
    };

    if (!loaded) return <div className="card md:col-span-2 h-40 animate-pulse" aria-busy="true" />;

    return (
        <section className="card md:col-span-2" aria-labelledby="badge-title">
            <h2 id="badge-title" className="text-2xl flex items-center gap-2"><Icon name="shield" className="w-5 h-5 text-brand" /> Club badge</h2>
            <p className="text-sm text-muted mt-1">
                Shown in the app, on your club pages and on every graphic posted to the app, Facebook and Instagram. A PNG with a see-through background looks best.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
                <div className="h-24 w-24 bg-background border border-border flex items-center justify-center overflow-hidden chamfer-sm">
                    {badgeUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={badgeUrl} alt="Club badge" className="max-h-full max-w-full object-contain p-2" />
                    ) : (
                        <span className="text-xs text-muted text-center px-2">No badge yet</span>
                    )}
                </div>
                <label htmlFor="club-badge" className={`btn btn-primary ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Icon name="upload" className="w-4 h-4" />
                    {busy ? 'Saving…' : badgeUrl ? 'Change badge' : 'Upload badge'}
                    <input id="club-badge" type="file" accept="image/png,image/jpeg" className="sr-only" disabled={busy}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
                </label>
                {badgeUrl && (
                    <button type="button" onClick={remove} disabled={busy} className="btn btn-danger">Remove badge</button>
                )}
            </div>
            <p className="text-xs text-muted mt-3">PNG or JPG, under 3 MB.</p>
            {message && <div className="mt-3"><Notice tone={message.error ? 'error' : 'success'}>{message.text}</Notice></div>}
        </section>
    );
}
