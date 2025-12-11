'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface NotificationSetting {
    id: string;
    name: string;
    description: string;
    channels: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
}

interface RecentNotification {
    id: string;
    type: string;
    message: string;
    channel: 'email' | 'push' | 'sms';
    sentAt: string;
    status: 'sent' | 'failed' | 'pending';
}

const defaultSettings: NotificationSetting[] = [
    {
        id: 'new-signup',
        name: 'New Tenant Signup',
        description: 'When a new tenant completes registration',
        channels: { email: true, push: true, sms: false },
    },
    {
        id: 'upgrade',
        name: 'Plan Upgrade',
        description: 'When a tenant upgrades from Starter to Pro',
        channels: { email: true, push: true, sms: false },
    },
    {
        id: 'downgrade',
        name: 'Plan Downgrade',
        description: 'When a tenant downgrades their plan',
        channels: { email: true, push: false, sms: false },
    },
    {
        id: 'cancellation',
        name: 'Subscription Cancelled',
        description: 'When a tenant cancels their subscription',
        channels: { email: true, push: true, sms: true },
    },
    {
        id: 'payment-failed',
        name: 'Payment Failed',
        description: 'When a payment fails for any tenant',
        channels: { email: true, push: true, sms: false },
    },
    {
        id: 'health-alert',
        name: 'System Health Alert',
        description: 'When a service becomes degraded or down',
        channels: { email: true, push: true, sms: true },
    },
];

const recentNotifications: RecentNotification[] = [
    {
        id: '1',
        type: 'New Tenant Signup',
        message: 'Springfield FC just signed up (Pro plan)',
        channel: 'push',
        sentAt: '2024-12-10T15:30:00Z',
        status: 'sent',
    },
    {
        id: '2',
        type: 'Plan Upgrade',
        message: 'Leicester Youth upgraded to Pro',
        channel: 'email',
        sentAt: '2024-12-10T14:00:00Z',
        status: 'sent',
    },
    {
        id: '3',
        type: 'Health Alert',
        message: 'API latency increased to 250ms',
        channel: 'push',
        sentAt: '2024-12-10T12:15:00Z',
        status: 'sent',
    },
];

export default function NotificationsPage() {
    const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);
    const [phoneNumber, setPhoneNumber] = useState('+44');
    const [pushEnabled, setPushEnabled] = useState(true);
    const [saving, setSaving] = useState(false);

    const toggleChannel = (settingId: string, channel: 'email' | 'push' | 'sms') => {
        setSettings(prev =>
            prev.map(s =>
                s.id === settingId
                    ? { ...s, channels: { ...s.channels, [channel]: !s.channels[channel] } }
                    : s
            )
        );
    };

    const handleSave = async () => {
        setSaving(true);
        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
        alert('Notification settings saved!');
    };

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'email':
                return (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                );
            case 'push':
                return (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                );
            case 'sms':
                return (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                );
        }
    };

    return (
        <div className="space-y-6 animate-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Notifications</h1>
                <p className="text-gray-500 mt-1">Configure how you receive alerts</p>
            </div>

            {/* Mobile Push Setup */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Push Notifications</h3>
                            <p className="text-sm text-gray-500">Receive instant alerts on your phone</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setPushEnabled(!pushEnabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${pushEnabled ? 'bg-primary-500' : 'bg-white/10'
                            }`}
                    >
                        <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${pushEnabled ? 'left-7' : 'left-1'
                                }`}
                        />
                    </button>
                </div>

                {pushEnabled && (
                    <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-sm text-gray-400 mb-3">
                            To enable push notifications, scan this QR code with your phone's camera:
                        </p>
                        <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center mx-auto">
                            <div className="text-gray-400 text-xs text-center p-2">
                                [QR Code]<br />
                                <span className="text-[10px]">Scan to link device</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-3">
                            Or enter code: <span className="font-mono text-primary-400">OWNER-2024</span>
                        </p>
                    </div>
                )}
            </div>

            {/* SMS Setup */}
            <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-4">SMS Notifications</h3>
                <div className="flex gap-3">
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="input flex-1"
                        placeholder="+44 7XXX XXXXXX"
                    />
                    <button className="btn-secondary">Verify</button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    SMS notifications are only for critical alerts
                </p>
            </div>

            {/* Notification Settings */}
            <div className="glass-card">
                <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold text-white">Alert Types</h3>
                    <p className="text-sm text-gray-500">Choose how to be notified for each event</p>
                </div>
                <div className="divide-y divide-white/5">
                    {settings.map((setting, i) => (
                        <motion.div
                            key={setting.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="p-4 flex items-center justify-between"
                        >
                            <div className="flex-1">
                                <div className="font-medium text-white">{setting.name}</div>
                                <p className="text-sm text-gray-500">{setting.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {(['email', 'push', 'sms'] as const).map(channel => (
                                    <button
                                        key={channel}
                                        onClick={() => toggleChannel(setting.id, channel)}
                                        className={`p-2 rounded-lg transition-colors ${setting.channels[channel]
                                                ? 'bg-primary-500/30 text-primary-400'
                                                : 'bg-white/5 text-gray-600 hover:text-gray-400'
                                            }`}
                                        title={channel.charAt(0).toUpperCase() + channel.slice(1)}
                                    >
                                        {getChannelIcon(channel)}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
                <div className="p-4 border-t border-white/10">
                    <button onClick={handleSave} disabled={saving} className="btn-primary">
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>

            {/* Recent Notifications */}
            <div className="glass-card">
                <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold text-white">Recent Alerts</h3>
                </div>
                <div className="divide-y divide-white/5">
                    {recentNotifications.map((notif, i) => (
                        <motion.div
                            key={notif.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 + i * 0.05 }}
                            className="p-4 flex items-center gap-4"
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${notif.channel === 'email' ? 'bg-blue-500/20 text-blue-400' :
                                    notif.channel === 'push' ? 'bg-green-500/20 text-green-400' :
                                        'bg-purple-500/20 text-purple-400'
                                }`}>
                                {getChannelIcon(notif.channel)}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-white">{notif.message}</div>
                                <div className="text-xs text-gray-500">
                                    {notif.type} · {new Date(notif.sentAt).toLocaleString()}
                                </div>
                            </div>
                            <span className={`badge ${notif.status === 'sent' ? 'badge-success' : 'badge-warning'}`}>
                                {notif.status}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
