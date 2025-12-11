'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface AuditEntry {
    id: string;
    action: string;
    actor: string;
    target: string;
    timestamp: string;
    details?: string;
}

// Mock audit entries
const mockAuditLog: AuditEntry[] = [
    {
        id: '1',
        action: 'tenant.deactivate',
        actor: 'owner@platform.com',
        target: 'test-tenant',
        timestamp: '2024-12-10T15:30:00Z',
        details: 'Deactivated due to non-payment',
    },
    {
        id: '2',
        action: 'promo.create',
        actor: 'owner@platform.com',
        target: 'WINTER50',
        timestamp: '2024-12-10T14:00:00Z',
        details: '50% off, lifetime',
    },
    {
        id: '3',
        action: 'tenant.update',
        actor: 'owner@platform.com',
        target: 'syston-tigers',
        timestamp: '2024-12-10T12:15:00Z',
        details: 'Updated plan from starter to pro',
    },
    {
        id: '4',
        action: 'settings.update',
        actor: 'owner@platform.com',
        target: 'feature_flags',
        timestamp: '2024-12-09T18:45:00Z',
        details: 'Enabled AI Coaching feature',
    },
];

const actionLabels: Record<string, { label: string; color: string }> = {
    'tenant.deactivate': { label: 'Tenant Deactivated', color: 'text-red-400' },
    'tenant.delete': { label: 'Tenant Deleted', color: 'text-red-400' },
    'tenant.update': { label: 'Tenant Updated', color: 'text-blue-400' },
    'tenant.create': { label: 'Tenant Created', color: 'text-green-400' },
    'promo.create': { label: 'Promo Created', color: 'text-green-400' },
    'promo.deactivate': { label: 'Promo Deactivated', color: 'text-yellow-400' },
    'settings.update': { label: 'Settings Updated', color: 'text-purple-400' },
};

export default function AuditLogPage() {
    const [entries] = useState<AuditEntry[]>(mockAuditLog);

    const formatTimestamp = (ts: string) => {
        const date = new Date(ts);
        return date.toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Audit Log</h1>
                <p className="text-gray-500 mt-1">Track all administrative actions</p>
            </div>

            {/* Filters */}
            <div className="glass-card p-4">
                <div className="flex flex-wrap gap-4">
                    <input
                        type="text"
                        placeholder="Search actions..."
                        className="input flex-1 min-w-[200px]"
                    />
                    <select className="input w-auto">
                        <option value="">All Actions</option>
                        <option value="tenant">Tenant Actions</option>
                        <option value="promo">Promo Actions</option>
                        <option value="settings">Settings Changes</option>
                    </select>
                    <input type="date" className="input w-auto" />
                </div>
            </div>

            {/* Log Timeline */}
            <div className="glass-card p-6">
                <div className="space-y-6">
                    {entries.map((entry, i) => {
                        const actionInfo = actionLabels[entry.action] || { label: entry.action, color: 'text-gray-400' };

                        return (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex gap-4"
                            >
                                {/* Timeline dot */}
                                <div className="flex flex-col items-center">
                                    <div className="w-3 h-3 rounded-full bg-white/20" />
                                    {i < entries.length - 1 && (
                                        <div className="w-px flex-1 bg-white/10 my-2" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-6">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className={`font-medium ${actionInfo.color}`}>
                                                {actionInfo.label}
                                            </span>
                                            <span className="text-gray-400 mx-2">on</span>
                                            <span className="font-mono text-white">{entry.target}</span>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {formatTimestamp(entry.timestamp)}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        by {entry.actor}
                                    </div>
                                    {entry.details && (
                                        <div className="mt-2 text-sm text-gray-400 bg-white/5 rounded-lg px-3 py-2">
                                            {entry.details}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {entries.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No audit entries found
                    </div>
                )}
            </div>

            {/* Export */}
            <div className="flex justify-end">
                <button className="btn-secondary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                </button>
            </div>
        </div>
    );
}
