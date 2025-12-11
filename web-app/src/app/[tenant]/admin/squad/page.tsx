'use client';

import { useState, useEffect, use } from 'react';
import { createClientSDK, updateSquad, addPlayer } from '@/lib/sdk';
import { AddPlayerModal } from '@/components/admin/AddPlayerModal';
import { TransferCodeModal } from '@/components/TransferCodeModal';
import { ClaimTransferModal } from '@/components/ClaimTransferModal';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

interface Player {
    id: string;
    name: string;
    number?: number;
    position?: string;
    dob?: string;
    photo_url?: string;
    role?: string;
}

export default function SquadAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [transferModalPlayer, setTransferModalPlayer] = useState<Player | null>(null);
    const [claimModalPlayer, setClaimModalPlayer] = useState<Player | null>(null);

    useEffect(() => {
        loadSquad();
    }, [tenant]);

    async function loadSquad() {
        const sdk = createClientSDK(tenant);
        try {
            const data = await sdk.getSquad();
            // Data might be wrapped or array
            let list: Player[] = [];
            if (Array.isArray(data)) {
                list = data as unknown as Player[];
            } else if ((data as any).data && Array.isArray((data as any).data)) {
                list = (data as any).data;
            }
            setPlayers(list);
        } catch (err) {
            console.error('Failed to load squad', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddPlayer(playerData: any) {
        // Use dedicated API for adding (supports D1 & announcements)
        await addPlayer(playerData);
        await loadSquad(); // Reload to get synced data
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

    if (loading) return <div className="p-8 dark:text-gray-200">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <AddPlayerModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSave={handleAddPlayer}
            />

            {transferModalPlayer && (
                <TransferCodeModal
                    isOpen={!!transferModalPlayer}
                    onClose={() => setTransferModalPlayer(null)}
                    player={transferModalPlayer}
                />
            )}

            {claimModalPlayer && (
                <ClaimTransferModal
                    isOpen={!!claimModalPlayer}
                    onClose={() => setClaimModalPlayer(null)}
                    newPlayer={claimModalPlayer}
                    onSuccess={loadSquad}
                />
            )}

            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Squad Management</h1>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <span>+</span> Sign Player
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-gray-800 text-white px-6 py-2 rounded hover:bg-gray-700 transition-colors disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
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
                                        className="w-16 p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="#"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="text"
                                        value={player.name}
                                        onChange={(e) => updatePlayer(player.id, 'name', e.target.value)}
                                        className="w-full p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={player.position || ''}
                                        onChange={(e) => updatePlayer(player.id, 'position', e.target.value)}
                                        className="w-full p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="Goalkeeper">Goalkeeper</option>
                                        <option value="Defender">Defender</option>
                                        <option value="Midfielder">Midfielder</option>
                                        <option value="Forward">Forward</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={player.role || 'Player'}
                                        onChange={(e) => updatePlayer(player.id, 'role', e.target.value)}
                                        className="w-full p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                        <option value="Player">Player</option>
                                        <option value="Captain">Captain</option>
                                        <option value="Vice Captain">Vice Captain</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                        type="date"
                                        value={player.dob ? new Date(player.dob).toISOString().split('T')[0] : ''}
                                        onChange={(e) => updatePlayer(player.id, 'dob', e.target.value)}
                                        className="w-full p-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                    <Link
                                        href={`/${tenant}/admin/players/${player.id}`}
                                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-sm"
                                        title="Edit player details, contacts, and login code"
                                    >
                                        ✏️ Edit
                                    </Link>
                                    <button
                                        onClick={() => setTransferModalPlayer(player)}
                                        className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 text-sm"
                                        title="Generate transfer code for departing player"
                                    >
                                        🔄 Transfer
                                    </button>
                                    <button
                                        onClick={() => setClaimModalPlayer(player)}
                                        className="text-green-600 hover:text-green-900 dark:hover:text-green-400 text-sm"
                                        title="Link career history from previous club"
                                    >
                                        📥 Import
                                    </button>
                                    <button
                                        onClick={() => removePlayer(player.id)}
                                        className="text-red-600 hover:text-red-900 dark:hover:text-red-400 text-sm"
                                    >
                                        ✕
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {players.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                    No players in squad. Click "Sign Player" to start.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
