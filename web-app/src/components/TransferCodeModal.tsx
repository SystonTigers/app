'use client';

import { useState } from 'react';
import { generateTransferCode, TransferCodeResult } from '@/lib/sdk';

interface TransferCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: {
        id: string;
        name: string;
    };
}

export function TransferCodeModal({ isOpen, onClose, player }: TransferCodeModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [transferData, setTransferData] = useState<TransferCodeResult | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleGenerateCode = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await generateTransferCode(player.id);
            setTransferData(result);
        } catch (err: any) {
            setError(err.message || 'Failed to generate transfer code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyCode = async () => {
        if (!transferData) return;

        try {
            await navigator.clipboard.writeText(transferData.transferCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = transferData.transferCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setTransferData(null);
        setError(null);
        setCopied(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        🔄 Generate Transfer Code
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    {!transferData ? (
                        <div className="space-y-4">
                            <p className="text-gray-600 dark:text-gray-300">
                                Generate a transfer code for <strong>{player.name}</strong> to share their stats with a new club.
                            </p>

                            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4">
                                <h4 className="font-medium text-amber-800 dark:text-amber-200">What this does:</h4>
                                <ul className="mt-2 list-inside list-disc text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                    <li>Creates a unique 8-character transfer code</li>
                                    <li>Snapshots the player's current stats</li>
                                    <li>Code is valid for 30 days</li>
                                    <li>New club redeems code to import career history</li>
                                </ul>
                            </div>

                            {error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-200">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 rounded text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateCode}
                                    disabled={isLoading}
                                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isLoading ? 'Generating...' : 'Generate Code'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Transfer Code Display */}
                            <div className="rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 p-6 text-center">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Transfer Code</p>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="font-mono text-3xl font-bold tracking-widest text-blue-600 dark:text-blue-400">
                                        {transferData.transferCode}
                                    </span>
                                    <button
                                        onClick={handleCopyCode}
                                        className="p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-800"
                                        title="Copy code"
                                    >
                                        {copied ? '✓' : '📋'}
                                    </button>
                                </div>
                            </div>

                            {/* Stats Preview */}
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                <h4 className="font-medium mb-3 dark:text-white">Stats being transferred:</h4>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="rounded bg-gray-100 dark:bg-gray-700 p-2">
                                        <div className="text-lg font-bold dark:text-white">{transferData.stats.goals}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Goals</div>
                                    </div>
                                    <div className="rounded bg-gray-100 dark:bg-gray-700 p-2">
                                        <div className="text-lg font-bold dark:text-white">{transferData.stats.assists}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Assists</div>
                                    </div>
                                    <div className="rounded bg-gray-100 dark:bg-gray-700 p-2">
                                        <div className="text-lg font-bold dark:text-white">{transferData.stats.appearances}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Apps</div>
                                    </div>
                                </div>
                            </div>

                            {/* Expiry Info */}
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                                Code expires: {new Date(transferData.expiresAt).toLocaleDateString()}
                            </p>

                            <button
                                onClick={handleClose}
                                className="w-full px-4 py-2 rounded bg-gray-800 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
