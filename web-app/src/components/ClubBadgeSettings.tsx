'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE, errorMessage, getSessionToken } from '@/lib/session';

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
        } finally {
            setBusy(false);
        }
    };

    if (!loaded) return null;

    return (
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow md:col-span-2" aria-labelledby="badge-title">
            <h3 id="badge-title" className="font-semibold text-lg text-gray-900 dark:text-white">Club badge</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Shown in the app, on your club pages and on every graphic posted to the app, Facebook and Instagram. A PNG with a see-through background looks best.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="h-20 w-20 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                    {badgeUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={badgeUrl} alt="Club badge" className="max-h-full max-w-full object-contain" />
                    ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400 text-center px-1">No badge yet</span>
                    )}
                </div>
                <label className="px-4 py-2 bg-brand text-black rounded-lg text-sm font-bold cursor-pointer">
                    {busy ? 'Saving…' : badgeUrl ? 'Change badge' : 'Upload badge (PNG or JPG)'}
                    <input id="club-badge" type="file" accept="image/png,image/jpeg" className="sr-only" disabled={busy}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />
                </label>
                {badgeUrl && (
                    <button type="button" onClick={remove} disabled={busy} className="text-sm font-semibold text-red-600 disabled:opacity-50">Remove badge</button>
                )}
            </div>
            {message && (
                <p role={message.error ? 'alert' : 'status'} className={`mt-3 text-sm ${message.error ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>{message.text}</p>
            )}
        </section>
    );
}
