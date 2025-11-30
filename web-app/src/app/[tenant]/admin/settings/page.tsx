'use client';

import { use, useState } from 'react';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

interface FixtureSettings {
    autoImport: boolean;
    importSource: string;
    defaultVenue: string;
    notifyOnNewFixture: boolean;
}

export default function FixtureSettingsPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [settings, setSettings] = useState<FixtureSettings>({
        autoImport: false,
        importSource: 'fa-fulltime',
        defaultVenue: '',
        notifyOnNewFixture: true,
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/v1/settings/fixtures`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(settings),
            });
            alert('Settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-6 rounded-lg">
                <h2 className="text-2xl font-bold">Fixture Settings</h2>
                <p className="text-sm opacity-90">Configure fixture auto-import and defaults</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-6">
                {/* Auto Import */}
                <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.autoImport}
                            onChange={(e) => setSettings({ ...settings, autoImport: e.target.checked })}
                            className="w-5 h-5 rounded"
                        />
                        <div>
                            <span className="font-semibold text-lg">Enable Auto-Import</span>
                            <p className="text-sm text-gray-500">Automatically import fixtures from external source</p>
                        </div>
                    </label>
                </div>

                {/* Import Source */}
                {settings.autoImport && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Import Source</label>
                        <select
                            value={settings.importSource}
                            onChange={(e) => setSettings({ ...settings, importSource: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand dark:bg-gray-700"
                        >
                            <option value="fa-fulltime">FA Full-Time</option>
                            <option value="league-website">League Website</option>
                            <option value="manual">Manual Entry</option>
                        </select>
                    </div>
                )}

                {/* Default Venue */}
                <div>
                    <label className="block text-sm font-medium mb-2">Default Venue</label>
                    <input
                        type="text"
                        value={settings.defaultVenue}
                        onChange={(e) => setSettings({ ...settings, defaultVenue: e.target.value })}
                        placeholder="e.g., Home Ground"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand dark:bg-gray-700"
                    />
                </div>

                {/* Notifications */}
                <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.notifyOnNewFixture}
                            onChange={(e) => setSettings({ ...settings, notifyOnNewFixture: e.target.checked })}
                            className="w-5 h-5 rounded"
                        />
                        <div>
                            <span className="font-semibold">Notify on New Fixture</span>
                            <p className="text-sm text-gray-500">Send notifications when new fixtures are imported</p>
                        </div>
                    </label>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 font-semibold"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                <h3 className="font-bold mb-2">🔍 About Auto-Import</h3>
                <p className="text-sm">
                    When enabled, the system will automatically check for new fixtures from your selected source.
                    This saves time by eliminating manual data entry for league fixtures.
                </p>
            </div>
        </div>
    );
}
