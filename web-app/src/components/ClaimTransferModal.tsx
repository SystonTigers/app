'use client';

import { useState } from 'react';
import { verifyTransferCode, claimTransfer, type TransferVerifyResult } from '@/lib/sdk';
import { Icon } from '@/components/ui/Icon';
import { Dialog, Notice, sdkErrorMessage } from '@/components/admin/AdminUi';

interface ClaimTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    newPlayer: {
        id: string;
        name: string;
    };
    onSuccess?: () => void;
}

/** Bring a new signing's stats across from their old club with its transfer code. */
export function ClaimTransferModal({ isOpen, onClose, newPlayer, onSuccess }: ClaimTransferModalProps) {
    const [step, setStep] = useState<'enter' | 'preview' | 'success'>('enter');
    const [transferCode, setTransferCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [verifyResult, setVerifyResult] = useState<TransferVerifyResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!transferCode.trim()) {
            setError('Enter the 8-character code from their old club.');
            return;
        }
        setIsVerifying(true);
        setError(null);
        try {
            setVerifyResult(await verifyTransferCode(transferCode));
            setStep('preview');
        } catch (err) {
            setError(sdkErrorMessage(err, "That code didn't work. Check it with their old club and try again."));
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
        } catch (err) {
            setError(sdkErrorMessage(err, "Their stats weren't brought across. Please try again."));
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
        <Dialog title="Bring stats across" onClose={handleClose}>
            {step === 'enter' && (
                <form onSubmit={handleVerifyCode} className="space-y-4" noValidate>
                    <p className="text-muted">
                        Enter the transfer code from <strong className="text-foreground">{newPlayer.name}</strong>&apos;s old club to bring their stats across.
                    </p>
                    <div>
                        <label htmlFor="transfer-code" className="label">Transfer code</label>
                        <input
                            id="transfer-code"
                            type="text"
                            autoComplete="off"
                            placeholder="8 characters"
                            value={transferCode}
                            onChange={(e) => setTransferCode(e.target.value.toUpperCase())}
                            maxLength={8}
                            className="field font-mono text-center text-xl tracking-[0.3em] uppercase"
                        />
                    </div>
                    {error && <Notice tone="error">{error}</Notice>}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                        <button type="button" onClick={handleClose} className="btn btn-ghost">Cancel</button>
                        <button type="submit" disabled={isVerifying || !transferCode.trim()} className="btn btn-primary">
                            {isVerifying ? 'Checking…' : 'Check code'}
                        </button>
                    </div>
                </form>
            )}

            {step === 'preview' && verifyResult && (
                <div className="space-y-4">
                    <Notice tone="success">
                        <p className="font-semibold">That code works.</p>
                        <p>{verifyResult.playerName}, from {verifyResult.fromClub}</p>
                    </Notice>
                    <div>
                        <p className="label">Stats coming across</p>
                        <dl className="grid grid-cols-3 gap-2 text-center">
                            {[
                                { label: 'Goals', value: verifyResult.stats.goals },
                                { label: 'Assists', value: verifyResult.stats.assists },
                                { label: 'Games', value: verifyResult.stats.appearances },
                            ].map((s) => (
                                <div key={s.label} className="bg-surface-raised border border-border py-3">
                                    <dd className="font-display text-2xl font-extrabold">{s.value}</dd>
                                    <dt className="text-xs text-muted uppercase tracking-wider">{s.label}</dt>
                                </div>
                            ))}
                        </dl>
                    </div>
                    {error && <Notice tone="error">{error}</Notice>}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setStep('enter')} className="btn btn-ghost">Back</button>
                        <button type="button" onClick={handleClaimTransfer} disabled={isClaiming} className="btn btn-primary">
                            <Icon name="link" className="w-4 h-4" />
                            {isClaiming ? 'Linking…' : 'Link their stats'}
                        </button>
                    </div>
                </div>
            )}

            {step === 'success' && (
                <div className="space-y-4 text-center py-2">
                    <div className="mx-auto w-14 h-14 hexagon bg-brand text-brand-foreground flex items-center justify-center">
                        <Icon name="check" className="w-7 h-7" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl">Stats linked</h3>
                    {successMessage && <p className="text-muted">{successMessage}</p>}
                    <button type="button" onClick={handleClose} className="btn btn-secondary w-full">Done</button>
                </div>
            )}
        </Dialog>
    );
}
