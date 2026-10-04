'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API_BASE, errorMessage, getSessionToken } from '@/lib/session';
import { FaFullTimeEmbed, type FaSnippetKind, type FaSnippets } from '@/components/FaFullTimeEmbed';
import { LeagueTableSettings } from '@/components/LeagueTableSettings';
import { FaEmailImport } from '@/components/FaEmailImport';
import { FixtureEmailForwarding } from '@/components/FixtureEmailForwarding';
import { PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/admin/AdminUi';

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
        <div className="container py-8 md:py-10 space-y-6 max-w-4xl">
            <div>
                <Link href={`/${tenant}/admin/settings`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand mb-4 min-h-[40px]">
                    <Icon name="arrowLeft" className="w-4 h-4" /> Settings
                </Link>
                <PageHeader
                    eyebrow="Settings"
                    title="League table and fixtures"
                    subtitle="Keep your table up to date, bring in FA fixture emails and, if you like, show FA Full-Time's own tables."
                />
            </div>

            <LeagueTableSettings />

            <FixtureEmailForwarding />

            <FaEmailImport />

            <div>
                <h2 className="text-2xl">FA Full-Time snippets (optional)</h2>
                <p className="text-muted mt-1 text-sm">
                    If your league is on FA Full-Time, your club pages can also show the FA&apos;s own table, fixtures and results. They load from the FA, so they only appear when the FA lets visitors&apos; browsers through.
                </p>
            </div>

            <ol className="card space-y-2 text-sm list-decimal list-inside text-muted">
                <li>Log in to <strong className="text-foreground">FA Full-Time admin</strong> and open <strong className="text-foreground">Create Code Snippets</strong>.</li>
                <li>Pick the type shown on a box below, your season and division, then press <strong className="text-foreground">Create</strong>.</li>
                <li>Copy the whole code it gives you and paste it into that box. Do this for each one you want.</li>
            </ol>

            {message && (
                <Notice tone={message.error ? 'error' : 'success'}>{message.text}</Notice>
            )}

            {loading ? (
                <div className="h-40 bg-surface border border-border animate-pulse" />
            ) : (
                <div className="grid gap-4">
                    {BOXES.map((box) => (
                        <div key={box.kind} className={`card space-y-3 ${message?.field === box.kind ? 'border-red-500/60' : ''}`}>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <h2 className="text-lg">{box.label}</h2>
                                    <p className="text-xs text-muted">Type in FA Full-Time: <strong className="text-foreground">{box.type}</strong>. Shows on {box.shows}.</p>
                                </div>
                                {saved[box.kind] ? (
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="inline-flex items-center gap-1 text-green-400 font-semibold"><Icon name="check" className="w-4 h-4" /> Added ({saved[box.kind]})</span>
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => save({ [box.kind]: '' }, `${box.label} removed.`)}
                                            className="btn btn-sm btn-ghost hover:text-red-400"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted">Not added</span>
                                )}
                            </div>
                            <label htmlFor={`fa-${box.kind}`} className="sr-only">{box.label} code snippet</label>
                            <textarea
                                id={`fa-${box.kind}`}
                                value={drafts[box.kind]}
                                onChange={(e) => setDrafts({ ...drafts, [box.kind]: e.target.value })}
                                rows={3}
                                spellCheck={false}
                                placeholder={saved[box.kind] ? 'Paste a new snippet to replace it' : 'Paste the code snippet here'}
                                className="field font-mono text-xs"
                            />
                        </div>
                    ))}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            disabled={saving || Object.keys(pending).length === 0}
                            onClick={() => save(pending, 'Saved. Your club pages now show the FA\'s table, fixtures and results.')}
                            className="btn btn-primary"
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            )}

            {saved.table && (
                <div className="space-y-2">
                    <h2 className="text-2xl">Preview</h2>
                    <FaFullTimeEmbed code={saved.table} title="League Table" highlight={tenant.split('-')[0]} />
                </div>
            )}
        </div>
    );
}
