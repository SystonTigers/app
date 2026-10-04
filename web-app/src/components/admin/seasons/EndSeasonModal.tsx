'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/session';
import { Icon } from '@/components/ui/Icon';
import { Dialog, Notice, bodyError } from '@/components/admin/AdminUi';

interface EndSeasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    season: { id: string; name: string };
    tenantId: string;
}

interface Preview {
    summary?: { played?: number; won?: number; goalsFor?: number; cleanSheets?: number };
    topScorer?: { id: string; name: string; goals: number } | null;
    topAssister?: { id: string; name: string; assists: number } | null;
}

interface Award {
    type: string;
    award_name: string;
    player_id: string;
}

/** End a season: a look at how it went, the club's awards, then archive it. */
export function EndSeasonModal({ isOpen, onClose, onSuccess, season, tenantId }: EndSeasonModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState<Preview | null>(null);
    const [squad, setSquad] = useState<Array<{ id: string; name: string }>>([]);
    const [awards, setAwards] = useState<Award[]>([]);
    const [customAwardName, setCustomAwardName] = useState('');
    const [customAwardPlayer, setCustomAwardPlayer] = useState('');

    useEffect(() => {
        if (!isOpen || !season) return;
        setLoading(true);
        setError('');
        apiFetch(`/api/v1/seasons/${encodeURIComponent(season.id)}/end-preview`)
            .then((res) => res.json())
            .then((data) => {
                if (data?.success) setPreview(data as Preview);
                else setError(bodyError(data, "We couldn't load this season's stats. Close this and try again."));
            })
            .catch(() => setError("We couldn't load this season's stats. Check your connection and try again."))
            .finally(() => setLoading(false));
        apiFetch('/api/v1/squad')
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => {
                const rows: Array<{ id: unknown; name?: unknown }> = Array.isArray(body?.data) ? body.data : [];
                setSquad(rows.map((r) => ({ id: String(r.id), name: String(r.name ?? '') })));
            })
            .catch(() => setSquad([]));
    }, [isOpen, season, tenantId]);

    const nameOf = (id: string) => squad.find((p) => p.id === id)?.name ?? 'Player';

    const handleAddAward = () => {
        if (!customAwardName.trim() || !customAwardPlayer) return;
        setAwards([...awards, { type: 'custom', award_name: customAwardName.trim(), player_id: customAwardPlayer }]);
        setCustomAwardName('');
        setCustomAwardPlayer('');
    };

    const handleConfirmEnd = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await apiFetch(`/api/v1/seasons/${encodeURIComponent(season.id)}/end`, { method: 'POST', body: JSON.stringify({ awards }) });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) throw new Error(bodyError(data, "The season wasn't ended. Please try again."));
            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "The season wasn't ended. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const stats = [
        { label: 'Matches', value: preview?.summary?.played ?? 0 },
        { label: 'Wins', value: preview?.summary?.won ?? 0 },
        { label: 'Goals', value: preview?.summary?.goalsFor ?? 0 },
        { label: 'Clean sheets', value: preview?.summary?.cleanSheets ?? 0 },
    ];

    return (
        <Dialog title={`End ${season.name}`} onClose={onClose} wide>
            <p className="text-muted mb-5">This archives the season and keeps its stats as they are.</p>
            {loading && !preview ? (
                <div className="py-16 text-center text-muted" role="status">Loading the season&apos;s stats…</div>
            ) : (
                <div className="space-y-6">
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {stats.map((s) => (
                            <div key={s.label} className="bg-surface-raised border border-border p-3 text-center">
                                <dd className="font-display text-3xl font-extrabold text-brand">{s.value}</dd>
                                <dt className="text-xs uppercase tracking-wider text-muted">{s.label}</dt>
                            </div>
                        ))}
                    </dl>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            { title: 'Top scorer', icon: 'ball' as const, who: preview?.topScorer?.name, what: preview?.topScorer ? `${preview.topScorer.goals} goals` : 'No goals recorded' },
                            { title: 'Most assists', icon: 'arrowRight' as const, who: preview?.topAssister?.name, what: preview?.topAssister ? `${preview.topAssister.assists} assists` : 'No assists recorded' },
                        ].map((t) => (
                            <div key={t.title} className="border border-border p-4 flex items-center gap-3">
                                <span className="w-10 h-10 hexagon bg-brand/15 text-brand flex items-center justify-center"><Icon name={t.icon} className="w-5 h-5" /></span>
                                <div>
                                    <p className="label mb-0">{t.title}</p>
                                    {t.who && <p className="font-semibold">{t.who}</p>}
                                    <p className="text-sm text-muted">{t.what}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <section aria-labelledby="awards-title">
                        <h3 id="awards-title" className="text-xl mb-3 flex items-center gap-2"><Icon name="trophy" className="w-5 h-5 text-brand" /> Season awards</h3>
                        {awards.length > 0 && (
                            <ul className="space-y-2 mb-3">
                                {awards.map((award, idx) => (
                                    <li key={idx} className="flex items-center justify-between gap-3 px-3 py-2 border border-brand/40 bg-brand/10">
                                        <span><strong>{award.award_name}</strong> <span className="text-muted">· {nameOf(award.player_id)}</span></span>
                                        <button type="button" onClick={() => setAwards(awards.filter((_, i) => i !== idx))} className="p-2 text-muted hover:text-red-400" aria-label={`Remove ${award.award_name}`}>
                                            <Icon name="trash" className="w-5 h-5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] items-end gap-3 bg-surface-raised border border-border p-4">
                            <div>
                                <label htmlFor="award-name" className="label">Award</label>
                                <input id="award-name" type="text" placeholder="e.g. Players' Player" value={customAwardName} onChange={(e) => setCustomAwardName(e.target.value)} className="field" />
                            </div>
                            <div>
                                <label htmlFor="award-player" className="label">Winner</label>
                                <select id="award-player" value={customAwardPlayer} onChange={(e) => setCustomAwardPlayer(e.target.value)} className="field">
                                    <option value="">Pick a player</option>
                                    {squad.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <button type="button" onClick={handleAddAward} disabled={!customAwardName.trim() || !customAwardPlayer} className="btn btn-secondary">Add</button>
                        </div>
                    </section>
                </div>
            )}
            {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
                <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
                <button type="button" onClick={handleConfirmEnd} disabled={loading || !preview} className="btn btn-danger">
                    {loading && preview ? 'Archiving…' : 'End and archive season'}
                </button>
            </div>
        </Dialog>
    );
}
