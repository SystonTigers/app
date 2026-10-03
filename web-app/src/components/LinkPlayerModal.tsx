'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/ui/Icon';

interface LinkPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface LinkedClub { id: string; name: string }

/** Add another child or club to this account with a code from the team manager. */
export function LinkPlayerModal({ isOpen, onClose }: LinkPlayerModalProps) {
    const { linkPlayer, switchTenant } = useAuth();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [linked, setLinked] = useState<LinkedClub | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await linkPlayer(code.trim());
            if (res.success && res.tenant) setLinked(res.tenant);
            else onClose();
        } catch (err) {
            setError(err instanceof Error && err.message ? err.message : "That code didn't work. Check it with your team manager and try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="link-player-title">
            <div className="card w-full max-w-sm p-0">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 id="link-player-title" className="text-xl">Link a player</h3>
                    <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-brand" aria-label="Close">
                        <Icon name="close" />
                    </button>
                </div>

                <div className="p-6">
                    {linked ? (
                        <div className="text-center space-y-4">
                            <div className="w-12 h-12 hexagon bg-brand text-brand-foreground flex items-center justify-center mx-auto">
                                <Icon name="check" />
                            </div>
                            <p className="text-muted">
                                You&apos;re now linked to a player at <strong className="text-foreground">{linked.name}</strong>.
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={onClose} className="btn btn-sm btn-secondary flex-1">Stay here</button>
                                <button type="button" onClick={() => switchTenant(linked.id)} className="btn btn-sm btn-primary flex-1">Go to that club</button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="link-code" className="label">Player code</label>
                                <input
                                    id="link-code"
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="ABCD-1234"
                                    autoComplete="off"
                                    className="field chamfer-sm uppercase font-mono text-center tracking-widest"
                                    required
                                />
                                <p className="text-xs text-muted mt-1.5">Your team manager can give you this code.</p>
                            </div>

                            {error && <p role="alert" className="p-3 text-sm text-red-300 border border-red-500/50 bg-red-500/10">{error}</p>}

                            <button type="submit" disabled={loading || !code} className="btn btn-primary w-full">
                                {loading ? 'Linking…' : 'Link player'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
