'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDateTime } from '@/lib/format';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { ErrorNote, LoadingBlock, Notice, Pill } from '@/components/admin/AdminUi';

interface ContentReport {
    id: string;
    content_type: string;
    content_id: string;
    reason: string;
    details?: string;
    status: string;
    created_at: number;
    reporter_email?: string;
    content_preview?: string;
}

const STATUSES = [
    { id: 'pending', label: 'To review' },
    { id: 'reviewed', label: 'Reviewed' },
    { id: 'actioned', label: 'Acted on' },
    { id: 'dismissed', label: 'Dismissed' },
];

const REASONS: Record<string, string> = {
    spam: 'Spam',
    harassment: 'Bullying or harassment',
    hate_speech: 'Hate speech',
    violence: 'Violence',
    inappropriate: 'Not suitable',
    misinformation: 'Not true',
    other: 'Something else',
};

/** Posts and messages members have reported, for staff to remove, warn or dismiss. */
export default function ModerationPage() {
    const params = useParams();
    const tenant = params.tenant as string;
    const [reports, setReports] = useState<ContentReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('pending');
    const [updating, setUpdating] = useState<string | null>(null);
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

    const loadReports = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiFetch(`/api/v1/content/reports?status=${selectedStatus}`, { headers: { 'x-tenant': tenant } });
            if (!response.ok) throw new Error(await errorMessage(response, "We couldn't load reports."));
            const data = await response.json();
            setReports((data.data?.reports ?? []) as ContentReport[]);
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : "We couldn't load reports. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, [selectedStatus, tenant]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleUpdateReport = async (reportId: string, newStatus: string, action: string, done: string) => {
        setUpdating(reportId);
        setMessage(null);
        try {
            const response = await apiFetch(`/api/v1/content/reports/${reportId}`, {
                method: 'PUT',
                headers: { 'x-tenant': tenant },
                body: JSON.stringify({ status: newStatus, action, notes: `${action} by admin` }),
            });
            if (!response.ok) throw new Error(await errorMessage(response, "That didn't save. Please try again."));
            setMessage({ tone: 'success', text: done });
            await loadReports();
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "That didn't save. Please try again." });
        } finally {
            setUpdating(null);
        }
    };

    const statusLabel = STATUSES.find((s) => s.id === selectedStatus)?.label.toLowerCase() ?? selectedStatus;

    return (
        <div className="container py-8 md:py-10 max-w-4xl">
            <PageHeader eyebrow="Club admin" title="Reports" subtitle="Posts and messages members have reported. Remove them, warn the person or dismiss the report." />

            <div className="flex gap-1 overflow-x-auto scrollbar-none border-b border-border mb-6" role="tablist" aria-label="Report status">
                {STATUSES.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={selectedStatus === s.id}
                        onClick={() => setSelectedStatus(s.id)}
                        className={`h-11 px-3 font-display text-[15px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 ${selectedStatus === s.id ? 'text-brand border-brand' : 'text-gray-300 border-transparent hover:text-foreground'}`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {message && <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div>}

            {loading ? (
                <LoadingBlock label="Loading reports" />
            ) : error ? (
                <ErrorNote message={error} onRetry={loadReports} />
            ) : reports.length === 0 ? (
                <EmptyNote icon="shield" title={`Nothing ${statusLabel}`}>
                    {selectedStatus === 'pending' ? "When a member reports a post or message, it shows here for you to look at." : 'Reports you deal with move here.'}
                </EmptyNote>
            ) : (
                <ul className="space-y-3">
                    {reports.map((report) => (
                        <li key={report.id} className="card">
                            <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                                <div>
                                    <p className="font-display text-2xl font-extrabold uppercase">{REASONS[report.reason] ?? report.reason}</p>
                                    <p className="text-xs text-muted">{formatDateTime(report.created_at)}{report.reporter_email ? ` · reported by ${report.reporter_email}` : ''}</p>
                                </div>
                                <Pill>{report.content_type}</Pill>
                            </div>
                            {report.content_preview && <p className="text-sm bg-background border border-border p-3 mb-3 line-clamp-3">{report.content_preview}</p>}
                            {report.details && <p className="text-sm text-muted mb-3"><strong className="text-foreground">What they said:</strong> {report.details}</p>}
                            {selectedStatus === 'pending' && (
                                <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                                    <button type="button" onClick={() => handleUpdateReport(report.id, 'actioned', 'removed', 'Removed.')} disabled={updating === report.id} className="btn btn-sm btn-danger">Remove it</button>
                                    <button type="button" onClick={() => handleUpdateReport(report.id, 'actioned', 'warned', 'Marked as warned.')} disabled={updating === report.id} className="btn btn-sm btn-secondary">Warn them</button>
                                    <button type="button" onClick={() => handleUpdateReport(report.id, 'dismissed', 'no_action', 'Report dismissed.')} disabled={updating === report.id} className="btn btn-sm btn-ghost">Dismiss</button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
