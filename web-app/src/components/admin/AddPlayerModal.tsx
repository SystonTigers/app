'use client';

import { useState } from 'react';

interface AddPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (playerData: any) => Promise<void>;
}

export function AddPlayerModal({ isOpen, onClose, onSave }: AddPlayerModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        number: '',
        position: 'Midfielder',
        role: 'Player',
        photo_url: '',
        bio: '',
        signedDate: new Date().toISOString().split('T')[0],
        previousClub: '',
        signingNotes: '',
        announce: false
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave({
                ...formData,
                number: formData.number ? parseInt(formData.number) : null
            });
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to add player');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold dark:text-white">Sign New Player</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium dark:text-gray-300">Full Name *</label>
                            <input
                                required
                                type="text"
                                className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Jamie Tartt"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium dark:text-gray-300">Squad Number</label>
                            <input
                                type="number"
                                className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={formData.number}
                                onChange={e => setFormData({ ...formData, number: e.target.value })}
                                placeholder="9"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium dark:text-gray-300">Position</label>
                            <select
                                className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={formData.position}
                                onChange={e => setFormData({ ...formData, position: e.target.value })}
                            >
                                <option>Goalkeeper</option>
                                <option>Defender</option>
                                <option>Midfielder</option>
                                <option>Forward</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium dark:text-gray-300">Role</label>
                            <select
                                className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="Player">Player</option>
                                <option value="Captain">Captain</option>
                                <option value="Vice Captain">Vice Captain</option>
                            </select>
                        </div>
                    </div>

                    {/* Extended Info */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium dark:text-gray-300">Photo URL</label>
                        <input
                            type="url"
                            className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={formData.photo_url}
                            onChange={e => setFormData({ ...formData, photo_url: e.target.value })}
                            placeholder="https://..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium dark:text-gray-300">Bio</label>
                        <textarea
                            className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white h-20"
                            value={formData.bio}
                            onChange={e => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Player bio..."
                        />
                    </div>

                    {/* Signing Details */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-4 border border-blue-100 dark:border-blue-800">
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                            ✍️ Contract & Signing
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium dark:text-gray-300">Signed Date</label>
                                <input
                                    type="date"
                                    className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={formData.signedDate}
                                    onChange={e => setFormData({ ...formData, signedDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium dark:text-gray-300">Previous Club (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={formData.previousClub}
                                    onChange={e => setFormData({ ...formData, previousClub: e.target.value })}
                                    placeholder="e.g. Richmond FC"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium dark:text-gray-300">Signing Announcement Notes</label>
                            <textarea
                                className="w-full p-2 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white h-20"
                                value={formData.signingNotes}
                                onChange={e => setFormData({ ...formData, signingNotes: e.target.value })}
                                placeholder="Quote from manager or player..."
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="announce"
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={formData.announce}
                                onChange={e => setFormData({ ...formData, announce: e.target.checked })}
                            />
                            <label htmlFor="announce" className="text-sm font-medium dark:text-gray-300 cursor-pointer">
                                Post "Welcome" announcement to Feed?
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? 'Signing...' : 'Sign Player'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
