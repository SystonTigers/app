'use client';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { fullName, namePartsOf } from '@/lib/playerNames';
import { apiFetch, errorMessage } from '@/lib/session';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice, bodyError } from '@/components/admin/AdminUi';

const CONTACT_RELATIONSHIPS = [
    { value: 'mum', label: 'Mum' },
    { value: 'dad', label: 'Dad' },
    { value: 'step-mum', label: 'Step-mum' },
    { value: 'step-dad', label: 'Step-dad' },
    { value: 'grandparent', label: 'Grandparent' },
    { value: 'guardian', label: 'Guardian' },
    { value: 'other', label: 'Other' },
];

interface PageProps {
    params: Promise<{ tenant: string; playerId: string }>;
}

type ContactNo = 1 | 2 | 3;
type ContactField = 'relationship' | 'name' | 'phone' | 'email';
type ContactKey = `contact${ContactNo}_${ContactField}`;

type PlayerDetails = {
    id: string;
    name: string;
    first_name: string;
    last_name: string;
    number?: number | null;
    position?: string | null;
    dob?: string | null;
    login_code?: string | null;
} & Partial<Record<ContactKey, string | null>>;

type EditableField = 'first_name' | 'last_name' | 'number' | 'position' | 'dob' | ContactKey;

const CONTACTS: ContactNo[] = [1, 2, 3];

