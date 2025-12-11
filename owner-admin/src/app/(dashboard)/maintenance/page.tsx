'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface MaintenanceWindow {
    id: string;
    title: string;
    description: string;
    start: string;
    end: string;
    status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    affectedServices: string[];
    notifyTenants: boolean;
}

const mockWindows: MaintenanceWindow[] = [
    {
        id: '1',
        title: 'Database Migration',
        description: 'Upgrading D1 database schema for performance improvements',
        start: '2024-12-15T02:00:00Z',
        end: '2024-12-15T04:00:00Z',
        status: 'scheduled',
        affectedServices: ['Database', 'API'],
        notifyTenants: true,
    },
];

export default function MaintenancePage() {
    const [windows, setWindows] = useState<MaintenanceWindow[]>(mockWindows);
    const [showCreate, setShowCreate] = useState(false);
    const [newWindow, setNewWindow] = useState({
        title: '',
        description: '',
        start: '',
        end: '',
        affectedServices: [] as string[],
        notifyTenants: true,
    });

    const serviceOptions = ['API', 'Database', 'KV Storage', 'Queue', 'Email', 'All Services'];

    const handleCreate = () => {
        const window: MaintenanceWindow = {
            id: Date.now().toString(),
            ...newWindow,
            status: 'scheduled',
        };
        setWindows([window, ...windows]);
        setShowCreate(false);
        setNewWindow({
            title: '',
            description: '',
            start: '',
            end: '',
            affectedServices: [],
            notifyTenants: true,
        });
    };

    const toggleService = (service: string) => {
        setNewWindow(prev => ({
            ...prev,
            affectedServices: prev.affectedServices.includes(service)
                ? prev.affectedServices.filter(s => s !== service)
                : [...prev.affectedServices, service],
        }));
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            scheduled: 'badge-info',
            'in-progress': 'badge-warning',
            completed: 'badge-success',
            cancelled: 'badge-neutral',
        };
        return styles[status] || 'badge-neutral';
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Scheduled Maintenance</h1>
                    <p className="text-gray-500 mt-1">Plan and manage maintenance windows</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Schedule Maintenance
                </button>
            </div>

            {/* Active Maintenance Alert */}
            {windows.some(w => w.status === 'in-progress') && (
                <div className="glass-card p-4 border-l-4 border-yellow-500 bg-yellow-500/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center animate-pulse">
                            <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-medium text-yellow-400">Maintenance In Progress</p>
                            <p className="text-sm text-gray-400">Some services may be temporarily unavailable</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
                    >
                        <h2 className="text-xl font-bold text-white mb-4">Schedule Maintenance</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={newWindow.title}
                                    onChange={(e) => setNewWindow({ ...newWindow, title: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Database Upgrade"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={newWindow.description}
                                    onChange={(e) => setNewWindow({ ...newWindow, description: e.target.value })}
                                    className="input min-h-[80px] resize-none"
                                    placeholder="Describe what will be done..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        value={newWindow.start}
                                        onChange={(e) => setNewWindow({ ...newWindow, start: e.target.value })}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">End Time</label>
                                    <input
                                        type="datetime-local"
                                        value={newWindow.end}
                                        onChange={(e) => setNewWindow({ ...newWindow, end: e.target.value })}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Affected Services</label>
                                <div className="flex flex-wrap gap-2">
                                    {serviceOptions.map(service => (
                                        <button
                                            key={service}
                                            type="button"
                                            onClick={() => toggleService(service)}
                                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${newWindow.affectedServices.includes(service)
                                                    ? 'bg-primary-500/30 text-primary-300 border border-primary-500/50'
                                                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            {service}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="notify"
                                    checked={newWindow.notifyTenants}
                                    onChange={(e) => setNewWindow({ ...newWindow, notifyTenants: e.target.checked })}
                                    className="w-4 h-4 rounded border-white/20 bg-white/5"
                                />
                                <label htmlFor="notify" className="text-sm text-gray-300">
                                    Notify all tenants via email
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!newWindow.title || !newWindow.start || !newWindow.end}
                                    className="btn-primary flex-1"
                                >
                                    Schedule
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Maintenance Windows */}
            <div className="space-y-4">
                {windows.map((window, i) => (
                    <motion.div
                        key={window.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass-card p-5"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h3 className="font-semibold text-white">{window.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">{window.description}</p>
                            </div>
                            <span className={getStatusBadge(window.status)}>{window.status}</span>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDateTime(window.start)} → {formatDateTime(window.end)}
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                                </svg>
                                {window.affectedServices.join(', ')}
                            </div>
                            {window.notifyTenants && (
                                <div className="flex items-center gap-2 text-primary-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Tenants notified
                                </div>
                            )}
                        </div>

                        {window.status === 'scheduled' && (
                            <div className="flex gap-2 mt-4">
                                <button className="btn-primary text-sm py-1.5">Start Now</button>
                                <button className="btn-danger text-sm py-1.5">Cancel</button>
                            </div>
                        )}
                    </motion.div>
                ))}

                {windows.length === 0 && (
                    <div className="glass-card p-12 text-center">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-500">No maintenance scheduled</p>
                        <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
                            Schedule First Maintenance
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
