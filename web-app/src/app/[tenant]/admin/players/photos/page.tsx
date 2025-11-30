'use client';

import { use, useState, useEffect } from 'react';

interface Player {
    id: string;
    name: string;
    position: string;
    number?: number;
    photo_url?: string;
}

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function PlayerPhotosPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [players, setPlayers] = useState<Player[]>([]);
    const [uploading, setUploading] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPlayers();
    }, []);

    const loadPlayers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/squad?tenantId=${tenant}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setPlayers(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load players:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoUpload = async (playerId: string, file: File) => {
        setUploading(playerId);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('playerId', playerId);

            await fetch(`/api/v1/players/${playerId}/photo`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            await loadPlayers();
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(null);
        }
    };

    const handlePhotoDelete = async (playerId: string) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/v1/players/${playerId}/photo`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            await loadPlayers();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    if (loading) {
        return <div className="p-8">Loading players...</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-6 rounded-lg">
                <h2 className="text-2xl font-bold">Player Photo Management</h2>
                <p className="text-sm opacity-90">Upload and manage player profile photos</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map((player) => (
                    <div key={player.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                        <div className="flex flex-col items-center">
                            {player.photo_url ? (
                                <img
                                    src={`/api/v1/gallery/photos/${player.photo_url}`}
                                    alt={player.name}
                                    className="w-32 h-32 rounded-full object-cover mb-4"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-brand/20 flex items-center justify-center text-4xl font-bold text-brand mb-4">
                                    {player.name.charAt(0)}
                                </div>
                            )}

                            <h3 className="font-bold text-lg">{player.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                #{player.number || '--'} • {player.position}
                            </p>

                            <div className="flex gap-2 mt-4">
                                <label className={`bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand/90 cursor-pointer text-sm ${uploading === player.id ? 'opacity-50' : ''}`}>
                                    {uploading === player.id ? 'Uploading...' : player.photo_url ? 'Replace' : 'Upload'}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploading === player.id}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handlePhotoUpload(player.id, file);
                                        }}
                                    />
                                </label>

                                {player.photo_url && (
                                    <button
                                        onClick={() => handlePhotoDelete(player.id)}
                                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {players.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    No players found. Add players to your squad first.
                </div>
            )}
        </div>
    );
}
