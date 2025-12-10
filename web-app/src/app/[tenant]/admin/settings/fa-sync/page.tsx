'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface FAConfig {
    teamPageUrl?: string;
    snippetUrl?: string;
    teamName: string;
}

interface SyncResult {
    added: number;
    updated: number;
    errors?: string[];
}

export default function FASyncSettingsPage() {
    const params = useParams();
    const tenant = params.tenant as string;

    const [config, setConfig] = useState<FAConfig>({ teamName: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [lastSync, setLastSync] = useState<SyncResult | null>(null);

    // Load config on mount
    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const res = await fetch(`/api/v1/fixtures/fa-config`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-tenant': tenant
                }
            });
            const data = await res.json();
            if (data.success && data.config) {
                setConfig(data.config);
            }
        } catch (error) {
            console.error('Failed to load FA config:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch(`/api/v1/fixtures/fa-config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-tenant': tenant
                },
                body: JSON.stringify(config)
            });
            const data = await res.json();

            if (data.success) {
                setMessage({ type: 'success', text: 'Configuration saved successfully!' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to save' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save configuration' });
        } finally {
            setSaving(false);
        }
    };

    const syncNow = async (source: 'website' | 'snippet' | 'all') => {
        setSyncing(true);
        setMessage(null);
        setLastSync(null);

        try {
            const res = await fetch(`/api/v1/fixtures/sync/${source}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'x-tenant': tenant
                },
                body: JSON.stringify({})
            });
            const data = await res.json();

            if (data.success) {
                setLastSync(data.synced);
                setMessage({
                    type: 'success',
                    text: `Sync complete! Added ${data.synced.added}, updated ${data.synced.updated} fixtures.`
                });
            } else {
                setMessage({ type: 'error', text: data.error || 'Sync failed' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to sync fixtures' });
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
                    <div className="space-y-4">
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    FA Full-Time Integration
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Configure automatic fixture syncing from FA Full-Time website
                </p>
            </div>

            {/* Alert Message */}
            {message && (
                <div className={`mb-6 p-4 rounded-lg ${message.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Configuration Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Configuration
                </h2>

                <div className="space-y-4">
                    {/* Team Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Team Name *
                        </label>
                        <input
                            type="text"
                            value={config.teamName}
                            onChange={(e) => setConfig({ ...config, teamName: e.target.value })}
                            placeholder="e.g., Syston Tigers U16"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                            Your team name as it appears on FA Full-Time
                        </p>
                    </div>

                    {/* Team Page URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            FA Full-Time Team Page URL
                        </label>
                        <input
                            type="url"
                            value={config.teamPageUrl || ''}
                            onChange={(e) => setConfig({ ...config, teamPageUrl: e.target.value })}
                            placeholder="https://fulltime.thefa.com/..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                            The public URL of your team's fixtures page on FA Full-Time
                        </p>
                    </div>

                    {/* Snippet URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            FA Embed/Widget URL (Optional)
                        </label>
                        <input
                            type="url"
                            value={config.snippetUrl || ''}
                            onChange={(e) => setConfig({ ...config, snippetUrl: e.target.value })}
                            placeholder="https://fulltime.thefa.com/fixtures.html?..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                            The embed widget URL if you have one (alternative data source)
                        </p>
                    </div>
                </div>

                {/* Save Button */}
                <div className="mt-6">
                    <button
                        onClick={saveConfig}
                        disabled={saving || !config.teamName}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>

            {/* Manual Sync Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Manual Sync
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Manually sync fixtures from FA Full-Time. Automatic daily sync runs at 6:00 AM.
                </p>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => syncNow('website')}
                        disabled={syncing || !config.teamPageUrl}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {syncing ? 'Syncing...' : 'Sync from Website'}
                    </button>

                    <button
                        onClick={() => syncNow('snippet')}
                        disabled={syncing || !config.snippetUrl}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {syncing ? 'Syncing...' : 'Sync from Widget'}
                    </button>

                    <button
                        onClick={() => syncNow('all')}
                        disabled={syncing || (!config.teamPageUrl && !config.snippetUrl)}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700
                                 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {syncing ? 'Syncing...' : 'Sync All Sources'}
                    </button>
                </div>

                {/* Last Sync Result */}
                {lastSync && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <h3 className="font-medium mb-2">Last Sync Result:</h3>
                        <ul className="text-sm space-y-1">
                            <li>✅ Added: {lastSync.added} fixtures</li>
                            <li>🔄 Updated: {lastSync.updated} fixtures</li>
                            {lastSync.errors && lastSync.errors.length > 0 && (
                                <li className="text-red-600">
                                    ⚠️ Errors: {lastSync.errors.length}
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>

            {/* Email Integration */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Email Integration
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    You can also add fixtures by pasting FA fixture confirmation emails.
                </p>

                <a
                    href={`/${tenant}/admin/fixtures/import`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600
                             text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700
                             transition-colors"
                >
                    Go to Fixture Import →
                </a>
            </div>

            {/* Help Section */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                    How to find your FA Full-Time URL:
                </h3>
                <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://fulltime.thefa.com" target="_blank" rel="noopener" className="underline">fulltime.thefa.com</a></li>
                    <li>Search for your team name</li>
                    <li>Navigate to your team's fixtures page</li>
                    <li>Copy the URL from your browser's address bar</li>
                    <li>Paste it in the "Team Page URL" field above</li>
                </ol>
            </div>
        </div>
    );
}
