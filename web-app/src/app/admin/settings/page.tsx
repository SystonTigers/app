'use client';

import { useState } from 'react';

export default function SettingsPage() {
    const [teamName, setTeamName] = useState('Syston Tigers');
    const [coachName, setCoachName] = useState('John Doe');
    const [leagueLink, setLeagueLink] = useState('https://example.com/league');
    const [socialTwitter, setSocialTwitter] = useState('@systontigers');
    const [socialInsta, setSocialInsta] = useState('@systontigers_official');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        alert('Settings saved! (Mock)');
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Team Settings</h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-2xl">
                <form onSubmit={handleSave} className="space-y-6">

                    {/* Team Details */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-brand">Team Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Name</label>
                                <input
                                    type="text"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Head Coach</label>
                                <input
                                    type="text"
                                    value={coachName}
                                    onChange={(e) => setCoachName(e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-brand">External Links</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Official League Website URL</label>
                                <input
                                    type="url"
                                    value={leagueLink}
                                    onChange={(e) => setLeagueLink(e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Social Media */}
                    <div>
                        <h2 className="text-xl font-semibold mb-4 text-brand">Social Media</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Twitter Handle</label>
                                <input
                                    type="text"
                                    value={socialTwitter}
                                    onChange={(e) => setSocialTwitter(e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instagram Handle</label>
                                <input
                                    type="text"
                                    value={socialInsta}
                                    onChange={(e) => setSocialInsta(e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
