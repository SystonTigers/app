'use client';

import { useState, useEffect } from 'react';
import { API_BASE, getSessionToken } from '@/lib/session';

/** Last-24h totals from GET /api/v1/security/summary (data.last24Hours). */
interface SecurityTotals {
    authFailures: number;
    rateLimitHits: number;
    unauthorizedAttempts: number;
    suspiciousActivity: number;
    totalEvents: number;
}

/** One row from GET /api/v1/security/events (data.events). */
interface SecurityEvent {
    timestamp: number;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    ip: string;
    path?: string;
    details?: Record<string, unknown>;
}

function authHeaders(): Record<string, string> {
    const token = getSessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SecurityDashboard() {
    const [summary, setSummary] = useState<SecurityTotals | null>(null);
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const init: RequestInit = { credentials: 'include', headers: authHeaders() };
            const [summaryRes, eventsRes] = await Promise.all([
                fetch(`${API_BASE}/api/v1/security/summary`, init),
                fetch(`${API_BASE}/api/v1/security/events?limit=20`, init),
            ]);

            if (summaryRes.status === 401 || summaryRes.status === 403) {
                setError('You need a platform admin session to view security events.');
                return;
            }

            const summaryData = await summaryRes.json().catch(() => null);
            const eventsData = await eventsRes.json().catch(() => null);

            if (summaryData?.success) {
                setSummary(summaryData.data?.last24Hours ?? null);
            }
            if (eventsData?.success) {
                setEvents(Array.isArray(eventsData.data?.events) ? eventsData.data.events : []);
            }
            if (!summaryData?.success && !eventsData?.success) {
                setError('Security data is unavailable right now. Try again shortly.');
            }
        } catch (err) {
            console.error('Failed to load security data', err);
            setError('Security data is unavailable right now. Try again shortly.');
        } finally {
            setLoading(false);
        }
    };

    const exportCsv = async () => {
        setExporting(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/security/export?format=csv`, {
                credentials: 'include',
                headers: authHeaders(),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `security-events-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Security export failed', err);
            setError('Export failed. Check your admin session and try again.');
        } finally {
            setExporting(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
            case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
            default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        }
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Security Dashboard</h1>
                    <p className="text-muted-foreground">Monitor system health and security events</p>
                </div>
                <button
                    type="button"
                    onClick={exportCsv}
                    disabled={exporting}
                    className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
            </div>

            {error && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="animate-pulse space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
                    </div>
                    <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card p-4">
                            <div className="text-sm text-muted mb-1">Events (24h)</div>
                            <div className="text-3xl font-bold">{(summary?.totalEvents ?? 0).toLocaleString()}</div>
                        </div>
                        <div className="card p-4">
                            <div className="text-sm text-muted mb-1">Suspicious Activity (24h)</div>
                            <div className="text-3xl font-bold text-red-600">{summary?.suspiciousActivity ?? 0}</div>
                        </div>
                        <div className="card p-4">
                            <div className="text-sm text-muted mb-1">Rate-limit Hits (24h)</div>
                            <div className="text-3xl font-bold text-blue-600">{summary?.rateLimitHits ?? 0}</div>
                        </div>
                        <div className="card p-4">
                            <div className="text-sm text-muted mb-1">Failed Logins (24h)</div>
                            <div className="text-3xl font-bold text-orange-600">{summary?.authFailures ?? 0}</div>
                        </div>
                    </div>

                    {/* Events Table */}
                    <div className="card overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-bold">Recent Events</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-muted">Time</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted">Type</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted">Severity</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted">IP Address</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {events.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-muted">
                                                No security events recorded.
                                            </td>
                                        </tr>
                                    )}
                                    {events.map((event, i) => (
                                        <tr key={`${event.timestamp}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {new Date(event.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                {event.type.replace(/_/g, ' ')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getSeverityColor(event.severity)}`}>
                                                    {event.severity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">
                                                {event.ip}
                                            </td>
                                            <td className="px-4 py-3 text-muted max-w-xs truncate">
                                                {event.details ? JSON.stringify(event.details) : event.path ?? ''}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
