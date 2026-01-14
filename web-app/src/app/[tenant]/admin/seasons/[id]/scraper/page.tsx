'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ScraperConfig {
    id: string;
    season_id: string;
    fa_team_page_url: string | null;
    fa_snippet_url: string | null;
    team_name: string;
    last_scraped_at: number | null;
    last_scrape_result: string | null;
    is_active: number;
    season_name?: string;
}

export default function ScraperConfigPage() {
    const params = useParams();
    const router = useRouter();
    const tenant = params.tenant as string;
    const seasonId = params.id as string;

    const [config, setConfig] = useState<ScraperConfig | null>(null);
    const [formData, setFormData] = useState({
        faTeamPageUrl: '',
        faSnippetUrl: '',
        teamName: '',
        isActive: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);

    useEffect(() => {
        fetchConfig();
    }, [seasonId]);

    const fetchConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/scraper/configs/${seasonId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success && data.data) {
                setConfig(data.data);
                setFormData({
                    faTeamPageUrl: data.data.fa_team_page_url || '',
                    faSnippetUrl: data.data.fa_snippet_url || '',
                    teamName: data.data.team_name || '',
                    isActive: data.data.is_active === 1
                });
            }
        } catch (err) {
            console.error('Failed to fetch config:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/scraper/configs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    seasonId,
                    ...formData
                })
            });
            const data = await res.json();

            if (data.success) {
                alert('Scraper configuration saved successfully!');
                fetchConfig();
            } else {
                alert(data.error || 'Failed to save configuration');
            }
        } catch (err) {
            console.error('Failed to save config:', err);
            alert('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleTestScrape = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/scraper/run/${seasonId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setTestResult(data);

            if (data.success) {
                alert(`Scrape successful! Added: ${data.added}, Updated: ${data.updated}, Total Fixtures: ${data.fixtures}`);
                fetchConfig();
            } else {
                alert(data.error || 'Scrape failed');
            }
        } catch (err) {
            console.error('Failed to run scraper:', err);
            alert('Failed to run scraper');
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-lg">Loading configuration...</div>
            </div>
        );
    }

    const lastScraped = config?.last_scraped_at
        ? new Date(config.last_scraped_at).toLocaleString()
        : 'Never';

    const scrapeResult = config?.last_scrape_result
        ? JSON.parse(config.last_scrape_result)
        : null;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <button
                    onClick={() => router.push(`/${tenant}/admin/seasons`)}
                    className="text-blue-600 hover:underline mb-4"
                >
                    ← Back to Seasons
                </button>
                <h1 className="text-3xl font-bold">FA Scraper Configuration</h1>
                <p className="text-gray-600 mt-2">
                    Configure FA Full-Time scraper for {config?.season_name || 'this season'}
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        FA Full-Time Team Page URL
                    </label>
                    <input
                        type="url"
                        placeholder="https://fulltime.thefa.com/..."
                        value={formData.faTeamPageUrl}
                        onChange={(e) => setFormData({ ...formData, faTeamPageUrl: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        The main team page URL from FA Full-Time website
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        FA Snippet URL (Optional)
                    </label>
                    <input
                        type="url"
                        placeholder="https://fulltime.thefa.com/snippet/..."
                        value={formData.faSnippetUrl}
                        onChange={(e) => setFormData({ ...formData, faSnippetUrl: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Optional embed snippet URL if available
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        Team Name
                    </label>
                    <input
                        type="text"
                        placeholder="e.g., Syston Tigers"
                        value={formData.teamName}
                        onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Your team name as it appears in FA fixtures (for matching)
                    </p>
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="mr-2 w-4 h-4"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium">
                        Enable automatic scraping (CRON job)
                    </label>
                </div>

                <div className="flex gap-3 pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving || !formData.teamName}
                        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                    <button
                        onClick={handleTestScrape}
                        disabled={testing || !config}
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                        {testing ? 'Running...' : '▶ Run Scraper Now'}
                    </button>
                </div>

                {/* Status Section */}
                <div className="mt-8 pt-6 border-t">
                    <h3 className="font-semibold text-lg mb-4">Scraper Status</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Last Scraped</p>
                            <p className="font-semibold">{lastScraped}</p>
                        </div>

                        {scrapeResult && (
                            <>
                                <div>
                                    <p className="text-sm text-gray-600">Added</p>
                                    <p className="font-semibold text-green-600">{scrapeResult.added || 0}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Updated</p>
                                    <p className="font-semibold text-blue-600">{scrapeResult.updated || 0}</p>
                                </div>
                                {scrapeResult.errors && scrapeResult.errors.length > 0 && (
                                    <div className="col-span-2">
                                        <p className="text-sm text-gray-600">Errors</p>
                                        <ul className="text-sm text-red-600 list-disc list-inside">
                                            {scrapeResult.errors.map((err: string, idx: number) => (
                                                <li key={idx}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Test Result Display */}
                {testResult && (
                    <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <h4 className="font-semibold mb-2">
                            {testResult.success ? '✅ Scrape Successful' : '❌ Scrape Failed'}
                        </h4>
                        <pre className="text-xs overflow-auto">
                            {JSON.stringify(testResult, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            {/* Help Section */}
            <div className="mt-8 bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">How to find  your FA URLs</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Go to <a href="https://fulltime.thefa.com" target="_blank" className="text-blue-600 hover:underline">fulltime.thefa.com</a></li>
                    <li>Search for your team name</li>
                    <li>Click on "Fixtures" tab</li>
                    <li>Copy the URL from your browser address bar</li>
                    <li>Paste it into the "Team Page URL" field above</li>
                </ol>
            </div>
        </div>
    );
}
