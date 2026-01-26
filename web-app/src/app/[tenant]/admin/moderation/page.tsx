'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

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

export default function ModerationPage() {
    const params = useParams();
    const tenant = params.tenant as string;

    const [reports, setReports] = useState<ContentReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState('pending');
    const [updating, setUpdating] = useState<string | null>(null);

    const loadReports = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/v1/content/reports?status=${selectedStatus}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                        'x-tenant': tenant,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to load reports');
            }

            const data = await response.json();
            setReports(data.data?.reports || []);
        } catch (err) {
            console.error('Load reports error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, [selectedStatus]);

    const handleUpdateReport = async (reportId: string, newStatus: string, action: string) => {
        setUpdating(reportId);

        try {
            const response = await fetch(`/api/v1/content/reports/${reportId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'x-tenant': tenant,
                },
                body: JSON.stringify({
                    status: newStatus,
                    action,
                    notes: `${action} by admin`,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update report');
            }

            // Reload reports
            await loadReports();
        } catch (err) {
            console.error('Update error:', err);
            alert('Failed to update report');
        } finally {
            setUpdating(null);
        }
    };

    const getReasonLabel = (reason: string) => {
        const labels: Record<string, string> = {
            spam: '🚫 Spam',
            harassment: '⚠️ Harassment',
            hate_speech: '🛑 Hate Speech',
            violence: '⚔️ Violence',
            inappropriate: '🔞 Inappropriate',
            misinformation: '❌ Misinformation',
            other: '📝 Other',
        };
        return labels[reason] || reason;
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1>
                <p className="text-gray-600 mt-2">Review and manage content reports</p>
            </div>

            {/* Status Filter */}
            <div className="mb-6 flex gap-2">
                {['pending', 'reviewed', 'actioned', 'dismissed'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedStatus === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading reports...</p>
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">No {selectedStatus} reports</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">{getReasonLabel(report.reason)}</span>
                                        <span className="text-sm px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                            {report.content_type}
                                        </span>
                                    </div>
                                    {report.reporter_email && (
                                        <p className="text-sm text-gray-500">
                                            Reported by: {report.reporter_email}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-400">
                                        {new Date(report.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <span
                                    className={`px-3 py-1 rounded-full text-sm font-medium ${report.status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : report.status === 'actioned'
                                                ? 'bg-green-100 text-green-800'
                                                : report.status === 'dismissed'
                                                    ? 'bg-gray-100 text-gray-800'
                                                    : 'bg-blue-100 text-blue-800'
                                        }`}
                                >
                                    {report.status}
                                </span>
                            </div>

                            {report.content_preview && (
                                <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                                    <p className="text-sm text-gray-700 line-clamp-3">
                                        {report.content_preview}
                                    </p>
                                </div>
                            )}

                            {report.details && (
                                <div className="mb-4">
                                    <p className="text-sm text-gray-600">
                                        <strong>Additional details:</strong> {report.details}
                                    </p>
                                </div>
                            )}

                            {selectedStatus === 'pending' && (
                                <div className="flex gap-2 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => handleUpdateReport(report.id, 'actioned', 'removed')}
                                        disabled={updating === report.id}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updating === report.id ? 'Updating...' : 'Remove Content'}
                                    </button>
                                    <button
                                        onClick={() => handleUpdateReport(report.id, 'actioned', 'warned')}
                                        disabled={updating === report.id}
                                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updating === report.id ? 'Updating...' : 'Warn User'}
                                    </button>
                                    <button
                                        onClick={() => handleUpdateReport(report.id, 'dismissed', 'no_action')}
                                        disabled={updating === report.id}
                                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {updating === report.id ? 'Updating...' : 'Dismiss'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
