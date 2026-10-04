'use client';

import { useEffect, useState } from 'react';
import { API_BASE, getSessionToken } from '@/lib/session';

interface LogRow { receivedAt: number; subject: string | null; outcome: string; found: number | null; added: number | null; updated: number | null }
interface ForwardingInfo { address: string | null; gmailCode: string | null; recent: LogRow[] }

const OUTCOME: Record<string, string> = {
    imported: 'Read',
    nothing_found: 'No fixture found in it',
    not_fa: 'Not from FA Full-Time (ignored)',
    gmail_confirmation: 'Gmail forwarding confirmation',
    failed: 'Something went wrong',
};

/**
 * Automatic fixtures: the club's private address for forwarding FA Full-Time
 * emails, how to set up forwarding, and what's arrived recently.
 */
export function FixtureEmailForwarding() {
    const [info, setInfo] = useState<ForwardingInfo | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const token = getSessionToken();
        fetch(`${API_BASE}/api/v1/club/fixture-email`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => body?.success && setInfo(body.data as ForwardingInfo))
            .catch(() => undefined);
    }, []);

    if (!info) return null;

    async function copy() {
        if (!info?.address) return;
        try {
            await navigator.clipboard.writeText(info.address);
            setCopied(true);
        } catch {
            setCopied(false);
        }
    }

    return (
        <section className="card space-y-4">
            <div>
                <h2 className="text-2xl">Automatic fixtures from FA emails</h2>
                <p className="text-sm text-muted mt-1">
                    Set your inbox to forward FA Full-Time emails to your club&apos;s own address and fixtures are added and updated on their own. Nothing else in your inbox is read.
                </p>
            </div>
            {info.address ? (
                <>
                    <div className="flex flex-wrap items-center gap-3">
                        <code className="px-3 py-2 bg-background border border-border text-sm break-all text-brand">{info.address}</code>
                        <button type="button" onClick={copy} className="btn btn-sm btn-outline">{copied ? 'Copied' : 'Copy'}</button>
                    </div>
                    <p className="text-xs text-muted">Keep this address private: anything sent to it can add fixtures to your club.</p>
                    <div className="grid gap-4 md:grid-cols-2 text-sm text-muted">
                        <div>
                            <h3 className="text-lg">Gmail</h3>
                            <ol className="list-decimal list-inside space-y-1 mt-1">
                                <li>Settings → See all settings → Forwarding and POP/IMAP → Add a forwarding address, and paste the address above.</li>
                                <li>Gmail sends a confirmation code to it: it appears below. Type it into Gmail.</li>
                                <li>Create a filter: From <strong>donotreplyfulltime@thefa.com</strong> → Forward it to the address above.</li>
                            </ol>
                            {info.gmailCode && <p className="mt-2 font-bold text-foreground">Gmail confirmation code: <span className="font-mono">{info.gmailCode}</span></p>}
                        </div>
                        <div>
                            <h3 className="text-lg">Outlook / Hotmail</h3>
                            <ol className="list-decimal list-inside space-y-1 mt-1">
                                <li>Settings → Mail → Rules → Add new rule.</li>
                                <li>Condition: From <strong>donotreplyfulltime@thefa.com</strong>.</li>
                                <li>Action: Redirect to the address above. Save.</li>
                            </ol>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg">Recent emails</h3>
                        {info.recent.length ? (
                            <ul className="divide-y divide-border text-sm">
                                {info.recent.map((r, i) => (
                                    <li key={i} className="py-2 flex flex-wrap justify-between gap-2">
                                        <span className="text-foreground">{new Date(r.receivedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {r.subject || '(no subject)'}</span>
                                        <span className="text-muted">{OUTCOME[r.outcome] ?? r.outcome}{r.outcome === 'imported' ? `: ${r.added ?? 0} added, ${r.updated ?? 0} updated` : ''}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-muted">Nothing yet. Forwarded FA emails will show here.</p>}
                    </div>
                </>
            ) : (
                <p className="text-sm text-muted p-3 bg-surface-raised border border-border">
                    Coming soon: automatic reading switches on once Boost Huddle&apos;s email address is set up. Until then, paste FA emails below.
                </p>
            )}
        </section>
    );
}
