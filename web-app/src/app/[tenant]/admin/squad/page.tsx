'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { updateSquad, addPlayer } from '@/lib/sdk';
import { apiFetch, errorMessage } from '@/lib/session';
import { fullName, namePartsOf } from '@/lib/playerNames';
import { AddPlayerModal, type NewPlayer } from '@/components/admin/AddPlayerModal';
import { TransferCodeModal } from '@/components/TransferCodeModal';
import { ClaimTransferModal } from '@/components/ClaimTransferModal';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice, sdkErrorMessage } from '@/components/admin/AdminUi';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

/** A row from GET /api/v1/squad (staff get every field; we keep them all so saving doesn't wipe any). */
interface Player {
    id: string;
    name: string;
    first_name: string;
    last_name: string;
    number?: number | null;
    position?: string | null;
    dob?: string | null;
    photo_url?: string | null;
    role?: string | null;
    [key: string]: unknown;
}

type EditableField = 'first_name' | 'last_name' | 'number' | 'position' | 'role' | 'dob';

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

function dateValue(dob: string | null | undefined): string {
    if (!dob) return '';
    const d = new Date(dob);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

export default function SquadAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [transferModalPlayer, setTransferModalPlayer] = useState<Player | null>(null);
    const [claimModalPlayer, setClaimModalPlayer] = useState<Player | null>(null);

    const loadSquad = useCallback(async () => {
        setLoadError('');
        try {
            // Staff list: full names and every field (the public list follows the club's name style)
            const res = await apiFetch('/api/v1/squad');
            if (!res.ok) throw new Error(await errorMessage(res, "We couldn't load your squad."));
            const body = await res.json();
            const list: Player[] = Array.isArray(body?.data) ? body.data : [];
            // Older players only have `name`: show it as first name and surname
            setPlayers(list.map((p) => ({ ...p, ...namePartsOf(p) })));
            setDirty(false);
        } catch (err) {
            setLoadError(err instanceof Error && err.message ? err.message : "We couldn't load your squad. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSquad();
    }, [tenant, loadSquad]);

    async function handleAddPlayer(playerData: NewPlayer) {
        await addPlayer(playerData);
        setMessage({ tone: 'success', text: `${fullName(playerData.firstName, playerData.lastName)} has joined the squad.` });
        await loadSquad();
    }

    function updatePlayer(id: string, field: EditableField, value: string | number | null) {
        setDirty(true);
        setMessage(null);
        setPlayers(players.map((p) => {
            if (p.id !== id) return p;
            const next = { ...p, [field]: value };
            return field === 'first_name' || field === 'last_name' ? { ...next, name: fullName(next.first_name, next.last_name) } : next;
        }));
    }

    async function removePlayer(player: Player) {
        if (!confirm(`Remove ${player.name} from the squad? Their stats from past matches stay in the results.`)) return;
        setMessage(null);
        try {
            const res = await apiFetch(`/api/v1/squad/${encodeURIComponent(player.id)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(await errorMessage(res, `${player.name} wasn't removed. Please try again.`));
            setPlayers(players.filter((p) => p.id !== player.id));
            setMessage({ tone: 'success', text: `${player.name} has been removed from the squad.` });
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : `${player.name} wasn't removed. Please try again.` });
        }
    }

    async function handleSave() {
        if (players.some((p) => !p.first_name.trim())) {
            setMessage({ tone: 'error', text: 'Every player needs a first name. Fill in the empty ones and save again.' });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            await updateSquad(players);
            setDirty(false);
            setMessage({ tone: 'success', text: 'Squad saved.' });
        } catch (err) {
            setMessage({ tone: 'error', text: sdkErrorMessage(err, "The squad didn't save. Please try again.") });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="container py-8 md:py-10">
            <AddPlayerModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAddPlayer} />

            {transferModalPlayer && (
                <TransferCodeModal isOpen onClose={() => setTransferModalPlayer(null)} player={transferModalPlayer} />
            )}

            {claimModalPlayer && (
                <ClaimTransferModal isOpen onClose={() => setClaimModalPlayer(null)} newPlayer={claimModalPlayer} onSuccess={loadSquad} />
            )}

            <PageHeader
                eyebrow="Club admin"
                title="Squad"
                subtitle="Names, numbers and positions. Change what you need, then press Save."
                actions={
                    <>
                        <Link href={`/${tenant}/admin/players/photos`} className="btn btn-secondary">
                            <Icon name="image" className="w-4 h-4" /> Photos
                        </Link>
                        <button type="button" onClick={() => setShowAddModal(true)} className="btn btn-primary">
                            <Icon name="userPlus" className="w-4 h-4" /> Sign a player
                        </button>
                    </>
                }
            />

            {message && <div className="mb-4"><Notice tone={message.tone}>{message.text}</Notice></div>}

            {loading ? (
                <LoadingBlock label="Loading the squad" rows={4} />
            ) : loadError ? (
                <ErrorNote message={loadError} onRetry={() => { setLoading(true); loadSquad(); }} />
            ) : players.length === 0 ? (
                <EmptyNote
                    icon="users"
                    title="No players yet"
                    action={<button type="button" onClick={() => setShowAddModal(true)} className="btn btn-primary"><Icon name="userPlus" className="w-4 h-4" /> Sign a player</button>}
                >
                    Sign your first player, or bring the whole squad in at once from a spreadsheet on the Import page.
                </EmptyNote>
            ) : (
                <>
                    <div className="hidden xl:grid grid-cols-[72px_1fr_1fr_150px_150px_160px_250px] gap-3 px-4 pb-2 label mb-0">
                        <span>No.</span><span>First name</span><span>Surname</span><span>Position</span><span>Role</span><span>Date of birth</span><span className="text-right">Actions</span>
                    </div>
                    <ul className="space-y-2">
                        {players.map((player) => {
                            const id = (f: string) => `${f}-${player.id}`;
                            const who = player.name || 'this player';
                            return (
                                <li key={player.id} className="bg-surface border border-border chamfer-sm p-4 grid grid-cols-[64px_1fr_1fr] xl:grid-cols-[72px_1fr_1fr_150px_150px_160px_250px] gap-3 items-end">
                                    <div>
                                        <label htmlFor={id('number')} className="label xl:sr-only">No.</label>
                                        <input
                                            id={id('number')}
                                            type="number"
                                            inputMode="numeric"
                                            min={1}
                                            max={99}
                                            value={player.number ?? ''}
                                            onChange={(e) => {
                                                const n = parseInt(e.target.value, 10);
                                                updatePlayer(player.id, 'number', Number.isNaN(n) ? null : n);
                                            }}
                                            className="field px-3 text-center"
                                            placeholder="#"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={id('first')} className="label xl:sr-only">First name</label>
                                        <input
                                            id={id('first')}
                                            type="text"
                                            maxLength={40}
                                            autoComplete="off"
                                            aria-label={`First name of ${who}`}
                                            value={player.first_name}
                                            onChange={(e) => updatePlayer(player.id, 'first_name', e.target.value)}
                                            className="field"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={id('last')} className="label xl:sr-only">Surname</label>
                                        <input
                                            id={id('last')}
                                            type="text"
                                            maxLength={40}
                                            autoComplete="off"
                                            aria-label={`Surname of ${who}`}
                                            value={player.last_name}
                                            onChange={(e) => updatePlayer(player.id, 'last_name', e.target.value)}
                                            className="field"
                                        />
                                    </div>
                                    <div className="col-span-2 xl:col-span-1">
                                        <label htmlFor={id('position')} className="label xl:sr-only">Position</label>
                                        <select id={id('position')} value={player.position ?? ''} onChange={(e) => updatePlayer(player.id, 'position', e.target.value)} className="field px-3">
                                            {!player.position && <option value="">Choose</option>}
                                            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor={id('role')} className="label xl:sr-only">Role</label>
                                        <select id={id('role')} value={player.role || 'Player'} onChange={(e) => updatePlayer(player.id, 'role', e.target.value)} className="field px-3">
                                            <option value="Player">Player</option>
                                            <option value="Captain">Captain</option>
                                            <option value="Vice Captain">Vice captain</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3 xl:col-span-1">
                                        <label htmlFor={id('dob')} className="label xl:sr-only">Date of birth</label>
                                        <input
                                            id={id('dob')}
                                            type="date"
                                            value={dateValue(player.dob)}
                                            onChange={(e) => updatePlayer(player.id, 'dob', e.target.value)}
                                            className="field px-3"
                                        />
                                    </div>
                                    <div className="col-span-3 xl:col-span-1 flex items-center justify-end gap-1">
                                        <Link
                                            href={`/${tenant}/admin/players/${player.id}`}
                                            className="btn btn-sm btn-ghost px-3"
                                            title="Contacts and login code"
                                        >
                                            <Icon name="edit" className="w-4 h-4" /> Details
                                        </Link>
                                        <button type="button" onClick={() => setTransferModalPlayer(player)} className="p-2.5 text-muted hover:text-brand" aria-label={`Transfer code for ${who}`} title="Transfer code for a player who's leaving">
                                            <Icon name="logout" className="w-5 h-5" />
                                        </button>
                                        <button type="button" onClick={() => setClaimModalPlayer(player)} className="p-2.5 text-muted hover:text-brand" aria-label={`Bring ${who}'s stats from their old club`} title="Bring stats from their old club">
                                            <Icon name="login" className="w-5 h-5" />
                                        </button>
                                        <button type="button" onClick={() => removePlayer(player)} className="p-2.5 text-muted hover:text-red-400" aria-label={`Remove ${who}`} title="Remove from the squad">
                                            <Icon name="trash" className="w-5 h-5" />
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    {/* Save bar: stays in reach at the bottom while there are changes */}
                    <div className={`sticky bottom-20 lg:bottom-4 mt-4 z-30 transition-opacity ${dirty ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} aria-hidden={!dirty}>
                        <div className="bg-surface-raised border border-brand/50 shadow-2xl chamfer-sm px-4 py-3 flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold">You have changes that aren&apos;t saved.</span>
                            <button type="button" onClick={handleSave} disabled={saving || !dirty} className="btn btn-sm btn-primary">
                                {saving ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
