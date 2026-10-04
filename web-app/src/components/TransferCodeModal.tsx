'use client';

import { useState } from 'react';
import { generateTransferCode, type TransferCodeResult } from '@/lib/sdk';
import { formatDate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { Dialog, Notice, sdkErrorMessage } from '@/components/admin/AdminUi';

interface TransferCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    player: {
        id: string;
        name: string;
    };
}

/** Staff make a code a leaving player's new club uses to bring their stats across. */
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
            setTransferData(await generateTransferCode(player.id));
        } catch (err) {
            setError(sdkErrorMessage(err, "The code wasn't made. Please try again."));
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
            window.prompt('Copy this transfer code:', transferData.transferCode);
        }
    };

    const handleClose = () => {
        setTransferData(null);
        setError(null);
        setCopied(false);
        onClose();
    };

    const stats = transferData
        ? [
            { label: 'Goals', value: transferData.stats.goals },
            { label: 'Assists', value: transferData.stats.assists },
            { label: 'Games', value: transferData.stats.appearances },
        ]
        : [];

    return (
        <Dialog title="Transfer code" onClose={handleClose}>
            {!transferData ? (
                <div className="space-y-4">
                    <p className="text-muted">
                        Make a transfer code for <strong className="text-foreground">{player.name}</strong> so their new club can bring their stats across.
                    </p>
                    <ul className="space-y-2 text-sm">
                        {[
                            'An 8-character code just for this player',
                            'It keeps a copy of their stats as they are today',
                            'It works for 30 days',
                            'Their new club enters it on their Squad page',
                        ].map((line) => (
                            <li key={line} className="flex gap-2">
                                <Icon name="check" className="w-4 h-4 text-brand mt-0.5" />
                                {line}
                            </li>
                        ))}
                    </ul>
                    {error && <Notice tone="error">{error}</Notice>}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                        <button type="button" onClick={handleClose} className="btn btn-ghost">Cancel</button>
                        <button type="button" onClick={handleGenerateCode} disabled={isLoading} className="btn btn-primary">
                            {isLoading ? 'Making the code…' : 'Make code'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="border border-brand/50 bg-brand/10 p-5 text-center chamfer-sm">
                        <p className="label mb-2">Transfer code</p>
                        <div className="flex items-center justify-center gap-3">
                            <span className="font-mono text-3xl font-bold tracking-[0.2em] text-brand">{transferData.transferCode}</span>
                            <button type="button" onClick={handleCopyCode} className="p-2.5 text-muted hover:text-brand" aria-label="Copy code">
                                <Icon name={copied ? 'check' : 'copy'} className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <p className="label">Stats going with them</p>
                        <dl className="grid grid-cols-3 gap-2 text-center">
                            {stats.map((s) => (
                                <div key={s.label} className="bg-surface-raised border border-border py-3">
                                    <dd className="font-display text-2xl font-extrabold">{s.value}</dd>
                                    <dt className="text-xs text-muted uppercase tracking-wider">{s.label}</dt>
                                </div>
                            ))}
                        </dl>
                    </div>
                    <p className="text-sm text-muted text-center">Works until {formatDate(transferData.expiresAt)}</p>
                    <button type="button" onClick={handleClose} className="btn btn-secondary w-full">Done</button>
                </div>
            )}
        </Dialog>
    );
}
