'use client';

import { useEffect, useState } from 'react';
import { API_BASE, errorMessage, getSessionToken } from '@/lib/session';

/**
 * Club setting: how players appear on the public club page.
 * Off (default): "Alfie S." and no photos. On: full names and photos.
 * Logged-in parents and players always see the normal team sheet in the app.
 */
export function PublicNamesSetting() {
    const [fullNames, setFullNames] = useState<boolean | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

    const authHeaders = (): Record<string, string> => {
        const token = getSessionToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    useEffect(() => {
        fetch(`${API_BASE}/api/v1/tenants/me`, { headers: authHeaders() })
            .then(async (res) => {
                if (!res.ok) throw new Error(await errorMessage(res, "We couldn't load this setting."));
                const body = await res.json();
                setFullNames(body?.tenant?.public_full_names === 1);
            })
            .catch((err: Error) => setMessage({ text: err.message || "We couldn't load this setting.", error: true }));
    }, []);

    const save = async (next: boolean) => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/v1/tenants/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ publicFullNames: next }),
            });
            if (!res.ok) {
                setMessage({ text: await errorMessage(res, "We couldn't save this setting. Please try again."), error: true });
                return;
            }
            setFullNames(next);
            setMessage({ text: next ? 'Saved. Your public page now shows full names and photos.' : 'Saved. Your public page now shows first names and initials only.', error: false });
        } catch {
            setMessage({ text: "We couldn't reach the server. Check your connection and try again.", error: true });
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow" aria-labelledby="public-names-title">
            <div className="text-3xl mb-2" aria-hidden="true">🔒</div>
            <h3 id="public-names-title" className="font-semibold text-lg text-gray-900 dark:text-white">Players on your public page</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Anyone can see your club&apos;s public page. By default it shows players as first name and initial (for example &quot;Alfie S.&quot;) with no photos.
                Only turn on full names and photos if parents have agreed.
            </p>
            <label className="mt-4 flex items-start gap-3 cursor-pointer">
                <input
                    id="public-full-names"
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-brand"
                    checked={!!fullNames}
                    disabled={fullNames === null || saving}
                    onChange={(e) => save(e.target.checked)}
                />
                <span className="text-sm text-gray-900 dark:text-white">
                    Show players&apos; full names and photos on the public page
                </span>
            </label>
            {message && (
                <p role={message.error ? 'alert' : 'status'} className={`mt-3 text-sm ${message.error ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>
                    {message.text}
                </p>
            )}
        </section>
    );
}
