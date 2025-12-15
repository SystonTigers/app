'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface FriendlyRequest {
    id: string;
    tenant_id: string;
    team_name: string;
    team_display_name?: string;
    preferred_dates: string;
    location_pref: string;
    age_group: string;
    skill_level: string;
    kit_colors: string;
    max_travel_miles: number;
    pitch_type: string;
    notes: string;
    badge_url?: string;
    primary_color?: string;
    pending_count?: number;
    status: string;
}

interface MatchRequest {
    id: string;
    requester_team_name: string;
    requester_display_name?: string;
    requester_badge_url?: string;
    requester_color?: string;
    proposed_date: string;
    proposed_venue: string;
    proposed_kickoff: string;
    message: string;
    status: string;
}

export default function FriendliesPage() {
    const params = useParams();
    const tenantSlug = params.tenant as string;
    const [activeTab, setActiveTab] = useState<'browse' | 'mine' | 'inbox' | 'sent'>('browse');
    const [requests, setRequests] = useState<FriendlyRequest[]>([]);
    const [myRequests, setMyRequests] = useState<FriendlyRequest[]>([]);
    const [inbox, setInbox] = useState<MatchRequest[]>([]);
    const [sent, setSent] = useState<MatchRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPostForm, setShowPostForm] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState<FriendlyRequest | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        preferred_dates: [''],
        location_pref: 'any',
        age_group: '',
        skill_level: 'recreational',
        kit_colors: '',
        max_travel_miles: 30,
        pitch_type: 'any',
        notes: ''
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('session_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            if (activeTab === 'browse') {
                const res = await fetch('/api/v1/friendlies', { headers });
                const data = await res.json();
                if (data.success) setRequests(data.data);
            } else if (activeTab === 'mine') {
                const res = await fetch('/api/v1/friendlies/mine', { headers });
                const data = await res.json();
                if (data.success) setMyRequests(data.data);
            } else if (activeTab === 'inbox') {
                const res = await fetch('/api/v1/friendlies/inbox', { headers });
                const data = await res.json();
                if (data.success) setInbox(data.data);
            } else if (activeTab === 'sent') {
                const res = await fetch('/api/v1/friendlies/sent', { headers });
                const data = await res.json();
                if (data.success) setSent(data.data);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        }
        setLoading(false);
    };

    const handlePostRequest = async () => {
        const token = localStorage.getItem('session_token');
        try {
            const res = await fetch('/api/v1/friendlies', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                setShowPostForm(false);
                setActiveTab('mine');
                fetchData();
            }
        } catch (err) {
            console.error('Post error:', err);
        }
    };

    const handleRequestMatch = async (requestId: string, message: string, date: string) => {
        const token = localStorage.getItem('session_token');
        try {
            const res = await fetch(`/api/v1/friendlies/${requestId}/request`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message, proposed_date: date })
            });
            const data = await res.json();
            if (data.success) {
                setShowRequestModal(null);
                alert('Request sent!');
            }
        } catch (err) {
            console.error('Request error:', err);
        }
    };

    const handleRespond = async (matchId: string, action: 'accept' | 'decline') => {
        const token = localStorage.getItem('session_token');
        try {
            const res = await fetch(`/api/v1/friendlies/match/${matchId}/respond`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            });
            const data = await res.json();
            if (data.success) {
                fetchData();
                if (action === 'accept') {
                    alert('Match accepted! Fixture created for both teams.');
                }
            }
        } catch (err) {
            console.error('Respond error:', err);
        }
    };

    const handleDeleteRequest = async (id: string) => {
        const token = localStorage.getItem('session_token');
        try {
            await fetch(`/api/v1/friendlies/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchData();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const locationLabels: Record<string, string> = {
        home: '🏠 Home',
        away: '✈️ Away',
        neutral: '🏟️ Neutral',
        any: '📍 Any'
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            ⚽ Friendly Marketplace
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Find opponents for friendly matches
                        </p>
                    </div>
                    <button
                        onClick={() => setShowPostForm(true)}
                        className="px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                    >
                        <span className="text-lg">+</span> Post Friendly Request
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm">
                    {[
                        { id: 'browse', label: 'Browse', icon: '🔍' },
                        { id: 'mine', label: 'My Requests', icon: '📋' },
                        { id: 'inbox', label: 'Inbox', icon: '📥' },
                        { id: 'sent', label: 'Sent', icon: '📤' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {tab.icon} {tab.label}
                            {tab.id === 'inbox' && inbox.filter(m => m.status === 'pending').length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                    {inbox.filter(m => m.status === 'pending').length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Browse Tab */}
                        {activeTab === 'browse' && (
                            requests.length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl">
                                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                                        No friendly requests posted yet. Be the first!
                                    </p>
                                </div>
                            ) : (
                                requests.map((req) => (
                                    <div key={req.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
                                                    style={{ backgroundColor: req.primary_color || '#6B7280' }}
                                                >
                                                    {req.badge_url ? (
                                                        <img src={req.badge_url} alt="" className="w-full h-full object-contain rounded-full" />
                                                    ) : (
                                                        req.team_name?.charAt(0) || '?'
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {req.team_display_name || req.team_name}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {req.age_group && (
                                                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                                                                {req.age_group}
                                                            </span>
                                                        )}
                                                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                                                            {locationLabels[req.location_pref] || req.location_pref}
                                                        </span>
                                                        {req.max_travel_miles && (
                                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                                                                Max {req.max_travel_miles}mi
                                                            </span>
                                                        )}
                                                        {req.kit_colors && (
                                                            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                                                                🎽 {req.kit_colors}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowRequestModal(req)}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                                            >
                                                Request Match
                                            </button>
                                        </div>
                                        {req.notes && (
                                            <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm">
                                                {req.notes}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )
                        )}

                        {/* My Requests Tab */}
                        {activeTab === 'mine' && (
                            myRequests.length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl">
                                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                                        You haven't posted any friendly requests.
                                    </p>
                                </div>
                            ) : (
                                myRequests.map((req) => (
                                    <div key={req.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${req.status === 'open' ? 'bg-green-500' :
                                                            req.status === 'matched' ? 'bg-blue-500' : 'bg-gray-400'
                                                        }`}></span>
                                                    <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                                        {req.status}
                                                    </span>
                                                    {(req.pending_count ?? 0) > 0 && (
                                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                                                            {req.pending_count} pending requests
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {req.age_group && (
                                                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                                                            {req.age_group}
                                                        </span>
                                                    )}
                                                    <span className="text-gray-600 dark:text-gray-400 text-sm">
                                                        {locationLabels[req.location_pref]}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteRequest(req.id)}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )
                        )}

                        {/* Inbox Tab */}
                        {activeTab === 'inbox' && (
                            inbox.length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl">
                                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                                        No match requests received yet.
                                    </p>
                                </div>
                            ) : (
                                inbox.map((match) => (
                                    <div key={match.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                                                    style={{ backgroundColor: match.requester_color || '#6B7280' }}
                                                >
                                                    {match.requester_badge_url ? (
                                                        <img src={match.requester_badge_url} alt="" className="w-full h-full object-contain rounded-full" />
                                                    ) : (
                                                        match.requester_team_name?.charAt(0) || '?'
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                                        {match.requester_display_name || match.requester_team_name}
                                                    </h3>
                                                    {match.proposed_date && (
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            📅 {match.proposed_date}
                                                        </p>
                                                    )}
                                                    {match.message && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            "{match.message}"
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {match.status === 'pending' ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleRespond(match.id, 'accept')}
                                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespond(match.id, 'decline')}
                                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${match.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {match.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )
                        )}

                        {/* Sent Tab */}
                        {activeTab === 'sent' && (
                            sent.length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl">
                                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                                        You haven't sent any match requests.
                                    </p>
                                </div>
                            ) : (
                                sent.map((match) => (
                                    <div key={match.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                                    Request to {(match as any).host_team_name}
                                                </h3>
                                                {match.proposed_date && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        📅 {match.proposed_date}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${match.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                    match.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-600'
                                                }`}>
                                                {match.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                )}
            </div>

            {/* Post Form Modal */}
            {showPostForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                            Post Friendly Request
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Age Group
                                </label>
                                <select
                                    value={formData.age_group}
                                    onChange={(e) => setFormData({ ...formData, age_group: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg"
                                >
                                    <option value="">Select...</option>
                                    <option value="U7">U7</option>
                                    <option value="U8">U8</option>
                                    <option value="U9">U9</option>
                                    <option value="U10">U10</option>
                                    <option value="U11">U11</option>
                                    <option value="U12">U12</option>
                                    <option value="U13">U13</option>
                                    <option value="U14">U14</option>
                                    <option value="U15">U15</option>
                                    <option value="U16">U16</option>
                                    <option value="U18">U18</option>
                                    <option value="Adult">Adult</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Location Preference
                                </label>
                                <select
                                    value={formData.location_pref}
                                    onChange={(e) => setFormData({ ...formData, location_pref: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg"
                                >
                                    <option value="any">Any</option>
                                    <option value="home">Home</option>
                                    <option value="away">Away</option>
                                    <option value="neutral">Neutral</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Kit Colors (to avoid clashes)
                                </label>
                                <input
                                    type="text"
                                    value={formData.kit_colors}
                                    onChange={(e) => setFormData({ ...formData, kit_colors: e.target.value })}
                                    placeholder="e.g. Red/White"
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Max Travel Distance (miles)
                                </label>
                                <input
                                    type="number"
                                    value={formData.max_travel_miles}
                                    onChange={(e) => setFormData({ ...formData, max_travel_miles: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Pitch Type
                                </label>
                                <select
                                    value={formData.pitch_type}
                                    onChange={(e) => setFormData({ ...formData, pitch_type: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg"
                                >
                                    <option value="any">Any</option>
                                    <option value="grass">Grass</option>
                                    <option value="3g">3G</option>
                                    <option value="4g">4G</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Additional Notes
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Available dates, times, etc."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowPostForm(false)}
                                className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePostRequest}
                                className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl"
                            >
                                Post Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Match Modal */}
            {showRequestModal && (
                <RequestMatchModal
                    request={showRequestModal}
                    onClose={() => setShowRequestModal(null)}
                    onSubmit={handleRequestMatch}
                />
            )}
        </div>
    );
}

function RequestMatchModal({
    request,
    onClose,
    onSubmit
}: {
    request: FriendlyRequest;
    onClose: () => void;
    onSubmit: (id: string, message: string, date: string) => void;
}) {
    const [message, setMessage] = useState('');
    const [date, setDate] = useState('');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Request Match
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Send a match request to <strong>{request.team_display_name || request.team_name}</strong>
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Proposed Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Message (optional)
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Introduce your team..."
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(request.id, message, date)}
                        className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl"
                    >
                        Send Request
                    </button>
                </div>
            </div>
        </div>
    );
}
