'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface FeatureFlag {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    scope: 'global' | 'per-tenant';
}

const defaultFlags: FeatureFlag[] = [
    { id: 'live-match', name: 'Live Match Console', description: 'Real-time match tracking', enabled: true, scope: 'per-tenant' },
    { id: 'ai-coaching', name: 'AI Coaching', description: 'AI-powered tactical insights', enabled: true, scope: 'per-tenant' },
    { id: 'video-analysis', name: 'Video Analysis', description: 'Advanced video processing', enabled: false, scope: 'per-tenant' },
    { id: 'shop', name: 'Merchandise Shop', description: 'Team merchandise store', enabled: true, scope: 'per-tenant' },
    { id: 'gamification', name: 'Gamification', description: 'Achievements and leaderboards', enabled: false, scope: 'global' },
];

export default function SettingsPage() {
    const [flags, setFlags] = useState<FeatureFlag[]>(defaultFlags);
    const [platformEmail, setPlatformEmail] = useState('');

    const toggleFlag = (id: string) => {
        setFlags((prev) =>
            prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
        );
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-gray-500 mt-1">Platform configuration and feature flags</p>
            </div>

            {/* Feature Flags */}
            <div className="glass-card">
                <div className="p-4 border-b border-white/10">
                    <h2 className="font-semibold text-white">Feature Flags</h2>
                    <p className="text-sm text-gray-500">Enable or disable features across the platform</p>
                </div>
                <div className="divide-y divide-white/5">
                    {flags.map((flag, i) => (
                        <motion.div
                            key={flag.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-4 flex items-center justify-between hover:bg-white/5"
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{flag.name}</span>
                                    <span className={`badge text-xs ${flag.scope === 'global' ? 'badge-info' : 'badge-neutral'}`}>
                                        {flag.scope}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">{flag.description}</p>
                            </div>
                            <button
                                onClick={() => toggleFlag(flag.id)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${flag.enabled ? 'bg-primary-500' : 'bg-white/10'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${flag.enabled ? 'left-7' : 'left-1'
                                        }`}
                                />
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Email Announcements */}
            <div className="glass-card p-6">
                <h2 className="font-semibold text-white mb-4">Email Announcements</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Send announcements to all tenant administrators
                </p>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Subject</label>
                        <input type="text" className="input" placeholder="Important Update" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Message</label>
                        <textarea
                            className="input min-h-[120px] resize-none"
                            placeholder="Write your announcement..."
                        />
                    </div>
                    <button className="btn-primary">Send to All Tenants</button>
                </div>
            </div>

            {/* Platform Config */}
            <div className="glass-card p-6">
                <h2 className="font-semibold text-white mb-4">Platform Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Support Email</label>
                        <input
                            type="email"
                            className="input"
                            value={platformEmail}
                            onChange={(e) => setPlatformEmail(e.target.value)}
                            placeholder="support@platform.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Default Trial Days</label>
                        <input type="number" className="input" defaultValue={14} />
                    </div>
                </div>
                <button className="btn-secondary mt-4">Save Changes</button>
            </div>
        </div>
    );
}
