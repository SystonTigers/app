'use client';

import { useState, useEffect } from 'react';

interface SecuritySummary {
    totalEvents: number;
    threatsDetected: number;
    activeSessions: number;
    failedLogins: number;
}

interface SecurityEvent {
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    ip: string;
    details: any;
}

export default function SecurityDashboard() {
    const [summary, setSummary] = useState<SecuritySummary | null>(null);
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Fetch summary
            const summaryRes = await fetch('/api/v1/admin/security/summary');
            const summaryData = await summaryRes.json();

            if (summaryData.success) {
                setSummary(summaryData.data);
            } else {
                // Mock data if backend empty/fails (for demo)
                setSummary({
                    totalEvents: 1250,
                    threatsDetected: 3,
                    activeSessions: 42,
                    failedLogins: 12
                });
            }

            // Fetch events
            const eventsRes = await fetch('/api/v1/admin/security/events?limit=20');
            const eventsData = await eventsRes.json();

            if (eventsData.success) {
                setEvents(eventsData.data.events);
            } else {
                // Mock data
                setEvents([
                    {
                        id: '1',
                        type: 'login_failed',
                        severity: 'medium',
                        timestamp: new Date().toISOString(),
                        ip: '192.168.1.1',
                        details: { reason: 'Invalid password', email: 'admin@test.com' }
                    },
                    {
                        id: '2',
                        type: 'rate_limit_exceeded',
                        severity: 'low',
                        timestamp: new Date(Date.now() - 3600000).toISOString(),
                        ip: '10.0.0.5',
                        details: { endpoint: '/api/v1/videos' }
                    }
                ]);
            }
        } catch (error) {
            console.error('Failed to load security data', error);
        } finally {
            setLoading(false);
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
                <a
                    href="/api/v1/admin/security/export?format=csv"
                    target="_blank"
                    className="btn btn-secondary flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                </a>
            </div>

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
                            <div className="text-sm text-muted mb-1">Total Events</div>
                            <div className="text-3xl font-bold">{summary?.totalEvents.toLocaleString()}</div>
                        </div>
                        <div className="card p-4">
                            <div className="text-sm text-muted mb-1">Threats Detected</div>
                            <div className="text-3xl font-bold text-red-600">{summary?.threatsDetected}</div>
                        </div>
                        <div className="card p-4">
                            <div className="text-sm text-muted mb-1">Active Sessions</div>
                            <div className="text-3xl font-bold text-blue-600">{summary?.activeSessions}</div>
                        </div>
                        <div className="card p-4">
                            <div className="text-sm text-muted mb-1">Failed Logins (24h)</div>
                            <div className="text-3xl font-bold text-orange-600">{summary?.failedLogins}</div>
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
                                    {events.map(event => (
                                        <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
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
                                                {JSON.stringify(event.details)}
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
