'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API_BASE, errorMessage, getSessionToken } from '@/lib/session';
import { FaFullTimeEmbed, type FaSnippetKind, type FaSnippets } from '@/components/FaFullTimeEmbed';
import { LeagueTableSettings } from '@/components/LeagueTableSettings';

const BOXES: Array<{ kind: FaSnippetKind; type: string; label: string; shows: string }> = [
    { kind: 'table', type: 'Division - Table', label: 'League table', shows: 'the League Table page' },
    { kind: 'fixtures', type: 'Division - Upcoming Fixtures', label: 'League fixtures', shows: '"Around the League" on the Fixtures page' },
    { kind: 'results', type: 'Division - Recent Results', label: 'League results', shows: '"Around the League" on the Results page' },
    { kind: 'team', type: 'Team - Fixtures / Results', label: 'Our fixtures & results', shows: 'Fixtures and Results when you haven\'t added your own yet' },
];

/**
 * League table settings: the club's own table (pasted results or table,
 * plus Match Centre) and, optionally, FA Full-Time code snippets.
 */
export default function FaFullTimeSettingsPage() {
    const params = useParams();
    const tenant = params.tenant as string;
    const [saved, setSaved] = useState<FaSnippets>({});
    const [drafts, setDrafts] = useState<Record<FaSnippetKind, string>>({ table: '', fixtures: '', results: '', team: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ error: boolean; text: string; field?: string } | null>(null);

    function authHeaders(): Record<string, string> {
        const token = getSessionToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    useEffect(() => {
        fetch(`${API_BASE}/api/v1/club/fa-full-time`, { headers: authHeaders() })
            .then(async (res) => {
                if (!res.ok) throw new Error(await errorMessage(res, 'Couldn\'t load your FA Full-Time settings.'));
                return res.json();
            })
            .then((body) => setSaved((body.data || {}) as FaSnippets))
            .catch((err: Error) => setMessage({ error: true, text: err.message }))
            .finally(() => setLoading(false));
    }, []);

    async function save(body: Partial<Record<FaSnippetKind, string>>, done: string) {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/v1/club/fa-full-time`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                const field = data?.error?.field as string | undefined;
                setMessage({ error: true, text: data?.error?.message || 'Couldn\'t save that. Please try again.', field });
                return;
            }
            setSaved(data.data as FaSnippets);
            setDrafts({ table: '', fixtures: '', results: '', team: '' });
            setMessage({ error: false, text: done });
        } catch {
            setMessage({ error: true, text: 'Couldn\'t reach the server. Check your connection and try again.' });
        } finally {
            setSaving(false);
        }
    }

    const pending = Object.fromEntries(Object.entries(drafts).filter(([, v]) => v.trim())) as Partial<Record<FaSnippetKind, string>>;

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-4xl">
            <div>
                <Link href={`/${tenant}/admin/settings`} className="text-sm text-gray-500 hover:text-brand">← Settings</Link>
                <h1 className="text-2xl font-bold mt-2">League table, fixtures &amp; results</h1>
            </div>

            <LeagueTableSettings />

            <div>
                <h2 className="text-xl font-bold">FA Full-Time snippets (optional)</h2>
                <p className="text-gray-500 mt-1 text-sm">
                    If your league is on FA Full-Time, your club pages can also show the FA&apos;s own table, fixtures and results. They load from the FA, so they only appear when the FA lets visitors&apos; browsers through.
                </p>
            </div>

            <ol className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-2 text-sm list-decimal list-inside text-gray-700 dark:text-gray-300">
                <li>Log in to <strong>FA Full-Time admin</strong> and open <strong>Create Code Snippets</strong>.</li>
                <li>Pick the type shown on a box below, your season and division, then press <strong>Create</strong>.</li>
                <li>Copy the whole code it gives you and paste it into that box. Do this for each one you want.</li>
            </ol>

            {message && (
                <div className={`p-4 rounded-lg text-sm ${message.error ? 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200' : 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'}`}>
                    {message.text}
                </div>
            )}

            {loading ? (
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            ) : (
                <div className="grid gap-4">
                    {BOXES.map((box) => (
                        <div key={box.kind} className={`bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-3 ${message?.field === box.kind ? 'ring-2 ring-red-500' : ''}`}>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <h2 className="font-semibold text-gray-900 dark:text-white">{box.label}</h2>
                                    <p className="text-xs text-gray-500">Type in FA Full-Time: <strong>{box.type}</strong>. Shows on {box.shows}.</p>
                                </div>
                                {saved[box.kind] ? (
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="text-green-700 dark:text-green-400 font-semibold">✓ Added ({saved[box.kind]})</span>
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => save({ [box.kind]: '' }, `${box.label} removed.`)}
                                            className="text-gray-500 hover:text-red-600 underline disabled:opacity-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-400">Not added</span>
                                )}
                            </div>
                            <textarea
                                value={drafts[box.kind]}
                                onChange={(e) => setDrafts({ ...drafts, [box.kind]: e.target.value })}
                                rows={3}
                                spellCheck={false}
                                placeholder={saved[box.kind] ? 'Paste a new snippet to replace it' : 'Paste the code snippet here'}
                                className="w-full font-mono text-xs p-3 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
                            />
                        </div>
                    ))}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            disabled={saving || Object.keys(pending).length === 0}
                            onClick={() => save(pending, 'Saved. Your club pages now show the FA\'s table, fixtures and results.')}
                            className="px-6 py-2 bg-brand text-white font-bold rounded disabled:opacity-50"
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            )}

            {saved.table && (
                <div className="space-y-2">
                    <h2 className="font-semibold">Preview</h2>
                    <FaFullTimeEmbed code={saved.table} title="League Table" highlight={tenant.split('-')[0]} />
                </div>
            )}
        </div>
    );
}
