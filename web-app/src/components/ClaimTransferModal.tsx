'use client';

import { useState } from 'react';
import { verifyTransferCode, claimTransfer, TransferVerifyResult } from '@/lib/sdk';

interface ClaimTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    newPlayer: {
        id: string;
        name: string;
    };
    onSuccess?: () => void;
}

export function ClaimTransferModal({ isOpen, onClose, newPlayer, onSuccess }: ClaimTransferModalProps) {
    const [step, setStep] = useState<'enter' | 'preview' | 'success'>('enter');
    const [transferCode, setTransferCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [verifyResult, setVerifyResult] = useState<TransferVerifyResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleVerifyCode = async () => {
        if (!transferCode.trim()) {
            setError('Please enter a transfer code');
            return;
        }

        setIsVerifying(true);
        setError(null);

        try {
            const result = await verifyTransferCode(transferCode);
            setVerifyResult(result);
            setStep('preview');
        } catch (err: any) {
            setError(err.message || 'Invalid transfer code');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleClaimTransfer = async () => {
        if (!verifyResult) return;

        setIsClaiming(true);
        setError(null);

        try {
            const result = await claimTransfer(transferCode, newPlayer.id);
            setSuccessMessage(result.message);
            setStep('success');
            onSuccess?.();
        } catch (err: any) {
            setError(err.message || 'Failed to claim transfer');
        } finally {
            setIsClaiming(false);
        }
    };

    const handleClose = () => {
        setStep('enter');
        setTransferCode('');
        setVerifyResult(null);
        setError(null);
        setSuccessMessage(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        👤 Link Career History
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    {step === 'enter' && (
                        <div className="space-y-4">
                            <p className="text-gray-600 dark:text-gray-300">
                                Enter a transfer code to import <strong>{newPlayer.name}</strong>'s career stats from their previous club.
                            </p>

                            <div className="space-y-2">
                                <label className="text-sm font-medium dark:text-gray-300">Transfer Code</label>
                                <input
                                    type="text"
                                    placeholder="Enter 8-character code"
                                    value={transferCode}
                                    onChange={(e) => setTransferCode(e.target.value.toUpperCase())}
                                    maxLength={8}
                                    className="w-full p-3 rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-center text-lg tracking-widest uppercase"
                                />
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
                                    onClick={handleVerifyCode}
                                    disabled={isVerifying || !transferCode.trim()}
                                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isVerifying ? 'Verifying...' : '🔍 Verify Code'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && verifyResult && (
                        <div className="space-y-4">
                            {/* Valid Code Banner */}
                            <div className="rounded-lg border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-green-600">✓</span>
                                    <span className="font-medium text-green-800 dark:text-green-200">Valid Transfer Code</span>
                                </div>
                                <div className="text-sm text-green-700 dark:text-green-300">
                                    <p><strong>Player:</strong> {verifyResult.playerName}</p>
                                    <p><strong>Previous Club:</strong> {verifyResult.fromClub}</p>
                                </div>
                            </div>

                            {/* Stats Preview */}
                            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                <h4 className="font-medium mb-3 dark:text-white">Career stats to import:</h4>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="rounded bg-gray-100 dark:bg-gray-700 p-2">
                                        <div className="text-lg font-bold dark:text-white">{verifyResult.stats.goals}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Goals</div>
                                    </div>
                                    <div className="rounded bg-gray-100 dark:bg-gray-700 p-2">
                                        <div className="text-lg font-bold dark:text-white">{verifyResult.stats.assists}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Assists</div>
                                    </div>
                                    <div className="rounded bg-gray-100 dark:bg-gray-700 p-2">
                                        <div className="text-lg font-bold dark:text-white">{verifyResult.stats.appearances}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Apps</div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-200">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setStep('enter')}
                                    className="px-4 py-2 rounded text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleClaimTransfer}
                                    disabled={isClaiming}
                                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {isClaiming ? 'Linking...' : '🔗 Link Career History'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="space-y-4 text-center py-4">
                            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-3xl">
                                ✓
                            </div>
                            <h3 className="text-lg font-semibold dark:text-white">Career History Linked!</h3>
                            <p className="text-gray-600 dark:text-gray-300">{successMessage}</p>
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
