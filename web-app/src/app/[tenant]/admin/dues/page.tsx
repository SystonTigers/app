'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

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

export default function DuesPage() {
    const params = useParams();
    const tenant = params?.tenant as string;
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRequest, setNewRequest] = useState({ title: '', amount: '', description: '', dueDate: '' });
    const [creating, setCreating] = useState(false);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/dues/requests`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setRequests(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newRequest.title || !newRequest.amount) return;
        setCreating(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/dues/requests`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newRequest.title,
                    amount: parseFloat(newRequest.amount),
                    description: newRequest.description || undefined,
                    dueDate: newRequest.dueDate || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setShowCreateModal(false);
                setNewRequest({ title: '', amount: '', description: '', dueDate: '' });
                fetchRequests();
            }
        } catch (error) {
            console.error('Failed to create request:', error);
        } finally {
            setCreating(false);
        }
    };

    const handleSendReminder = async (requestId: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/dues/remind`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId }),
            });
            const data = await res.json();
            if (data.success) {
                alert(`Reminders sent to ${data.data.remindersSent} members`);
            }
        } catch (error) {
            console.error('Failed to send reminder:', error);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payment Collection</h1>
                    <p className="text-gray-600 mt-1">Collect match fees, subs, and kit payments from members</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <span>+</span>
                    <span>New Request</span>
                </button>
            </div>

            {requests.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <div className="text-5xl mb-4">💳</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No Payment Requests Yet</h2>
                    <p className="text-gray-600 mb-6">Create a payment request to start collecting money from members</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Create First Request
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                                    {request.description && (
                                        <p className="text-gray-600 mt-1">{request.description}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-3 text-sm">
                                        <span className="font-medium text-gray-900">£{request.amount.toFixed(2)}</span>
                                        {request.dueDate && (
                                            <span className="text-gray-500">
                                                Due: {new Date(request.dueDate * 1000).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-green-600">
                                        £{request.totalCollected.toFixed(2)}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {request.paidCount} paid
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                                <a
                                    href={`/${tenant}/admin/dues/${request.id}`}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                >
                                    View Details
                                </a>
                                <button
                                    onClick={() => handleSendReminder(request.id)}
                                    className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm"
                                >
                                    Send Reminder
                                </button>
                                <button
                                    className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-sm ml-auto"
                                >
                                    Share Link
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Create Payment Request</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newRequest.title}
                                    onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g., March Training Subs"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount (£) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newRequest.amount}
                                    onChange={(e) => setNewRequest(prev => ({ ...prev, amount: e.target.value }))}
                                    placeholder="25.00"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newRequest.description}
                                    onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Optional details about this payment"
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Due Date
                                </label>
                                <input
                                    type="date"
                                    value={newRequest.dueDate}
                                    onChange={(e) => setNewRequest(prev => ({ ...prev, dueDate: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating || !newRequest.title || !newRequest.amount}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creating ? 'Creating...' : 'Create Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
