'use client';

import { useState, useEffect } from 'react';

interface FeatureFlag {
    key: string;
    name: string;
    description: string;
    category: 'content' | 'social' | 'notifications';
    enabled: boolean;
}

const defaultFeatures: FeatureFlag[] = [
    { key: 'auto_birthdays', name: 'Birthday Posts', description: 'Auto-post happy birthday messages for players', category: 'content', enabled: true },
    { key: 'auto_quotes', name: 'Daily Quotes', description: 'Post motivational quotes each morning', category: 'content', enabled: false },
    { key: 'auto_countdowns', name: 'Match Countdowns', description: 'Post countdown reminders before matches', category: 'content', enabled: true },
    { key: 'auto_throwbacks', name: 'Throwback Thursday', description: 'Post historical match memories on Thursdays', category: 'content', enabled: false },
    { key: 'auto_throwback_photos', name: 'Photo Throwbacks', description: 'Post old team photos on Throwback Thursday', category: 'content', enabled: true },
    { key: 'auto_milestones', name: 'Player Milestones', description: 'Celebrate when players reach goal/appearance milestones', category: 'content', enabled: true },
    { key: 'auto_player_of_week', name: 'Player of the Week', description: 'Recognize top performer every Sunday', category: 'content', enabled: true },
    { key: 'auto_player_of_month', name: 'Player of the Month', description: 'Recognize top performer on the 1st of each month', category: 'content', enabled: true },
    { key: 'auto_league_updates', name: 'League Position Updates', description: 'Post when league table position changes', category: 'content', enabled: false },
];

export default function FeaturesPage({ params }: { params: { tenant: string } }) {
    const [features, setFeatures] = useState<FeatureFlag[]>(defaultFeatures);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const res = await fetch(`/api/v1/config`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();

            if (data.success && data.config) {
                // Merge saved config with defaults
                const savedFeatures = data.config.features || {};
                setFeatures(prev => prev.map(f => ({
                    ...f,
                    enabled: savedFeatures[f.key] ?? f.enabled
                })));
                setWebhookUrl(data.config.webhook_url || '');
            }
        } catch (err) {
            console.error('Failed to load config', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFeature = (key: string) => {
        setFeatures(prev => prev.map(f =>
            f.key === key ? { ...f, enabled: !f.enabled } : f
        ));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);

        try {
            const featureConfig: Record<string, boolean> = {};
            features.forEach(f => {
                featureConfig[f.key] = f.enabled;
            });

            await fetch(`/api/v1/config`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    features: featureConfig,
                    webhook_url: webhookUrl
                })
            });

            setSaved(true);
        } catch (err) {
            console.error('Failed to save config', err);
        } finally {
            setSaving(false);
        }
    };

    const categories = [
        { key: 'content', label: 'Auto-Generated Content', icon: '📝' }
    ];

    if (loading) {
        return (
            <div className="container mx-auto py-8 px-4">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Feature Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
                Control which automated features are active for your club
            </p>

            {/* Webhook Configuration */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-lg font-bold mb-4">📡 Webhook Configuration</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Auto-generated posts will be sent to this Make.com webhook URL for social media distribution.
                </p>
                <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => { setWebhookUrl(e.target.value); setSaved(false); }}
                    placeholder="https://hook.make.com/your-webhook-id"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-brand focus:border-transparent"
                />
            </div>

            {/* Feature Toggles */}
            {categories.map(category => (
                <div key={category.key} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <h2 className="text-lg font-bold mb-4">
                        {category.icon} {category.label}
                    </h2>
                    <div className="space-y-4">
                        {features
                            .filter(f => f.category === category.key)
                            .map(feature => (
                                <div
                                    key={feature.key}
                                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium">{feature.name}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {feature.description}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleFeature(feature.key)}
                                        className={`relative w-14 h-8 rounded-full transition-colors ${feature.enabled
                                                ? 'bg-brand'
                                                : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                    >
                                        <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${feature.enabled ? 'left-7' : 'left-1'
                                            }`} />
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>
            ))}

            {/* Save Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-brand text-white py-3 px-8 rounded-xl font-bold hover:bg-brand/90 disabled:opacity-50 transition-all"
                >
                    {saving ? '⏳ Saving...' : 'Save Settings'}
                </button>
                {saved && (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                        ✅ Saved successfully
                    </span>
                )}
            </div>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <h3 className="font-bold text-blue-700 dark:text-blue-400 mb-2">ℹ️ How Auto-Posts Work</h3>
                <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
                    <li>• Enabled features run automatically on scheduled times</li>
                    <li>• Posts are sent to your webhook for social media distribution via Make.com</li>
                    <li>• Birthdays require DOB to be set for each player</li>
                    <li>• Photo throwbacks require photos in the gallery from previous years</li>
                    <li>• Milestones are tracked based on match event data</li>
                </ul>
            </div>
        </div>
    );
}
