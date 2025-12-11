'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface LinkPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LinkPlayerModal({ isOpen, onClose }: LinkPlayerModalProps) {
    const { linkPlayer, switchTenant } = useAuth();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successTenant, setSuccessTenant] = useState<any>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await linkPlayer(code);
            if (res.success && res.tenant) {
                setSuccessTenant(res.tenant);
                // Don't close immediately, offer switch?
            } else {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to link player');
        } finally {
            setLoading(false);
        }
    };

    const handleSwitch = async () => {
        if (successTenant) {
            await switchTenant(successTenant.id);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Link Player / Team</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">✕</button>
                </div>

                <div className="p-6">
                    {successTenant ? (
                        <div className="text-center space-y-4">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl">✓</div>
                            <h4 className="font-bold text-xl">Success!</h4>
                            <p className="text-gray-500">
                                You have successfully linked a player from <strong>{successTenant.name}</strong>.
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                                >
                                    Stay Here
                                </button>
                                <button
                                    onClick={handleSwitch}
                                    className="flex-1 py-2 bg-brand text-white rounded-lg font-medium hover:opacity-90"
                                >
                                    Switch Team
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Player Login Code</label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="TIGERS-8472"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 uppercase font-mono text-center tracking-wider"
                                    required
                                />
                                <p className="text-xs text-gray-400 mt-1">Enter the code provided by your team manager.</p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !code}
                                className="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-80 disabled:opacity-50"
                            >
                                {loading ? 'Linking...' : 'Link Player'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
