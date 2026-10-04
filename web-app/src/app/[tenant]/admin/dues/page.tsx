'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDate } from '@/lib/format';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { Dialog, ErrorNote, LoadingBlock, Notice, bodyError } from '@/components/admin/AdminUi';

interface PaymentRequest {
    id: string;
    title: string;
    description: string | null;
    amount: number;
    dueDate: number | null;
    status: string;
    paidCount: number;
    totalCollected: number;
    createdAt: number;
}

const pounds = (n: number) => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
const EMPTY = { title: '', amount: '', description: '', dueDate: '' };

/**
 * Subs and match fees. Members pay online through Stripe, which isn't
 * switched on for clubs yet, so the page says so up front.
 */
export default function DuesPage() {
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newRequest, setNewRequest] = useState(EMPTY);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

    const fetchRequests = useCallback(async () => {
        setLoadError('');
        try {
            const res = await apiFetch('/api/v1/dues/requests');
            if (!res.ok) throw new Error(await errorMessage(res, "We couldn't load your payment requests."));
            const data = await res.json();
            setRequests(Array.isArray(data?.data) ? (data.data as PaymentRequest[]) : []);
        } catch (err) {
            setLoadError(err instanceof Error && err.message ? err.message : "We couldn't load your payment requests. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(newRequest.amount);
        if (!newRequest.title.trim() || !(amount > 0)) {
            setCreateError('Enter what it is for and an amount.');
            return;
        }
        setCreating(true);
        setCreateError('');
        try {
            const res = await apiFetch('/api/v1/dues/requests', {
                method: 'POST',
                body: JSON.stringify({
                    title: newRequest.title.trim(),
                    amount,
                    description: newRequest.description || undefined,
                    dueDate: newRequest.dueDate || undefined,
                }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(bodyError(data, "The request wasn't made. Please try again."));
            setShowCreate(false);
            setNewRequest(EMPTY);
            setMessage({ tone: 'success', text: 'Payment request made.' });
            fetchRequests();
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : "The request wasn't made. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    const handleSendReminder = async (request: PaymentRequest) => {
        setMessage(null);
        try {
            const res = await apiFetch('/api/v1/dues/remind', { method: 'POST', body: JSON.stringify({ requestId: request.id }) });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(bodyError(data, "Reminders weren't sent. Please try again."));
            setMessage({ tone: 'success', text: `Reminder sent to ${data.data?.remindersSent ?? 0} members.` });
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "Reminders weren't sent. Please try again." });
        }
    };

    return (
        <div className="container py-8 md:py-10 max-w-5xl">
            <PageHeader
                eyebrow="Club admin"
                title="Subs and fees"
                subtitle="Ask members for match fees, subs and kit money."
                actions={<button type="button" onClick={() => setShowCreate(true)} className="btn btn-primary"><Icon name="plus" className="w-4 h-4" /> New request</button>}
            />

            <div className="mb-6">
                <Notice tone="info">Paying online isn&apos;t switched on for clubs yet, so members can&apos;t pay through the app until it is.</Notice>
            </div>
            {message && <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div>}

            {loading ? (
                <LoadingBlock label="Loading payment requests" />
            ) : loadError ? (
                <ErrorNote message={loadError} onRetry={() => { setLoading(true); fetchRequests(); }} />
            ) : requests.length === 0 ? (
                <EmptyNote icon="money" title="No payment requests yet" action={<button type="button" onClick={() => setShowCreate(true)} className="btn btn-primary">Make a request</button>}>
                    Make a request for this month&apos;s subs or a tournament fee.
                </EmptyNote>
            ) : (
                <ul className="space-y-3">
                    {requests.map((request) => (
                        <li key={request.id} className="card">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <h2 className="text-2xl">{request.title}</h2>
                                    {request.description && <p className="text-muted mt-1">{request.description}</p>}
                                    <p className="text-sm mt-2">
                                        <strong>{pounds(request.amount)}</strong>
                                        {request.dueDate && <span className="text-muted"> · due {formatDate(request.dueDate * 1000)}</span>}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-display text-3xl font-extrabold text-brand">{pounds(request.totalCollected)}</p>
                                    <p className="text-sm text-muted">{request.paidCount} paid</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-border">
                                <button type="button" onClick={() => handleSendReminder(request)} className="btn btn-sm btn-secondary"><Icon name="bell" className="w-4 h-4" /> Send a reminder</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {showCreate && (
                <Dialog title="New payment request" onClose={() => setShowCreate(false)}>
                    <form onSubmit={handleCreate} className="space-y-4" noValidate>
                        <div>
                            <label htmlFor="due-title" className="label">What it&apos;s for</label>
                            <input id="due-title" type="text" value={newRequest.title} onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })} placeholder="e.g. March training subs" className="field" />
                        </div>
                        <div>
                            <label htmlFor="due-amount" className="label">Amount (£)</label>
                            <input id="due-amount" type="number" inputMode="decimal" step="0.01" min="0" value={newRequest.amount} onChange={(e) => setNewRequest({ ...newRequest, amount: e.target.value })} placeholder="25.00" className="field" />
                        </div>
                        <div>
                            <label htmlFor="due-description" className="label">Details (optional)</label>
                            <textarea id="due-description" rows={2} value={newRequest.description} onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })} className="field" />
                        </div>
                        <div>
                            <label htmlFor="due-date" className="label">Due by (optional)</label>
                            <input id="due-date" type="date" value={newRequest.dueDate} onChange={(e) => setNewRequest({ ...newRequest, dueDate: e.target.value })} className="field" />
                        </div>
                        {createError && <Notice tone="error">{createError}</Notice>}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                            <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost">Cancel</button>
                            <button type="submit" disabled={creating} className="btn btn-primary">{creating ? 'Saving…' : 'Make request'}</button>
                        </div>
                    </form>
                </Dialog>
            )}
        </div>
    );
}
