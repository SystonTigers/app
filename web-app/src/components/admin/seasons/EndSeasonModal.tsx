'use client';

import { useState, useEffect } from 'react';
import { createClientSDK } from '@/lib/sdk';

interface EndSeasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    season: any;
    tenantId: string;
}

export function EndSeasonModal({ isOpen, onClose, onSuccess, season, tenantId }: EndSeasonModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<any>(null);
    const [squad, setSquad] = useState<any[]>([]);

    // Awards State
    const [awards, setAwards] = useState<any[]>([]);
    const [customAwardName, setCustomAwardName] = useState('');
    const [customAwardPlayer, setCustomAwardPlayer] = useState('');

    useEffect(() => {
        if (isOpen && season) {
            loadPreview();
            loadSquad();
        }
    }, [isOpen, season?.id]);

    async function loadSquad() {
        const sdk = createClientSDK(tenantId);
        try {
            const data = await sdk.getSquad();
            let list: any[] = [];
            if (Array.isArray(data)) list = data;
            else if ((data as any).data) list = (data as any).data;
            setSquad(list);
        } catch (e) { console.error(e); }
    }

    async function loadPreview() {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/${season.id}/end-preview`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setPreview(data);
                // Pre-populate awards
                const initialAwards = [];
                if (data.topScorer) {
                    initialAwards.push({
                        type: 'golden_boot',
                        award_name: 'Golden Boot',
                        player_id: data.topScorer.id,
                    });
                }
                // setAwards(initialAwards);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleAddAward = () => {
        if (!customAwardName || !customAwardPlayer) return;
        setAwards([...awards, {
            type: 'custom',
            award_name: customAwardName,
            player_id: customAwardPlayer
        }]);
        setCustomAwardName('');
        setCustomAwardPlayer('');
    };

    const handleRemoveAward = (idx: number) => {
        setAwards(awards.filter((_, i) => i !== idx));
    };

    const handleConfirmEnd = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/${season.id}/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    awards
                })
            });
            const data = await res.json();
            if (data.success) {
                onSuccess();
                onClose();
            } else {
                alert(data.error || 'Failed to end season');
            }
        } catch (err) {
            alert('Failed to end season');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-6 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <h2 className="text-xl font-bold dark:text-white">End Season: {season?.name}</h2>
                    <p className="text-sm text-gray-500">Archive this season and freeze stats.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading && !preview ? (
                        <div className="py-20 text-center">Loading Season Stats...</div>
                    ) : (
                        <div className="space-y-8">
                            {/* Stats Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                                    <div className="text-3xl font-bold text-brand">{preview?.summary?.played || 0}</div>
                                    <div className="text-xs uppercase text-gray-500 mt-1">Matches</div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                                    <div className="text-3xl font-bold text-green-600">{preview?.summary?.won || 0}</div>
                                    <div className="text-xs uppercase text-gray-500 mt-1">Wins</div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                                    <div className="text-3xl font-bold text-blue-600">{preview?.summary?.goalsFor || 0}</div>
                                    <div className="text-xs uppercase text-gray-500 mt-1">Goals Scored</div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                                    <div className="text-3xl font-bold text-yellow-600">{preview?.summary?.cleanSheets || 0}</div>
                                    <div className="text-xs uppercase text-gray-500 mt-1">Clean Sheets</div>
                                </div>
                            </div>

                            {/* Top Performers */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="border rounded-lg p-4 dark:border-gray-700">
                                    <h3 className="font-semibold mb-3 dark:text-white">Top Scorer</h3>
                                    {preview?.topScorer ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">⚽</div>
                                            <div>
                                                <div className="font-medium dark:text-white">{preview.topScorer.name}</div>
                                                <div className="text-sm text-gray-500">{preview.topScorer.goals} Goals</div>
                                            </div>
                                        </div>
                                    ) : <div className="text-sm text-gray-500">No goals recorded</div>}
                                </div>
                                <div className="border rounded-lg p-4 dark:border-gray-700">
                                    <h3 className="font-semibold mb-3 dark:text-white">Most Assists</h3>
                                    {preview?.topAssister ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">👟</div>
                                            <div>
                                                <div className="font-medium dark:text-white">{preview.topAssister.name}</div>
                                                <div className="text-sm text-gray-500">{preview.topAssister.assists} Assists</div>
                                            </div>
                                        </div>
                                    ) : <div className="text-sm text-gray-500">No assists recorded</div>}
                                </div>
                            </div>

                            {/* Awards Editor */}
                            <div>
                                <h3 className="font-semibold mb-4 flex items-center gap-2 dark:text-white">
                                    🏆 Season Awards
                                </h3>

                                <div className="space-y-3 mb-4">
                                    {awards.map((award, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">🏅</span>
                                                <div>
                                                    <div className="font-medium text-yellow-900 dark:text-yellow-100">{award.award_name}</div>
                                                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                                                        {squad.find(p => p.id === award.player_id)?.name || 'Unknown Player'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemoveAward(idx)} className="text-red-500 hover:text-red-700">Remove</button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-end gap-3 bg-gray-50 dark:bg-gray-800 p-4 rounded border dark:border-gray-700">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs font-medium dark:text-gray-400">Award Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Player of the Season"
                                            value={customAwardName}
                                            onChange={e => setCustomAwardName(e.target.value)}
                                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs font-medium dark:text-gray-400">Winner</label>
                                        <select
                                            value={customAwardPlayer}
                                            onChange={e => setCustomAwardPlayer(e.target.value)}
                                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="">Select Player...</option>
                                            {squad.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleAddAward}
                                        disabled={!customAwardName || !customAwardPlayer}
                                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
                    <button
                        onClick={handleConfirmEnd}
                        disabled={loading || !preview}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? 'Archiving...' : 'End Season & Archive'}
                    </button>
                </div>
            </div>
        </div>
    );
}
