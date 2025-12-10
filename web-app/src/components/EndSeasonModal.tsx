'use client';

import { useState, useEffect } from 'react';

interface EndSeasonPreview {
    season: {
        id: string;
        name: string;
    };
    summary: {
        played: number;
        won: number;
        drawn: number;
        lost: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
        points: number;
        cleanSheets: number;
    };
    topScorer: { playerId: string; name: string; goals: number } | null;
    topAssister: { playerId: string; name: string; assists: number } | null;
    mostAppearances: { playerId: string; name: string; appearances: number } | null;
    motmLeader: { playerId: string; name: string; count: number } | null;
    warnings: string[];
}

interface Player {
    id: string;
    name: string;
}

interface Award {
    awardType: string;
    playerId: string;
    customName?: string;
}

const AWARD_TYPES = [
    { value: 'player_of_season', label: "Player of the Season" },
    { value: 'top_scorer', label: 'Top Scorer' },
    { value: 'most_assists', label: 'Most Assists' },
    { value: 'players_player', label: "Players' Player" },
    { value: 'most_improved', label: 'Most Improved' },
    { value: 'managers_player', label: "Manager's Player" },
    { value: 'golden_glove', label: 'Golden Glove (GK)' },
    { value: 'custom', label: 'Custom Award' }
];

