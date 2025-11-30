'use client';

import { useState, useEffect } from 'react';
import { createClientSDK, updateSquad } from '@/lib/sdk';

interface Player {
    id: string;
    name: string;
    number?: number;
    position?: string;
    dob?: string;
}

export default function SquadAdminPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSquad();
    }, []);

    async function loadSquad() {
        try {
            const sdk = createClientSDK();
            const data = await sdk.getSquad();
            setPlayers(data as unknown as Player[]);
        } catch (err) {
            console.error('Failed to load squad', err);
        } finally {
            setLoading(false);
        }
    }

    function addPlayer() {
        const newPlayer: Player = {
            id: crypto.randomUUID(),
            name: 'New Player',
            position: 'Midfielder',
        };
        setPlayers([...players, newPlayer]);
    }

    function updatePlayer(id: string, field: keyof Player, value: any) {
        setPlayers(players.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
    }

    function removePlayer(id: string) {
        if (confirm('Are you sure you want to remove this player?')) {
            setPlayers(players.filter(p => p.id !== id));
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await updateSquad(players);
            alert('Squad saved successfully!');
        } catch (err) {
            console.error('Failed to save squad', err);
            alert('Failed to save squad');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Squad Management</h1>
                <div className="flex gap-4">
                    <button
                        onClick={addPlayer}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                    >
                        + Add Player
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-brand text-white px-6 py-2 rounded hover:bg-brand/90 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Number</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Position</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">DOB</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {players.map((player) => (
                            <tr key={player.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="number"
                                        value={player.number || ''}
                                        onChange={(e) => updatePlayer(player.id, 'number', parseInt(e.target.value))}
                                        className="w-16 p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="#"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="text"
                                        value={player.name}
                                        onChange={(e) => updatePlayer(player.id, 'name', e.target.value)}
                                        className="w-full p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={player.position || ''}
                                        onChange={(e) => updatePlayer(player.id, 'position', e.target.value)}
                                        className="w-full p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    >
                                        <option value="Goalkeeper">Goalkeeper</option>
                                        <option value="Defender">Defender</option>
                                        <option value="Midfielder">Midfielder</option>
                                        <option value="Forward">Forward</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="date"
                                        value={player.dob ? new Date(player.dob).toISOString().split('T')[0] : ''}
                                        onChange={(e) => updatePlayer(player.id, 'dob', e.target.value)}
                                        className="w-full p-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <button
                                        onClick={() => removePlayer(player.id)}
                                        className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {players.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No players in squad. Click "Add Player" to start.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
