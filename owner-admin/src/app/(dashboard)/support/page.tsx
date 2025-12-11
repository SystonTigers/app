'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface Ticket {
    id: string;
    tenant: string;
    subject: string;
    status: 'open' | 'in-progress' | 'resolved';
    priority: 'low' | 'medium' | 'high';
    created_at: string;
}

// Mock tickets for demo
const mockTickets: Ticket[] = [
    {
        id: '1',
        tenant: 'syston-tigers',
        subject: 'Unable to upload team photo',
        status: 'open',
        priority: 'medium',
        created_at: '2024-12-10T10:30:00Z',
    },
    {
        id: '2',
        tenant: 'leicester-fc',
        subject: 'API rate limiting question',
        status: 'in-progress',
        priority: 'low',
        created_at: '2024-12-09T14:15:00Z',
    },
];

export default function SupportPage() {
    const [tickets] = useState<Ticket[]>(mockTickets);

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            open: 'badge-warning',
            'in-progress': 'badge-info',
            resolved: 'badge-success',
        };
        return <span className={styles[status]}>{status.replace('-', ' ')}</span>;
    };

    const priorityBadge = (priority: string) => {
        const styles: Record<string, string> = {
            low: 'badge-neutral',
            medium: 'badge-warning',
            high: 'badge-danger',
        };
        return <span className={styles[priority]}>{priority}</span>;
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Support</h1>
                <p className="text-gray-500 mt-1">Manage tenant support requests</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                    <div className="text-2xl font-bold text-yellow-400">
                        {tickets.filter((t) => t.status === 'open').length}
                    </div>
                    <div className="text-sm text-gray-500">Open Tickets</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-2xl font-bold text-blue-400">
                        {tickets.filter((t) => t.status === 'in-progress').length}
                    </div>
                    <div className="text-sm text-gray-500">In Progress</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-2xl font-bold text-green-400">
                        {tickets.filter((t) => t.status === 'resolved').length}
                    </div>
                    <div className="text-sm text-gray-500">Resolved Today</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-2xl font-bold text-gray-400">2.4h</div>
                    <div className="text-sm text-gray-500">Avg Response Time</div>
                </div>
            </div>

            {/* Tickets Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h2 className="font-semibold text-white">Recent Tickets</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                    Ticket
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                    Tenant
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                    Priority
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                    Status
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                    Created
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.map((ticket, i) => (
                                <motion.tr
                                    key={ticket.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="table-row cursor-pointer"
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-white">{ticket.subject}</div>
                                        <div className="text-xs text-gray-500">#{ticket.id}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                                        {ticket.tenant}
                                    </td>
                                    <td className="px-6 py-4">{priorityBadge(ticket.priority)}</td>
                                    <td className="px-6 py-4">{statusBadge(ticket.status)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(ticket.created_at).toLocaleDateString()}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {tickets.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No support tickets
                    </div>
                )}
            </div>

            {/* Coming Soon */}
            <div className="glass-card p-6 text-center border-dashed border-2 border-white/10">
                <p className="text-gray-500">
                    Full ticketing system with email integration coming soon
                </p>
            </div>
        </div>
    );
}
