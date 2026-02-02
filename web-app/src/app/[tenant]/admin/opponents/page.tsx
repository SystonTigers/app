'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Opponent {
    id: string;
    team_name: string;
    normalized_name: string;
    status: 'pending' | 'approved' | 'custom';
    effective_badge_url: string | null;
    pending_badge_url: string | null;
    reference_badge_url: string | null;
    needs_approval: boolean;
}

export default function AdminOpponentsPage() {
    const params = useParams();
    const tenantSlug = params.tenant as string;
    const [opponents, setOpponents] = useState<Opponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOpponent, setSelectedOpponent] = useState<Opponent | null>(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchOpponents();
    }, []);

    const fetchOpponents = async () => {
        try {
            const token = localStorage.getItem('session_token');
            const res = await fetch(`/api/v1/opponents?tenant_id=${tenantSlug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setOpponents(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch opponents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmBadge = async (action: 'confirm' | 'reject', customUrl?: string) => {
        if (!selectedOpponent) return;

        try {
            const token = localStorage.getItem('session_token');
            const res = await fetch(`/api/v1/opponents/${selectedOpponent.id}/confirm`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action,
                    custom_url: customUrl
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchOpponents();
                setShowApprovalModal(false);
                setSelectedOpponent(null);
            }
        } catch (error) {
            console.error('Failed to confirm badge:', error);
        }
    };

    const handleAddOpponent = async () => {
        if (!newTeamName.trim()) return;

        try {
            const token = localStorage.getItem('session_token');
            const res = await fetch('/api/v1/opponents', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tenant_id: tenantSlug,
                    team_name: newTeamName.trim()
                })
            });
            const data = await res.json();
            if (data.success) {
                setNewTeamName('');
                fetchOpponents();
            }
        } catch (error) {
            console.error('Failed to add opponent:', error);
        }
    };

    const handleUploadBadge = async (opponentId: string, file: File) => {
        setUploading(true);
        try {
            const token = localStorage.getItem('session_token');
            const res = await fetch(`/api/v1/opponents/${opponentId}/upload-badge`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': file.type
                },
                body: await file.arrayBuffer()
            });
            const data = await res.json();
            if (data.success) {
                fetchOpponents();
            }
        } catch (error) {
            console.error('Failed to upload badge:', error);
        } finally {
            setUploading(false);
        }
    };

    const openGoogleSearch = (teamName: string) => {
        const query = encodeURIComponent(`${teamName} badge logo football`);
        window.open(`https://www.google.com/search?q=${query}&tbm=isch`, '_blank');
    };

    const pendingApproval = opponents.filter(o => o.needs_approval);
    const approved = opponents.filter(o => !o.needs_approval);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Opponent Badges
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage team badges for your opponents. These are used in match graphics and social posts.
                    </p>
                </div>

                {/* Add New Opponent */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Add Opponent
                    </h2>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="Enter team name (e.g. Thurmaston Magpies)"
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddOpponent()}
                        />
                        <button
                            onClick={handleAddOpponent}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                            Add Team
                        </button>
                    </div>
                </div>

                {/* Pending Approval Section */}
                {pendingApproval.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 mb-6 border border-amber-200 dark:border-amber-800">
                        <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Badges Awaiting Approval ({pendingApproval.length})
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {pendingApproval.map((opponent) => (
                                <div
                                    key={opponent.id}
                                    onClick={() => {
                                        setSelectedOpponent(opponent);
                                        setShowApprovalModal(true);
                                    }}
                                    className="bg-white dark:bg-gray-800 rounded-lg p-4 cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all"
                                >
                                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                        {opponent.pending_badge_url ? (
                                            <img
                                                src={opponent.pending_badge_url}
                                                alt={opponent.team_name}
                                                className="w-full h-full object-contain p-2"
                                            />
                                        ) : (
                                            <span className="text-3xl font-bold text-gray-400">
                                                {opponent.team_name.charAt(0)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white text-center truncate">
                                        {opponent.team_name}
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-1">
                                        Click to review
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Opponents Grid */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        All Opponents ({opponents.length})
                    </h2>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                        {opponents.map((opponent) => (
                            <div
                                key={opponent.id}
                                className="group relative"
                            >
                                <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                                    {opponent.effective_badge_url ? (
                                        <img
                                            src={opponent.effective_badge_url}
                                            alt={opponent.team_name}
                                            className="w-full h-full object-contain p-2"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700">
                                            <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                                                {opponent.team_name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center mt-2 truncate">
                                    {opponent.team_name}
                                </p>

                                {/* Hover actions */}
                                <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <label className="p-2 bg-white rounded-full cursor-pointer hover:bg-gray-100">
                                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    handleUploadBadge(opponent.id, e.target.files[0]);
                                                }
                                            }}
                                        />
                                    </label>
                                    <button
                                        onClick={() => openGoogleSearch(opponent.team_name)}
                                        className="p-2 bg-white rounded-full hover:bg-gray-100"
                                        title="Search Google Images"
                                    >
                                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Approval Modal */}
            {showApprovalModal && selectedOpponent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Is this correct?
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            We found this badge for <strong>{selectedOpponent.team_name}</strong>
                        </p>

                        <div className="flex gap-4 mb-6">
                            <div className="flex-1">
                                <p className="text-xs text-center font-bold text-gray-500 mb-2 uppercase">Google Suggestion</p>
                                <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden">
                                    {selectedOpponent.pending_badge_url ? (
                                        <img
                                            src={selectedOpponent.pending_badge_url}
                                            alt={selectedOpponent.team_name}
                                            className="w-full h-full object-contain p-4"
                                        />
                                    ) : (
                                        <span className="text-6xl font-bold text-gray-400">?</span>
                                    )}
                                </div>
                            </div>

                            {selectedOpponent.reference_badge_url && (
                                <div className="flex-1">
                                    <p className="text-xs text-center font-bold text-gray-500 mb-2 uppercase">FA Website</p>
                                    <div className="aspect-square bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center overflow-hidden border border-blue-100 dark:border-blue-800">
                                        <img
                                            src={selectedOpponent.reference_badge_url}
                                            alt="FA Source"
                                            className="w-full h-full object-contain p-4 opacity-80"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleConfirmBadge('confirm')}
                                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
                            >
                                ✓ Yes, this is correct
                            </button>
                            <button
                                onClick={() => openGoogleSearch(selectedOpponent.team_name)}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                            >
                                🔍 Pick the correct one
                            </button>
                            <button
                                onClick={() => handleConfirmBadge('reject')}
                                className="w-full py-3 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
                            >
                                ✗ No, add manually
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setShowApprovalModal(false);
                                setSelectedOpponent(null);
                            }}
                            className="mt-4 w-full py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
