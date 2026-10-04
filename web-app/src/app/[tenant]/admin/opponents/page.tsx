'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/session';
import { clubInitials } from '@/lib/brand';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { Dialog, ErrorNote, LoadingBlock, Notice, bodyError } from '@/components/admin/AdminUi';

interface Opponent {
    id: string;
    team_name: string;
    normalized_name: string;
    status: 'pending' | 'approved' | 'custom';
    effective_badge_url: string | null;
    pending_badge_url: string | null;
    reference_badge_url: string | null;
    needs_approval: boolean;
}

export default function AdminOpponentsPage() {
    const params = useParams();
    const tenantSlug = params.tenant as string;
    const [opponents, setOpponents] = useState<Opponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [selectedOpponent, setSelectedOpponent] = useState<Opponent | null>(null);
    const [newTeamName, setNewTeamName] = useState('');
    const [uploading, setUploading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

    const fetchOpponents = useCallback(async () => {
        setLoadError('');
        try {
            const res = await apiFetch(`/api/v1/opponents?tenant_id=${encodeURIComponent(tenantSlug)}`);
            if (!res.ok) throw new Error(await errorMessage(res, "We couldn't load your opponents."));
            const data = await res.json();
            setOpponents(Array.isArray(data?.data) ? (data.data as Opponent[]) : []);
        } catch (err) {
            setLoadError(err instanceof Error && err.message ? err.message : "We couldn't load your opponents. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, [tenantSlug]);

    useEffect(() => {
        fetchOpponents();
    }, [fetchOpponents]);

    const handleConfirmBadge = async (action: 'confirm' | 'reject') => {
        if (!selectedOpponent) return;
        setMessage(null);
        try {
            const res = await apiFetch(`/api/v1/opponents/${selectedOpponent.id}/confirm`, {
                method: 'POST',
                body: JSON.stringify({ action }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(bodyError(data, "That didn't save. Please try again."));
            setMessage({ tone: 'success', text: action === 'confirm' ? `Badge saved for ${selectedOpponent.team_name}.` : `Suggestion removed. Upload ${selectedOpponent.team_name}'s badge yourself.` });
            setSelectedOpponent(null);
            fetchOpponents();
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "That didn't save. Please try again." });
        }
    };

    const handleAddOpponent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim()) return;
        setMessage(null);
        try {
            const res = await apiFetch('/api/v1/opponents', {
                method: 'POST',
                body: JSON.stringify({ tenant_id: tenantSlug, team_name: newTeamName.trim() }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(bodyError(data, "That team wasn't added. Please try again."));
            setMessage({ tone: 'success', text: `${newTeamName.trim()} added.` });
            setNewTeamName('');
            fetchOpponents();
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "That team wasn't added. Please try again." });
        }
    };

    const handleUploadBadge = async (opponent: Opponent, file: File) => {
        setUploading(opponent.id);
        setMessage(null);
        try {
            const res = await apiFetch(`/api/v1/opponents/${opponent.id}/upload-badge`, {
                method: 'POST',
                headers: { 'Content-Type': file.type },
                body: await file.arrayBuffer(),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(bodyError(data, "We couldn't upload that badge."));
            setMessage({ tone: 'success', text: `Badge saved for ${opponent.team_name}.` });
            fetchOpponents();
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "We couldn't reach the server. Check your connection and try again." });
        } finally {
            setUploading(null);
        }
    };

    const openGoogleSearch = (teamName: string) => {
        const query = encodeURIComponent(`${teamName} badge logo football`);
        window.open(`https://www.google.com/search?q=${query}&tbm=isch`, '_blank', 'noopener');
    };

    const pendingApproval = opponents.filter((o) => o.needs_approval);

    return (
        <div className="container py-8 md:py-10">
            <PageHeader
                eyebrow="Club admin"
                title="Opponents"
                subtitle="Upload each opponent's badge once (PNG or JPG) and it's used on every match graphic and post. Without one we show their initials. Teams are added here when you play them."
            />

            {message && <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div>}

            <form onSubmit={handleAddOpponent} className="card mb-6">
                <label htmlFor="new-opponent" className="label">Add a team</label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input id="new-opponent" type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="e.g. Thurmaston Magpies" className="field flex-1" />
                    <button type="submit" disabled={!newTeamName.trim()} className="btn btn-primary"><Icon name="plus" className="w-4 h-4" /> Add team</button>
                </div>
            </form>

            {loading ? (
                <LoadingBlock label="Loading opponents" />
            ) : loadError ? (
                <ErrorNote message={loadError} onRetry={() => { setLoading(true); fetchOpponents(); }} />
            ) : (
                <div className="space-y-6">
                    {pendingApproval.length > 0 && (
                        <section className="card border-amber-500/50" aria-labelledby="pending-title">
                            <h2 id="pending-title" className="text-2xl flex items-center gap-2 mb-4">
                                <Icon name="alert" className="w-5 h-5 text-amber-300" /> Badges to check ({pendingApproval.length})
                            </h2>
                            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                {pendingApproval.map((opponent) => (
                                    <li key={opponent.id}>
                                        <button type="button" onClick={() => setSelectedOpponent(opponent)} className="w-full text-left bg-surface-raised border border-border p-3 hover:border-amber-400 transition-colors">
                                            <span className="aspect-square bg-background flex items-center justify-center overflow-hidden mb-2">
                                                {opponent.pending_badge_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={opponent.pending_badge_url} alt="" className="w-full h-full object-contain p-2" />
                                                ) : (
                                                    <span className="font-display text-3xl font-extrabold text-muted">{clubInitials(opponent.team_name)}</span>
                                                )}
                                            </span>
                                            <span className="block text-sm font-semibold truncate">{opponent.team_name}</span>
                                            <span className="block text-xs text-amber-300">Tap to check</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {opponents.length === 0 ? (
                        <EmptyNote icon="shield" title="No opponents yet">
                            Teams appear here when you add fixtures or results against them. You can also add one above.
                        </EmptyNote>
                    ) : (
                        <section className="card" aria-labelledby="all-title">
                            <h2 id="all-title" className="text-2xl mb-4">All opponents ({opponents.length})</h2>
                            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {opponents.map((opponent) => (
                                    <li key={opponent.id} className="bg-surface-raised border border-border p-3 flex flex-col">
                                        <span className="aspect-square bg-background flex items-center justify-center overflow-hidden">
                                            {opponent.effective_badge_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={opponent.effective_badge_url} alt={`${opponent.team_name} badge`} className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <span className="font-display text-3xl font-extrabold text-muted">{clubInitials(opponent.team_name)}</span>
                                            )}
                                        </span>
                                        <span className="text-sm font-semibold text-center mt-2 truncate">{opponent.team_name}</span>
                                        <span className="flex justify-center gap-1 mt-2">
                                            <label className={`p-2.5 text-muted hover:text-brand cursor-pointer ${uploading === opponent.id ? 'opacity-50 pointer-events-none' : ''}`} title="Upload badge">
                                                <Icon name={uploading === opponent.id ? 'refresh' : 'upload'} className={`w-5 h-5 ${uploading === opponent.id ? 'animate-spin' : ''}`} />
                                                <span className="sr-only">Upload {opponent.team_name}&apos;s badge</span>
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg"
                                                    className="sr-only"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0];
                                                        if (f) handleUploadBadge(opponent, f);
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>
                                            <button type="button" onClick={() => openGoogleSearch(opponent.team_name)} className="p-2.5 text-muted hover:text-brand" aria-label={`Search the web for ${opponent.team_name}'s badge`} title="Search for the badge">
                                                <Icon name="search" className="w-5 h-5" />
                                            </button>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            )}

            {selectedOpponent && (
                <Dialog title="Is this the right badge?" onClose={() => setSelectedOpponent(null)}>
                    <p className="text-muted mb-5">We found this badge for <strong className="text-foreground">{selectedOpponent.team_name}</strong>.</p>
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1">
                            <p className="label text-center">Suggested</p>
                            <div className="aspect-square bg-background border border-border flex items-center justify-center overflow-hidden">
                                {selectedOpponent.pending_badge_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={selectedOpponent.pending_badge_url} alt="Suggested badge" className="w-full h-full object-contain p-4" />
                                ) : (
                                    <Icon name="info" className="w-10 h-10 text-muted" />
                                )}
                            </div>
                        </div>
                        {selectedOpponent.reference_badge_url && (
                            <div className="flex-1">
                                <p className="label text-center">From the FA</p>
                                <div className="aspect-square bg-background border border-border flex items-center justify-center overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={selectedOpponent.reference_badge_url} alt="Badge from the FA" className="w-full h-full object-contain p-4" />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        <button type="button" onClick={() => handleConfirmBadge('confirm')} className="btn btn-primary w-full"><Icon name="check" className="w-4 h-4" /> Yes, use this badge</button>
                        <button type="button" onClick={() => openGoogleSearch(selectedOpponent.team_name)} className="btn btn-secondary w-full"><Icon name="search" className="w-4 h-4" /> Find the right one</button>
                        <button type="button" onClick={() => handleConfirmBadge('reject')} className="btn btn-ghost w-full">No, I&apos;ll upload it myself</button>
                    </div>
                </Dialog>
            )}
        </div>
    );
}
