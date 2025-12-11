'use client';

import { useState, useEffect } from 'react';

type TabType = 'team' | 'calendar' | 'fa' | 'social' | 'users' | 'integrations' | 'branding';

interface UserRole {
    id: string;
    name: string;
    email: string;
    role: 'manager' | 'coach' | 'parent' | 'player' | 'fan';
    status: 'active' | 'pending' | 'inactive';
}

interface CoachCode {
    id: string;
    code: string;
    label: string;
}

const mockUsers: UserRole[] = [
    { id: '1', name: 'John Smith', email: 'john@example.com', role: 'manager', status: 'active' },
    { id: '2', name: 'Sarah Connor', email: 'sarah@example.com', role: 'coach', status: 'active' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'parent', status: 'active' },
    { id: '4', name: 'Tom Player', email: 'tom@example.com', role: 'player', status: 'pending' },
    { id: '5', name: 'Fan Account', email: 'fan@example.com', role: 'fan', status: 'active' },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('team');
    const [saving, setSaving] = useState(false);

    // Team Access Codes
    const [fanCode, setFanCode] = useState<string>('');
    const [fanCodeLoading, setFanCodeLoading] = useState(true);
    const [fanCodeCopied, setFanCodeCopied] = useState(false);
    const [coachCodes, setCoachCodes] = useState<CoachCode[]>([]);
    const [generatingCoachCode, setGeneratingCoachCode] = useState(false);
    const [newCoachCode, setNewCoachCode] = useState<string | null>(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787';

    // Team Details
    const [teamName, setTeamName] = useState('Syston Tigers');
    const [teamSlug, setTeamSlug] = useState('syston-tigers');
    const [teamEmail, setTeamEmail] = useState('info@systontigers.com');
    const [teamPhone, setTeamPhone] = useState('');
    const [teamAddress, setTeamAddress] = useState('');
    const [teamDescription, setTeamDescription] = useState('');

    // Calendar Integration
    const [calendarType, setCalendarType] = useState<'google' | 'outlook' | 'apple' | 'none'>('none');
    const [calendarId, setCalendarId] = useState('');
    const [calendarApiKey, setCalendarApiKey] = useState('');
    const [syncEnabled, setSyncEnabled] = useState(false);

    // FA Integration
    const [faClubId, setFaClubId] = useState('');
    const [faLeagueUrl, setFaLeagueUrl] = useState('');
    const [faFullTimeUrl, setFaFullTimeUrl] = useState('');
    const [faCupUrl, setFaCupUrl] = useState('');
    const [faApiKey, setFaApiKey] = useState('');

    // Social Media
    const [twitterHandle, setTwitterHandle] = useState('');
    const [twitterApiKey, setTwitterApiKey] = useState('');
    const [instagramHandle, setInstagramHandle] = useState('');
    const [instagramToken, setInstagramToken] = useState('');
    const [facebookPage, setFacebookPage] = useState('');
    const [facebookToken, setFacebookToken] = useState('');
    const [youtubeChannel, setYoutubeChannel] = useState('');
    const [tiktokHandle, setTiktokHandle] = useState('');

    // Branding
    const [primaryColor, setPrimaryColor] = useState('#000000');
    const [secondaryColor, setSecondaryColor] = useState('#FFCC00');
    const [logoUrl, setLogoUrl] = useState('');
    const [faviconUrl, setFaviconUrl] = useState('');

    // Users
    const [users, setUsers] = useState<UserRole[]>(mockUsers);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole['role']>('parent');

    const handleSave = async () => {
        setSaving(true);
        // Simulate save
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
        alert('Settings saved successfully!');
    };

    const handleInviteUser = () => {
        if (!inviteEmail) return;
        const newUser: UserRole = {
            id: Date.now().toString(),
            name: inviteEmail.split('@')[0],
            email: inviteEmail,
            role: inviteRole,
            status: 'pending',
        };
        setUsers([...users, newUser]);
        setInviteEmail('');
    };

    // Fetch fan code on mount
    useEffect(() => {
        async function fetchFanCode() {
            try {
                const token = localStorage.getItem('admin_token');
                const res = await fetch(`${API_BASE}/api/v1/codes/fan`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setFanCode(data.code || '');
                }
            } catch (err) {
                console.error('Failed to fetch fan code', err);
            } finally {
                setFanCodeLoading(false);
            }
        }
        fetchFanCode();
    }, [API_BASE]);

    // Copy fan code to clipboard
    const handleCopyFanCode = async () => {
        try {
            await navigator.clipboard.writeText(fanCode);
            setFanCodeCopied(true);
            setTimeout(() => setFanCodeCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    // Generate a new coach code
    const handleGenerateCoachCode = async () => {
        setGeneratingCoachCode(true);
        setNewCoachCode(null);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_BASE}/api/v1/codes/coach`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ label: 'Coach' })
            });
            if (res.ok) {
                const data = await res.json();
                setNewCoachCode(data.code);
                setCoachCodes(prev => [...prev, { id: data.id, code: data.code, label: 'Coach' }]);
            } else {
                alert('Failed to generate coach code');
            }
        } catch (err) {
            console.error('Failed to generate coach code', err);
            alert('Failed to generate coach code');
        } finally {
            setGeneratingCoachCode(false);
        }
    };

    // Copy coach code to clipboard
    const handleCopyCoachCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            alert('Code copied!');
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'team', label: 'Team Details', icon: <TeamIcon /> },
        { id: 'calendar', label: 'Calendar', icon: <CalendarIcon /> },
        { id: 'fa', label: 'FA Integration', icon: <FaIcon /> },
        { id: 'social', label: 'Social Media', icon: <SocialIcon /> },
        { id: 'users', label: 'User Roles', icon: <UsersIcon /> },
        { id: 'integrations', label: 'Integrations', icon: <IntegrationsIcon /> },
        { id: 'branding', label: 'Branding', icon: <BrandingIcon /> },
    ];

    const roleColors: Record<string, string> = {
        manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        coach: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        parent: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        player: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        fan: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    };

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Setup</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Configure all integrations and settings for your team</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-black text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Save All Changes'
                    )}
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Tabs */}
                <div className="lg:w-64 flex-shrink-0">
                    <nav className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${activeTab === tab.id
                                    ? 'bg-black text-white'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {tab.icon}
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        {/* Team Details Tab */}
                        {activeTab === 'team' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">Team Details</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputField label="Team Name" value={teamName} onChange={setTeamName} />
                                    <InputField label="Team Slug" value={teamSlug} onChange={setTeamSlug} placeholder="your-team-name" />
                                    <InputField label="Contact Email" type="email" value={teamEmail} onChange={setTeamEmail} />
                                    <InputField label="Contact Phone" type="tel" value={teamPhone} onChange={setTeamPhone} />
                                </div>
                                <InputField label="Address" value={teamAddress} onChange={setTeamAddress} placeholder="Training ground address..." />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                    <textarea
                                        value={teamDescription}
                                        onChange={(e) => setTeamDescription(e.target.value)}
                                        rows={4}
                                        className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="About your team..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Calendar Tab */}
                        {activeTab === 'calendar' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">Calendar Integration</h2>
                                <p className="text-gray-600 dark:text-gray-400">Connect your team calendar for automatic fixture syncing.</p>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Calendar Provider</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {(['google', 'outlook', 'apple', 'none'] as const).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setCalendarType(type)}
                                                className={`p-4 rounded-lg border-2 text-center transition-all ${calendarType === type
                                                    ? 'border-black bg-black/5 dark:border-white dark:bg-white/5'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                                                    }`}
                                            >
                                                <div className="font-medium capitalize">{type === 'none' ? 'None' : type}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {calendarType !== 'none' && (
                                    <>
                                        <InputField
                                            label="Calendar ID"
                                            value={calendarId}
                                            onChange={setCalendarId}
                                            placeholder={`Your ${calendarType} calendar ID`}
                                        />
                                        <InputField
                                            label="API Key / Auth Token"
                                            type="password"
                                            value={calendarApiKey}
                                            onChange={setCalendarApiKey}
                                        />
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="syncEnabled"
                                                checked={syncEnabled}
                                                onChange={(e) => setSyncEnabled(e.target.checked)}
                                                className="w-5 h-5 rounded"
                                            />
                                            <label htmlFor="syncEnabled" className="text-gray-700 dark:text-gray-300">
                                                Enable automatic sync (fixtures, training sessions)
                                            </label>
                                        </div>
                                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                            Test Connection
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* FA Integration Tab */}
                        {activeTab === 'fa' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">FA Integration</h2>
                                <p className="text-gray-600 dark:text-gray-400">Link to your FA Full-Time pages to auto-import fixtures, results, and league tables.</p>

                                <InputField label="FA Club ID" value={faClubId} onChange={setFaClubId} placeholder="e.g., 123456" />
                                <InputField label="FA Full-Time URL" type="url" value={faFullTimeUrl} onChange={setFaFullTimeUrl} placeholder="https://fulltime.thefa.com/..." />
                                <InputField label="League Table URL" type="url" value={faLeagueUrl} onChange={setFaLeagueUrl} placeholder="https://fulltime.thefa.com/league/..." />
                                <InputField label="Cup Competition URL" type="url" value={faCupUrl} onChange={setFaCupUrl} placeholder="https://fulltime.thefa.com/cup/..." />
                                <InputField label="FA API Key (if available)" type="password" value={faApiKey} onChange={setFaApiKey} />

                                <div className="flex gap-3">
                                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                        Sync Fixtures Now
                                    </button>
                                    <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">
                                        Import League Table
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Social Media Tab */}
                        {activeTab === 'social' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">Social Media</h2>
                                <p className="text-gray-600 dark:text-gray-400">Connect your social media accounts to auto-post updates and display feeds.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4 p-4 border rounded-lg dark:border-gray-700">
                                        <div className="flex items-center gap-2">
                                            <XIcon />
                                            <span className="font-semibold">X (Twitter)</span>
                                        </div>
                                        <InputField label="Handle" value={twitterHandle} onChange={setTwitterHandle} placeholder="@yourteam" />
                                        <InputField label="API Key" type="password" value={twitterApiKey} onChange={setTwitterApiKey} />
                                        <button className="text-sm text-blue-600 hover:underline">Connect with OAuth</button>
                                    </div>

                                    <div className="space-y-4 p-4 border rounded-lg dark:border-gray-700">
                                        <div className="flex items-center gap-2">
                                            <InstagramIcon />
                                            <span className="font-semibold">Instagram</span>
                                        </div>
                                        <InputField label="Handle" value={instagramHandle} onChange={setInstagramHandle} placeholder="@yourteam" />
                                        <InputField label="Access Token" type="password" value={instagramToken} onChange={setInstagramToken} />
                                        <button className="text-sm text-blue-600 hover:underline">Connect with Meta</button>
                                    </div>

                                    <div className="space-y-4 p-4 border rounded-lg dark:border-gray-700">
                                        <div className="flex items-center gap-2">
                                            <FacebookIcon />
                                            <span className="font-semibold">Facebook</span>
                                        </div>
                                        <InputField label="Page URL" value={facebookPage} onChange={setFacebookPage} placeholder="facebook.com/yourteam" />
                                        <InputField label="Page Token" type="password" value={facebookToken} onChange={setFacebookToken} />
                                        <button className="text-sm text-blue-600 hover:underline">Connect with Meta</button>
                                    </div>

                                    <div className="space-y-4 p-4 border rounded-lg dark:border-gray-700">
                                        <div className="flex items-center gap-2">
                                            <YoutubeIcon />
                                            <span className="font-semibold">YouTube</span>
                                        </div>
                                        <InputField label="Channel URL" value={youtubeChannel} onChange={setYoutubeChannel} placeholder="youtube.com/@yourteam" />
                                        <button className="text-sm text-blue-600 hover:underline">Connect with Google</button>
                                    </div>

                                    <div className="space-y-4 p-4 border rounded-lg dark:border-gray-700">
                                        <div className="flex items-center gap-2">
                                            <TiktokIcon />
                                            <span className="font-semibold">TikTok</span>
                                        </div>
                                        <InputField label="Handle" value={tiktokHandle} onChange={setTiktokHandle} placeholder="@yourteam" />
                                        <button className="text-sm text-blue-600 hover:underline">Connect Account</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* User Roles Tab */}
                        {activeTab === 'users' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">User Roles</h2>

                                {/* Role descriptions */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                                    <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                                        <div className="font-semibold text-purple-800 dark:text-purple-300">Manager</div>
                                        <p className="text-xs text-purple-600 dark:text-purple-400">Full admin access</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                                        <div className="font-semibold text-blue-800 dark:text-blue-300">Coach</div>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">Squad & training</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                                        <div className="font-semibold text-green-800 dark:text-green-300">Parent</div>
                                        <p className="text-xs text-green-600 dark:text-green-400">View & RSVP</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                                        <div className="font-semibold text-orange-800 dark:text-orange-300">Player</div>
                                        <p className="text-xs text-orange-600 dark:text-orange-400">Personal stats</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-pink-50 dark:bg-pink-900/20">
                                        <div className="font-semibold text-pink-800 dark:text-pink-300">Fan</div>
                                        <p className="text-xs text-pink-600 dark:text-pink-400">View-only</p>
                                    </div>
                                </div>

                                {/* Team Access Codes */}
                                <div className="grid md:grid-cols-2 gap-4 mb-6">
                                    {/* Fan Code */}
                                    <div className="p-4 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl text-white">
                                        <h3 className="font-bold mb-2 flex items-center gap-2">
                                            <span>🎟️</span> Team Fan Code
                                        </h3>
                                        <p className="text-pink-100 text-sm mb-3">
                                            Share this code with fans to give them view-only access.
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <div className="bg-white/20 px-4 py-2 rounded-lg font-mono text-lg tracking-wider min-w-[140px]">
                                                {fanCodeLoading ? '...' : fanCode || 'Not set'}
                                            </div>
                                            <button
                                                onClick={handleCopyFanCode}
                                                disabled={!fanCode}
                                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
                                                title="Copy code"
                                            >
                                                {fanCodeCopied ? '✓' : '📋'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Coach Codes */}
                                    <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white">
                                        <h3 className="font-bold mb-2 flex items-center gap-2">
                                            <span>🏃</span> Coach Codes
                                        </h3>
                                        <p className="text-blue-100 text-sm mb-3">
                                            Generate codes for coaches to give them elevated access.
                                        </p>
                                        <button
                                            onClick={handleGenerateCoachCode}
                                            disabled={generatingCoachCode}
                                            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                        >
                                            {generatingCoachCode ? 'Generating...' : '+ Generate Coach Code'}
                                        </button>
                                        {newCoachCode && (
                                            <div className="mt-3 p-2 bg-white/20 rounded-lg flex items-center justify-between">
                                                <span className="font-mono tracking-wider">{newCoachCode}</span>
                                                <button
                                                    onClick={() => handleCopyCoachCode(newCoachCode)}
                                                    className="ml-2 p-1 bg-white/20 hover:bg-white/30 rounded"
                                                    title="Copy"
                                                >
                                                    📋
                                                </button>
                                            </div>
                                        )}
                                        {coachCodes.length > 0 && !newCoachCode && (
                                            <div className="mt-3 text-sm text-blue-100">
                                                {coachCodes.length} code(s) generated
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Invite form */}
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <h3 className="font-semibold mb-3">Invite New User</h3>
                                    <div className="flex flex-wrap gap-3">
                                        <input
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="Email address"
                                            className="flex-1 min-w-[200px] p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                        />
                                        <select
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value as UserRole['role'])}
                                            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                        >
                                            <option value="manager">Manager</option>
                                            <option value="coach">Coach</option>
                                            <option value="parent">Parent</option>
                                            <option value="player">Player</option>
                                            <option value="fan">Fan</option>
                                        </select>
                                        <button
                                            onClick={handleInviteUser}
                                            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                                        >
                                            Send Invite
                                        </button>
                                    </div>
                                </div>

                                {/* User list */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b dark:border-gray-700">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Role</th>
                                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user.id} className="border-b dark:border-gray-700">
                                                    <td className="py-3 px-4 font-medium">{user.name}</td>
                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{user.email}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${roleColors[user.role]}`}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`px-2 py-1 rounded text-xs ${user.status === 'active'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                            }`}>
                                                            {user.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button className="text-sm text-blue-600 hover:underline mr-3">Edit</button>
                                                        <button className="text-sm text-red-600 hover:underline">Remove</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Integrations Tab */}
                        {activeTab === 'integrations' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">Integrations</h2>

                                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-blue-800 dark:text-blue-300">Platform-Managed Integrations</h3>
                                            <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
                                                Email notifications, authentication, and other core services are automatically configured for your team.
                                                No additional setup required!
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Active Integrations</h3>

                                    <div className="p-4 border rounded-lg dark:border-gray-700 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="font-medium">Email Notifications</div>
                                                <div className="text-sm text-gray-500">Magic links, reminders, updates</div>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active</span>
                                    </div>

                                    <div className="p-4 border rounded-lg dark:border-gray-700 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="font-medium">Secure Authentication</div>
                                                <div className="text-sm text-gray-500">Password-less sign in</div>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active</span>
                                    </div>

                                    <div className="p-4 border rounded-lg dark:border-gray-700 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="font-medium">Cloud Storage</div>
                                                <div className="text-sm text-gray-500">Data, images, files</div>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Branding Tab */}
                        {activeTab === 'branding' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b pb-2">Branding</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Color</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="color"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="w-12 h-10 rounded cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Secondary Color</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="color"
                                                value={secondaryColor}
                                                onChange={(e) => setSecondaryColor(e.target.value)}
                                                className="w-12 h-10 rounded cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={secondaryColor}
                                                onChange={(e) => setSecondaryColor(e.target.value)}
                                                className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <InputField label="Logo URL" value={logoUrl} onChange={setLogoUrl} placeholder="https://..." />
                                <InputField label="Favicon URL" value={faviconUrl} onChange={setFaviconUrl} placeholder="https://..." />

                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="font-semibold mb-3">Preview</div>
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {teamName.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold" style={{ color: primaryColor }}>{teamName}</div>
                                            <div className="text-sm" style={{ color: secondaryColor }}>Team Platform</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Reusable Input Field Component
function InputField({ label, value, onChange, type = 'text', placeholder = '' }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
        </div>
    );
}

// Icons
function TeamIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
}

function FaIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
    );
}

function TrainingIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function SocialIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
    );
}

function UsersIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}

function IntegrationsIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
    );
}

function BrandingIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
    );
}

// Social Media Icons
function XIcon() {
    return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

function InstagramIcon() {
    return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
    );
}

function FacebookIcon() {
    return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    );
}

function YoutubeIcon() {
    return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    );
}

function TiktokIcon() {
    return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
    );
}
