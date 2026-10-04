'use client';

import { useState } from 'react';
import { API_BASE, getSessionToken } from '@/lib/session';

interface ImportLine {
    date: string;
    time: string | null;
    opponent: string;
    homeAway: 'home' | 'away';
    status: 'scheduled' | 'postponed' | 'cancelled';
    action: 'added' | 'updated' | 'unchanged' | 'not_ours' | 'skipped';
    changes: string[];
}

interface ImportSummary { found: number; added: number; updated: number; unchanged: number; notOurs: number; lines: ImportLine[] }

const ACTION_TEXT: Record<ImportLine['action'], string> = {
    added: 'Added',
    updated: 'Updated',
    unchanged: 'Already up to date',
    not_ours: "Not one of your team's matches",
    skipped: 'Cancelled, so not added',
};

function when(line: ImportLine): string {
    const d = new Date(`${line.date}T12:00:00Z`);
    const day = Number.isNaN(d.getTime()) ? line.date : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    return line.time ? `${day}, ${line.time}` : day;
}

/**
 * Paste an FA Full-Time email (fixture change, referee appointment or weekly
 * reminder) and its fixtures are added or updated. Contact details in the
 * email are never saved.
 */
export function FaEmailImport() {
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<ImportSummary | null>(null);

    async function importEmail() {
        setBusy(true);
        setError('');
        setResult(null);
        try {
            const token = getSessionToken();
            const res = await fetch(`${API_BASE}/api/v1/club/fixtures/fa-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ text }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.success) {
                setError(body?.error?.message || 'That didn\'t work. Please try again.');
                return;
            }
            setResult(body.data as ImportSummary);
            setText('');
        } catch {
            setError('Couldn\'t reach the server. Check your connection and try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="card space-y-4">
            <div>
                <h2 className="text-2xl">Fixtures from FA emails</h2>
                <p className="text-sm text-muted mt-1">
                    When FA Full-Time emails you about a fixture (a new fixture, a change, a referee appointment or the weekly reminder), open it, select all, copy and paste it here.
                    New fixtures are added and moved, postponed or cancelled ones are updated. Referee and contact details in the email are never saved.
                </p>
            </div>
            {error && <div role="alert" className="p-3 text-sm border border-red-500/40 bg-red-500/10 text-red-200">{error}</div>}
            <textarea
                aria-label="FA Full-Time email"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                spellCheck={false}
                placeholder={'e.g.\nUnder 18 Division One\nSun 20 Sept 2026 14:00, Rival FC U18 -v- Your Team U18 Status: Normal\nVenue: ...'}
                className="field font-mono text-xs"
            />
            <div className="flex justify-end">
                <button type="button" onClick={importEmail} disabled={busy || !text.trim()} className="btn btn-primary">
                    {busy ? 'Reading the email…' : 'Add to fixtures'}
                </button>
            </div>
            {result && (
                <div className="space-y-2 text-sm" role="status">
                    <p className="font-semibold text-green-400">
                        {result.added || result.updated
                            ? `Done: ${[result.added ? `${result.added} added` : '', result.updated ? `${result.updated} updated` : ''].filter(Boolean).join(', ')}.`
                            : 'Your fixtures were already up to date.'}
                    </p>
                    <ul className="divide-y divide-border">
                        {result.lines.map((l, i) => (
                            <li key={i} className="py-2 flex flex-wrap justify-between gap-2">
                                <span className="text-foreground">
                                    {when(l)} · {l.opponent ? `${l.homeAway === 'home' ? 'v' : '@'} ${l.opponent}` : 'Other teams'}
                                    {l.status !== 'scheduled' && <span className="ml-2 text-xs font-bold uppercase text-amber-300">{l.status}</span>}
                                </span>
                                <span className="text-muted">{ACTION_TEXT[l.action]}{l.changes.length ? ` (${l.changes.join(', ')})` : ''}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
