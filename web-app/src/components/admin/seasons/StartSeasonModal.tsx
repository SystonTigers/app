'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/session';
import { ukDay } from '@/lib/format';
import { Dialog, Notice, bodyError } from '@/components/admin/AdminUi';

interface StartSeasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    tenantId: string;
}

interface SquadPlayer {
    id: string;
    name: string;
    position: string | null;
}

/** Start a new season, carrying over the players who are staying. */
export function StartSeasonModal({ isOpen, onClose, onSuccess, tenantId }: StartSeasonModalProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState(ukDay());
    const [copySquad, setCopySquad] = useState(true);
    const [squad, setSquad] = useState<SquadPlayer[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!isOpen) return;
        apiFetch('/api/v1/squad')
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => {
                const rows: Array<{ id: unknown; name?: unknown; position?: unknown }> = Array.isArray(body?.data) ? body.data : [];
                const list = rows.map((r) => ({ id: String(r.id), name: String(r.name ?? ''), position: r.position ? String(r.position) : null }));
                setSquad(list);
                setSelectedPlayers(new Set(list.map((p) => p.id)));
            })
            .catch(() => setSquad([]));
    }, [isOpen, tenantId]);

    const close = () => {
        setStep(1);
        setError('');
        onClose();
    };

    const handleTogglePlayer = (id: string) => {
        const next = new Set(selectedPlayers);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedPlayers(next);
    };

    const handleStartSeason = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await apiFetch('/api/v1/seasons/start-new', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim(), startDate, copySquad, playerIds: copySquad ? Array.from(selectedPlayers) : [] }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(bodyError(data, "The season didn't start. Please try again."));
            onSuccess();
            close();
        } catch (err) {
            setError(err instanceof Error ? err.message : "The season didn't start. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog title="Start a new season" onClose={close} wide>
            {step === 1 && (
                <div className="space-y-4">
                    <div>
                        <label htmlFor="season-name" className="label">Season name</label>
                        <input id="season-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2026-27" className="field" />
                    </div>
                    <div>
                        <label htmlFor="season-start" className="label">Starts on</label>
                        <input id="season-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="field" />
                    </div>
                    {squad.length > 0 && (
                        <label htmlFor="copySquad" className="flex items-start gap-3 min-h-[40px] cursor-pointer pt-2">
                            <input type="checkbox" id="copySquad" checked={copySquad} onChange={(e) => setCopySquad(e.target.checked)} className="mt-1 w-5 h-5 accent-[rgb(var(--brand-rgb))]" />
                            <span>
                                <span className="font-semibold">Carry over the squad</span>
                                <span className="block text-sm text-muted">Players who are staying are added to the new season.</span>
                            </span>
                        </label>
                    )}
                    {error && <Notice tone="error">{error}</Notice>}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                        <button type="button" onClick={close} className="btn btn-ghost">Cancel</button>
                        <button
                            type="button"
                            onClick={() => (copySquad && squad.length ? setStep(2) : handleStartSeason())}
                            disabled={!name.trim() || !startDate || loading}
                            className="btn btn-primary"
                        >
                            {copySquad && squad.length ? 'Next: check the squad' : loading ? 'Starting…' : 'Start season'}
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <p className="text-muted">Untick anyone who has left the club.</p>
                    <ul className="max-h-72 overflow-y-auto border border-border divide-y divide-border">
                        {squad.map((p) => (
                            <li key={p.id}>
                                <label className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] cursor-pointer hover:bg-surface-raised">
                                    <input type="checkbox" checked={selectedPlayers.has(p.id)} onChange={() => handleTogglePlayer(p.id)} className="w-5 h-5 accent-[rgb(var(--brand-rgb))]" />
                                    <span className="flex-1">{p.name}</span>
                                    {p.position && <span className="text-xs text-muted uppercase tracking-wider">{p.position}</span>}
                                </label>
                            </li>
                        ))}
                    </ul>
                    {error && <Notice tone="error">{error}</Notice>}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setStep(1)} className="btn btn-ghost">Back</button>
                        <button type="button" onClick={handleStartSeason} disabled={loading} className="btn btn-primary">
                            {loading ? 'Starting…' : `Start season (${selectedPlayers.size} ${selectedPlayers.size === 1 ? 'player' : 'players'})`}
                        </button>
                    </div>
                </div>
            )}
        </Dialog>
    );
}
