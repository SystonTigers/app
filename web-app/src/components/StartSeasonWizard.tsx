'use client';

import { useState, useEffect } from 'react';

interface Player {
    id: string;
    name: string;
    photo_url?: string;
    position?: string;
    squad_number?: number;
    status?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function StartSeasonWizard({ isOpen, onClose, onSuccess }: Props) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Step 1: Season Details
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [competition, setCompetition] = useState('');
    const [ageGroup, setAgeGroup] = useState('');

    // Step 2: Squad Option
    const [squadOption, setSquadOption] = useState<'carryover' | 'fresh' | 'selective'>('carryover');

    // Step 3: Player Selection (for selective option)
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset form
            setStep(1);
            setName('');
            setStartDate('');
            setCompetition('');
            setAgeGroup('');
            setSquadOption('carryover');
            setSelectedPlayerIds([]);
            setError('');

            // Generate default season name (e.g., "2025-26")
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            // If after June, use current year - next year
            if (month >= 6) {
                setName(`${year}-${(year + 1).toString().slice(2)}`);
            } else {
                setName(`${year - 1}-${year.toString().slice(2)}`);
            }
            setStartDate(now.toISOString().split('T')[0]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (squadOption === 'selective' && step === 2) {
            loadPlayers();
        }
    }, [squadOption, step]);

    async function loadPlayers() {
        setLoadingPlayers(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/available-players`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (data.success) {
                const activePlayers = (data.data || []).filter((p: Player) => p.status !== 'departed');
                setPlayers(activePlayers);
                // Pre-select all active players
                setSelectedPlayerIds(activePlayers.map((p: Player) => p.id));
            }
        } catch (err) {
            console.error('Failed to load players:', err);
        } finally {
            setLoadingPlayers(false);
        }
    }

    function togglePlayer(playerId: string) {
        if (selectedPlayerIds.includes(playerId)) {
            setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== playerId));
        } else {
            setSelectedPlayerIds([...selectedPlayerIds, playerId]);
        }
    }

    function selectAll() {
        setSelectedPlayerIds(players.map(p => p.id));
    }

    function selectNone() {
        setSelectedPlayerIds([]);
    }

    async function handleSubmit() {
        if (!name || !startDate) {
            setError('Name and start date are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/seasons/start-new`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name,
                        startDate,
                        competition: competition || undefined,
                        ageGroup: ageGroup || undefined,
                        squadOption,
                        selectedPlayerIds: squadOption === 'selective' ? selectedPlayerIds : undefined
                    })
                }
            );
            const data = await res.json();

            if (data.success) {
                onSuccess();
                onClose();
            } else {
                setError(data.error || 'Failed to create season');
            }
        } catch (err) {
            setError('Failed to create season');
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold">Start New Season</h2>
                            <p className="text-gray-500 mt-1">Step {step} of 3</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            &times;
                        </button>
                    </div>
                    {/* Progress bar */}
                    <div className="flex gap-2 mt-4">
                        {[1, 2, 3].map(s => (
                            <div
                                key={s}
                                className={`flex-1 h-2 rounded ${s <= step ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Season Details</h3>

                            <div>
                                <label className="block text-sm font-medium mb-1">Season Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g., 2025-26"
                                    className="w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Start Date *</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Competition (optional)</label>
                                <input
                                    type="text"
                                    value={competition}
                                    onChange={e => setCompetition(e.target.value)}
                                    placeholder="e.g., Leicester & District Youth League"
                                    className="w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Age Group (optional)</label>
                                <input
                                    type="text"
                                    value={ageGroup}
                                    onChange={e => setAgeGroup(e.target.value)}
                                    placeholder="e.g., U14"
                                    className="w-full p-3 border rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!name || !startDate}
                                className="w-full bg-brand text-white py-3 rounded hover:bg-brand/90 disabled:opacity-50"
                            >
                                Continue
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Squad Setup</h3>
                            <p className="text-gray-500 text-sm">
                                Choose how to set up your squad for the new season.
                            </p>

                            <div className="space-y-3">
                                <label
                                    className={`flex items-start gap-3 p-4 border rounded cursor-pointer ${squadOption === 'carryover' ? 'border-brand bg-brand/5' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    <input
                                        type="radio"
                                        name="squadOption"
                                        value="carryover"
                                        checked={squadOption === 'carryover'}
                                        onChange={() => setSquadOption('carryover')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium">Carry Over All Players</div>
                                        <div className="text-sm text-gray-500">
                                            All active players from the previous season will be added to the new squad. Stats reset to zero.
                                        </div>
                                    </div>
                                </label>

                                <label
                                    className={`flex items-start gap-3 p-4 border rounded cursor-pointer ${squadOption === 'selective' ? 'border-brand bg-brand/5' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    <input
                                        type="radio"
                                        name="squadOption"
                                        value="selective"
                                        checked={squadOption === 'selective'}
                                        onChange={() => setSquadOption('selective')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium">Select Players to Keep</div>
                                        <div className="text-sm text-gray-500">
                                            Choose which players to carry over. Useful if some players have left.
                                        </div>
                                    </div>
                                </label>

                                <label
                                    className={`flex items-start gap-3 p-4 border rounded cursor-pointer ${squadOption === 'fresh' ? 'border-brand bg-brand/5' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                >
                                    <input
                                        type="radio"
                                        name="squadOption"
                                        value="fresh"
                                        checked={squadOption === 'fresh'}
                                        onChange={() => setSquadOption('fresh')}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-medium">Start Fresh</div>
                                        <div className="text-sm text-gray-500">
                                            Start with an empty squad. Add players manually after creating the season.
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => squadOption === 'selective' ? setStep(3) : handleSubmit()}
                                    className="flex-1 bg-brand text-white py-3 rounded hover:bg-brand/90"
                                >
                                    {squadOption === 'selective' ? 'Continue' : 'Create Season'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-lg">Select Players</h3>
                                    <p className="text-gray-500 text-sm">
                                        {selectedPlayerIds.length} of {players.length} players selected
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={selectAll}
                                        className="text-sm text-brand hover:underline"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={selectNone}
                                        className="text-sm text-gray-500 hover:underline"
                                    >
                                        Select None
                                    </button>
                                </div>
                            </div>

                            {loadingPlayers ? (
                                <div className="text-center py-8">Loading players...</div>
                            ) : (
                                <div className="max-h-64 overflow-y-auto border rounded dark:border-gray-700">
                                    {players.map(player => (
                                        <label
                                            key={player.id}
                                            className="flex items-center gap-3 p-3 border-b dark:border-gray-700 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedPlayerIds.includes(player.id)}
                                                onChange={() => togglePlayer(player.id)}
                                                className="rounded"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium">{player.name}</div>
                                                <div className="text-sm text-gray-500">
                                                    {player.squad_number ? `#${player.squad_number} ` : ''}
                                                    {player.position || ''}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {error && (
                                <div className="text-red-500 text-sm">{error}</div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 bg-brand text-white py-3 rounded hover:bg-brand/90 disabled:opacity-50"
                                >
                                    {loading ? 'Creating...' : `Create Season (${selectedPlayerIds.length} players)`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