function dateValue(dob: string | null | undefined): string {
    if (!dob) return '';
    const d = new Date(dob);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

export default function PlayerDetailsPage({ params }: PageProps) {
    const { tenant, playerId } = use(params);
    const [player, setPlayer] = useState<PlayerDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [notFound, setNotFound] = useState(false);
    const [saving, setSaving] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

    const loadPlayer = useCallback(async () => {
        setLoadError('');
        try {
            // Staff view: first name and surname, contacts and the login code
            const res = await apiFetch(`/api/v1/squad/${encodeURIComponent(playerId)}`);
            if (res.status === 404) {
                setNotFound(true);
                return;
            }
            if (!res.ok) throw new Error(await errorMessage(res, "We couldn't load this player."));
            const body = await res.json();
            const loaded = body?.data as PlayerDetails | undefined;
            if (!loaded) {
                setNotFound(true);
                return;
            }
            setPlayer({ ...loaded, ...namePartsOf(loaded) });
        } catch (err) {
            setLoadError(err instanceof Error && err.message ? err.message : "We couldn't load this player. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, [playerId]);

    useEffect(() => {
        loadPlayer();
    }, [tenant, loadPlayer]);

    function updateField(field: EditableField, value: string | number | null) {
        if (!player) return;
        setMessage(null);
        const next = { ...player, [field]: value };
        setPlayer(field === 'first_name' || field === 'last_name' ? { ...next, name: fullName(next.first_name, next.last_name) } : next);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!player) return;
        if (!player.first_name.trim()) {
            setMessage({ tone: 'error', text: "Enter the player's first name." });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            const response = await apiFetch(`/api/v1/players/${encodeURIComponent(playerId)}`, {
                method: 'PUT',
                body: JSON.stringify(player),
            });
            const body = await response.json().catch(() => null);
            if (!response.ok || body?.success === false) throw new Error(bodyError(body, "The changes didn't save. Please try again."));
            setMessage({ tone: 'success', text: `${player.name} saved.` });
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "The changes didn't save. Please try again." });
        } finally {
            setSaving(false);
        }
    }

    async function regenerateCode() {
        if (player?.login_code && !confirm('Make a new login code? The old one will stop working.')) return;
        setRegenerating(true);
        setMessage(null);
        try {
            const response = await apiFetch(`/api/v1/players/${encodeURIComponent(playerId)}/regenerate-code`, { method: 'POST' });
            const body = await response.json().catch(() => null);
            if (!response.ok || !body?.code) throw new Error(bodyError(body, "A new code wasn't made. Please try again."));
            setPlayer((prev) => (prev ? { ...prev, login_code: body.code as string } : null));
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "A new code wasn't made. Please try again." });
        } finally {
            setRegenerating(false);
        }
    }

    async function copyCode() {
        if (!player?.login_code) return;
        try {
            await navigator.clipboard.writeText(player.login_code);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        } catch {
            window.prompt('Copy this login code:', player.login_code);
        }
    }

    const back = (
        <Link href={`/${tenant}/admin/squad`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand mb-4 min-h-[40px]">
            <Icon name="arrowLeft" className="w-4 h-4" /> Squad
        </Link>
    );

    if (loading) {
        return <div className="container py-8 md:py-10 max-w-4xl">{back}<LoadingBlock label="Loading the player" /></div>;
    }
    if (loadError) {
        return <div className="container py-8 md:py-10 max-w-4xl">{back}<ErrorNote message={loadError} onRetry={() => { setLoading(true); loadPlayer(); }} /></div>;
    }
    if (notFound || !player) {
        return (
            <div className="container py-8 md:py-10 max-w-4xl">
                {back}
                <EmptyNote icon="users" title="Player not found" action={<Link href={`/${tenant}/admin/squad`} className="btn btn-primary">Back to the squad</Link>}>
                    They may have been removed from the squad.
                </EmptyNote>
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="container py-8 md:py-10 max-w-4xl" noValidate>
            {back}
            <PageHeader
                eyebrow="Player details"
                title={player.name || 'New player'}
                subtitle="Their name, number and who to contact. Only club staff see contacts."
                actions={
                    <button type="submit" disabled={saving} className="btn btn-primary">
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                }
            />

            {message && <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div>}

            <div className="space-y-6">
                {/* Login code */}
                <section className="card border-brand/40" aria-labelledby="login-code-title">
                    <h2 id="login-code-title" className="text-2xl flex items-center gap-2">
                        <Icon name="lock" className="w-5 h-5 text-brand" /> Login code
                    </h2>
                    <p className="text-sm text-muted mt-1 mb-4">
                        Give this code to the player and their parents so they can log in to the club app.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-background border border-border px-5 py-3 font-mono text-2xl tracking-[0.2em] text-brand min-w-[12rem] text-center">
                            {player.login_code || <span className="text-base tracking-normal font-sans text-muted">No code yet</span>}
                        </div>
                        {player.login_code && (
                            <button type="button" onClick={copyCode} className="btn btn-secondary">
                                <Icon name={codeCopied ? 'check' : 'copy'} className="w-4 h-4" /> {codeCopied ? 'Copied' : 'Copy'}
                            </button>
                        )}
                        <button type="button" onClick={regenerateCode} disabled={regenerating} className="btn btn-secondary">
                            <Icon name="refresh" className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                            {player.login_code ? 'New code' : 'Make a code'}
                        </button>
                    </div>
                </section>

                {/* Basic info */}
                <section className="card" aria-labelledby="basics-title">
                    <h2 id="basics-title" className="text-2xl mb-4">About the player</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="first-name" className="label">First name</label>
                            <input id="first-name" type="text" maxLength={40} autoComplete="off" value={player.first_name} onChange={(e) => updateField('first_name', e.target.value)} className="field" required />
                        </div>
                        <div>
                            <label htmlFor="last-name" className="label">Surname</label>
                            <input id="last-name" type="text" maxLength={40} autoComplete="off" value={player.last_name} onChange={(e) => updateField('last_name', e.target.value)} className="field" />
                        </div>
                        <div>
                            <label htmlFor="squad-number" className="label">Squad number</label>
                            <input
                                id="squad-number"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={99}
                                value={player.number ?? ''}
                                onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    updateField('number', Number.isNaN(n) ? null : n);
                                }}
                                className="field"
                                placeholder="#"
                            />
                        </div>
                        <div>
                            <label htmlFor="position" className="label">Position</label>
                            <select id="position" value={player.position ?? ''} onChange={(e) => updateField('position', e.target.value)} className="field">
                                <option value="">Choose a position</option>
                                <option value="Goalkeeper">Goalkeeper</option>
                                <option value="Defender">Defender</option>
                                <option value="Midfielder">Midfielder</option>
                                <option value="Forward">Forward</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="dob" className="label">Date of birth</label>
                            <input id="dob" type="date" value={dateValue(player.dob)} onChange={(e) => updateField('dob', e.target.value)} className="field" />
                        </div>
                    </div>
                </section>

                {/* Contacts */}
                <section className="card" aria-labelledby="contacts-title">
                    <h2 id="contacts-title" className="text-2xl">Contacts</h2>
                    <p className="text-sm text-muted mt-1 mb-5">Up to three people to call in an emergency.</p>
                    <div className="space-y-4">
                        {CONTACTS.map((n) => (
                            <fieldset key={n} className="bg-surface-raised border border-border p-4 chamfer-sm">
                                <legend className="sr-only">Contact {n}</legend>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="w-8 h-8 hexagon bg-brand/15 text-brand font-display font-extrabold flex items-center justify-center" aria-hidden="true">{n}</span>
                                    <label htmlFor={`contact${n}-relationship`} className="sr-only">Contact {n}: who they are</label>
                                    <select
                                        id={`contact${n}-relationship`}
                                        value={player[`contact${n}_relationship`] ?? ''}
                                        onChange={(e) => updateField(`contact${n}_relationship`, e.target.value)}
                                        className="field max-w-[14rem]"
                                    >
                                        <option value="">Who are they?</option>
                                        {CONTACT_RELATIONSHIPS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label htmlFor={`contact${n}-name`} className="label">Name</label>
                                        <input id={`contact${n}-name`} type="text" autoComplete="off" value={player[`contact${n}_name`] ?? ''} onChange={(e) => updateField(`contact${n}_name`, e.target.value)} className="field" />
                                    </div>
                                    <div>
                                        <label htmlFor={`contact${n}-phone`} className="label">Phone</label>
                                        <input id={`contact${n}-phone`} type="tel" autoComplete="off" value={player[`contact${n}_phone`] ?? ''} onChange={(e) => updateField(`contact${n}_phone`, e.target.value)} className="field" />
                                    </div>
                                    <div>
                                        <label htmlFor={`contact${n}-email`} className="label">Email</label>
                                        <input id={`contact${n}-email`} type="email" autoComplete="off" value={player[`contact${n}_email`] ?? ''} onChange={(e) => updateField(`contact${n}_email`, e.target.value)} className="field" />
                                    </div>
                                </div>
                            </fieldset>
                        ))}
                    </div>
                </section>

                <div className="flex justify-end">
                    <button type="submit" disabled={saving} className="btn btn-primary w-full sm:w-auto">
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </form>
    );
}