interface Props {
    seasonId: string;
    seasonName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EndSeasonModal({ seasonId, seasonName, isOpen, onClose, onSuccess }: Props) {
    const [step, setStep] = useState<'preview' | 'awards' | 'confirm'>('preview');
    const [preview, setPreview] = useState<EndSeasonPreview | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [awards, setAwards] = useState<Award[]>([]);
    const [notes, setNotes] = useState('');
    const [confirmName, setConfirmName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // New award form state
    const [newAwardType, setNewAwardType] = useState('');
    const [newAwardPlayer, setNewAwardPlayer] = useState('');
    const [newAwardCustomName, setNewAwardCustomName] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadPreview();
            loadPlayers();
            setStep('preview');
            setAwards([]);
            setNotes('');
            setConfirmName('');
            setError('');
        }
    }, [isOpen, seasonId]);

    async function loadPreview() {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/${seasonId}/end-preview`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (data.success) {
                setPreview(data.data);
            } else {
                setError(data.error || 'Failed to load preview');
            }
        } catch (err) {
            setError('Failed to load season preview');
        } finally {
            setLoading(false);
        }
    }

    async function loadPlayers() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/available-players`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (data.success) {
                setPlayers(data.data || []);
            }
        } catch (err) {
            console.error('Failed to load players:', err);
        }
    }

    function handleAddAward() {
        if (!newAwardType || !newAwardPlayer) return;

        setAwards([...awards, {
            awardType: newAwardType,
            playerId: newAwardPlayer,
            customName: newAwardType === 'custom' ? newAwardCustomName : undefined
        }]);

        setNewAwardType('');
        setNewAwardPlayer('');
        setNewAwardCustomName('');
    }

    function handleRemoveAward(index: number) {
        setAwards(awards.filter((_, i) => i !== index));
    }

    async function handleEndSeason() {
        if (confirmName !== seasonName) {
            setError('Season name does not match');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/${seasonId}/end`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        awards,
                        notes,
                        confirmName
                    })
                }
            );
            const data = await res.json();

            if (data.success) {
                onSuccess();
                onClose();
            } else {
                setError(data.error || 'Failed to end season');
            }
        } catch (err) {
            setError('Failed to end season');
        } finally {
            setSaving(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold">End Season: {seasonName}</h2>
                            <p className="text-gray-500 mt-1">
                                Step {step === 'preview' ? 1 : step === 'awards' ? 2 : 3} of 3
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            &times;
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-12">Loading season data...</div>
                    ) : error ? (
                        <div className="text-red-500 text-center py-4">{error}</div>
                    ) : step === 'preview' && preview ? (
                        <div className="space-y-6">
                            <h3 className="font-semibold text-lg">Season Summary</h3>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded text-center">
                                    <div className="text-3xl font-bold">{preview.summary.played}</div>
                                    <div className="text-sm text-gray-500">Played</div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded text-center">
                                    <div className="text-3xl font-bold text-green-600">{preview.summary.won}</div>
                                    <div className="text-sm text-gray-500">Won</div>
                                </div>
                                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded text-center">
                                    <div className="text-3xl font-bold text-yellow-600">{preview.summary.drawn}</div>
                                    <div className="text-sm text-gray-500">Drawn</div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded text-center">
                                    <div className="text-3xl font-bold text-red-600">{preview.summary.lost}</div>
                                    <div className="text-sm text-gray-500">Lost</div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded text-center">
                                    <div className="text-3xl font-bold text-blue-600">{preview.summary.goalsFor}</div>
                                    <div className="text-sm text-gray-500">Goals For</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded text-center">
                                    <div className="text-3xl font-bold">{preview.summary.points}</div>
                                    <div className="text-sm text-gray-500">Points</div>
                                </div>
                            </div>

                            {/* Top Performers */}
                            <div>
                                <h4 className="font-medium mb-3">Top Performers</h4>
                                <div className="space-y-2">
                                    {preview.topScorer && (
                                        <div className="flex justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                            <span>Top Scorer</span>
                                            <span className="font-medium">{preview.topScorer.name} ({preview.topScorer.goals} goals)</span>
                                        </div>
                                    )}
                                    {preview.topAssister && (
                                        <div className="flex justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                            <span>Most Assists</span>
                                            <span className="font-medium">{preview.topAssister.name} ({preview.topAssister.assists})</span>
                                        </div>
                                    )}
                                    {preview.mostAppearances && (
                                        <div className="flex justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                            <span>Most Appearances</span>
                                            <span className="font-medium">{preview.mostAppearances.name} ({preview.mostAppearances.appearances})</span>
                                        </div>
                                    )}
                                    {preview.motmLeader && (
                                        <div className="flex justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                            <span>MOTM Leader</span>
                                            <span className="font-medium">{preview.motmLeader.name} ({preview.motmLeader.count})</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Warnings */}
                            {preview.warnings.length > 0 && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 p-4 rounded">
                                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Warnings</h4>
                                    <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300">
                                        {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={() => setStep('awards')}
                                className="w-full bg-brand text-white py-3 rounded hover:bg-brand/90"
                            >
                                Continue to Awards
                            </button>
                        </div>
                    ) : step === 'awards' ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Season Awards</h3>
                                <p className="text-gray-500 text-sm">
                                    Add end-of-season awards. Top Scorer and Most Assists will be auto-calculated if not manually set.
                                </p>
                            </div>

                            {/* Current Awards */}
                            {awards.length > 0 && (
                                <div className="space-y-2">
                                    {awards.map((award, i) => (
                                        <div key={i} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                            <div>
                                                <span className="font-medium">
                                                    {award.customName || AWARD_TYPES.find(t => t.value === award.awardType)?.label}
                                                </span>
                                                <span className="text-gray-500 ml-2">
                                                    - {players.find(p => p.id === award.playerId)?.name}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveAward(i)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Award Form */}
                            <div className="border dark:border-gray-700 p-4 rounded space-y-3">
                                <h4 className="font-medium">Add Award</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <select
                                        value={newAwardType}
                                        onChange={e => setNewAwardType(e.target.value)}
                                        className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select award type...</option>
                                        {AWARD_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={newAwardPlayer}
                                        onChange={e => setNewAwardPlayer(e.target.value)}
                                        className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="">Select player...</option>
                                        {players.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {newAwardType === 'custom' && (
                                    <input
                                        type="text"
                                        value={newAwardCustomName}
                                        onChange={e => setNewAwardCustomName(e.target.value)}
                                        placeholder="Custom award name"
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    />
                                )}
                                <button
                                    onClick={handleAddAward}
                                    disabled={!newAwardType || !newAwardPlayer}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                                >
                                    + Add Award
                                </button>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Season Notes (optional)</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Any notes about this season..."
                                    rows={3}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('preview')}
                                    className="flex-1 py-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep('confirm')}
                                    className="flex-1 bg-brand text-white py-3 rounded hover:bg-brand/90"
                                >
                                    Continue to Confirm
                                </button>
                            </div>
                        </div>
                    ) : step === 'confirm' ? (
                        <div className="space-y-6">
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded">
                                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                                    Are you sure?
                                </h3>
                                <p className="text-red-700 dark:text-red-300 text-sm">
                                    This will archive the season &quot;{seasonName}&quot;. All stats will be frozen and preserved.
                                    You can reopen within 24 hours if needed.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Type &quot;{seasonName}&quot; to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={confirmName}
                                    onChange={e => setConfirmName(e.target.value)}
                                    placeholder={seasonName}
                                    className="w-full p-3 border-2 rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>

                            {error && (
                                <div className="text-red-500 text-sm">{error}</div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('awards')}
                                    className="flex-1 py-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleEndSeason}
                                    disabled={saving || confirmName !== seasonName}
                                    className="flex-1 bg-red-600 text-white py-3 rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                    {saving ? 'Ending Season...' : 'End Season'}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
