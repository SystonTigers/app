'use client';

import { useState, useEffect } from 'react';
import { createClientSDK } from '@/lib/sdk';

interface StartSeasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenantId: string;
}

export function StartSeasonModal({ isOpen, onClose, onSuccess, tenantId }: StartSeasonModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [copySquad, setCopySquad] = useState(true);
    const [squad, setSquad] = useState<any[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            loadCurrentSquad();
        }
    }, [isOpen, tenantId]);

    async function loadCurrentSquad() {
        const sdk = createClientSDK(tenantId);
        try {
            const data = await sdk.getSquad();
            let list: any[] = [];
            if (Array.isArray(data)) list = data;
            else if ((data as any).data) list = (data as any).data;

            setSquad(list);
            // Default select all
            setSelectedPlayers(new Set(list.map(p => p.id)));
        } catch (err) {
            console.error(err);
        }
    }

    const handleTogglePlayer = (id: string) => {
        const next = new Set(selectedPlayers);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedPlayers(next);
    };

    const handleStartSeason = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/start-new`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    startDate,
                    copySquad,
                    playerIds: copySquad ? Array.from(selectedPlayers) : []
                })
            });
            const data = await res.json();
            if (data.success) {
                onSuccess();
                onClose();
            } else {
                alert(data.error || 'Failed to start season');
            }
        } catch (err) {
            alert('Error starting season');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div className="p-6 border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold dark:text-white">Start New Season</h2>
                </div>

                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Season Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. 2025/2026"
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            {squad.length > 0 && (
                                <div className="mt-6 border-t pt-4 dark:border-gray-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <input
                                            type="checkbox"
                                            id="copySquad"
                                            checked={copySquad}
                                            onChange={e => setCopySquad(e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        <label htmlFor="copySquad" className="font-medium dark:text-gray-300">Carry over current squad?</label>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                                        Active players will be linked to the new season automatically.
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-8">
                                <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
                                <button
                                    onClick={() => copySquad ? setStep(2) : handleStartSeason()}
                                    disabled={!name || !startDate}
                                    className="px-4 py-2 bg-brand text-white rounded hover:bg-brand/90 disabled:opacity-50"
                                >
                                    {copySquad ? 'Next: Review Squad' : 'Start Season'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold dark:text-white">Review Squad List</h3>
                            <p className="text-sm text-gray-500">Uncheck players who have left the club.</p>

                            <div className="max-h-60 overflow-y-auto border rounded dark:border-gray-700 divide-y dark:divide-gray-700">
                                {squad.map(p => (
                                    <div key={p.id} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedPlayers.has(p.id)}
                                                onChange={() => handleTogglePlayer(p.id)}
                                                className="w-4 h-4"
                                            />
                                            <span className="dark:text-white">{p.name}</span>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">{p.position}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button onClick={() => setStep(1)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700">Back</button>
                                <button
                                    onClick={handleStartSeason}
                                    disabled={loading}
                                    className="px-4 py-2 bg-brand text-white rounded hover:bg-brand/90 disabled:opacity-50"
                                >
                                    {loading ? 'Starting...' : `Start Season (${selectedPlayers.size} Players)`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
