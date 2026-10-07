'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/Page';
import { ErrorNote, LoadingBlock, Notice } from '@/components/admin/AdminUi';
import { ClubExtraGate } from '@/components/ClubExtraGate';
import { FormCard } from '@/components/signingOn/FormCard';
import { SquadList } from '@/components/signingOn/SquadList';
import { AnswersPanel } from '@/components/signingOn/AnswersPanel';
import { signingOnCall, type SigningOnEntry, type SigningOnOverview, type SquadStatus } from '@/components/signingOn/types';

function Total({ value, label }: { value: string; label: string }) {
    return (
        <div className="card p-4 text-center flex flex-col-reverse">
            <dt className="text-xs font-bold text-muted uppercase tracking-wider">{label}</dt>
            <dd className="font-display text-4xl font-extrabold text-brand">{value}</dd>
        </div>
    );
}

/**
 * Signing on, the same as the app: this season's form (fee, how to pay, code
 * of conduct) and who in the squad has signed on and paid. Families sign on
 * in the club app; staff read their answers here and mark fees paid.
 */
function SigningOnAdmin() {
    const [data, setData] = useState<SigningOnOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [open, setOpen] = useState<SquadStatus | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const closeAnswers = useCallback(() => setOpen(null), []);

    const load = useCallback(async () => {
        setError('');
        try {
            setData(await signingOnCall<SigningOnOverview>('', {}, "We couldn't load signing on. Please try again."));
        } catch (err) {
            setError(err instanceof Error ? err.message : "We couldn't load signing on. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const togglePaid = async (player: SquadStatus) => {
        setBusyId(player.playerId);
        setMessage(null);
        try {
            const entry = await signingOnCall<SigningOnEntry>(`/players/${encodeURIComponent(player.playerId)}/paid`, {
                method: 'PUT',
                body: JSON.stringify({ paid: !player.paid }),
            }, "That didn't save. Please try again.");
            setData((d) => d && { ...d, squad: d.squad?.map((p) => (p.playerId === player.playerId ? { ...p, paid: entry.paid } : p)) });
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "That didn't save. Please try again." });
        } finally {
            setBusyId(null);
        }
    };

    const squad = data?.squad ?? [];
    const signedOn = squad.filter((p) => p.signedOn).length;
    const paid = squad.filter((p) => p.signedOn && p.paid).length;
    const unlinked = squad.filter((p) => !p.signedOn && p.linkedParents === 0).length;

    return (
        <div className="container py-8 md:py-10 max-w-5xl">
            <PageHeader
                eyebrow="Club admin"
                title="Signing on"
                subtitle={data ? `${data.season.label}. Families sign their children on in the club app; you see who's done it and mark fees paid.` : 'Families sign their children on in the club app; you see who has done it and mark fees paid.'}
            />

            {loading ? (
                <LoadingBlock label="Loading signing on" />
            ) : error || !data ? (
                <ErrorNote message={error || "We couldn't load signing on. Please try again."} onRetry={() => { setLoading(true); load(); }} />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6 items-start">
                    <FormCard form={data.form} seasonLabel={data.season.label} onSaved={(form) => setData((d) => d && { ...d, form })} />
                    <section aria-labelledby="signing-on-squad-title" className="min-w-0">
                        <h2 id="signing-on-squad-title" className="text-2xl mb-3">The squad</h2>
                        <dl className="grid grid-cols-2 gap-3 mb-4">
                            <Total value={`${signedOn} of ${squad.length}`} label="Signed on" />
                            <Total value={String(paid)} label="Paid" />
                        </dl>
                        {unlinked > 0 && (
                            <div className="mb-4">
                                <Notice tone="info">
                                    {unlinked === 1 ? '1 player has' : `${unlinked} players have`} no parent linked. Only linked parents can sign on in the app, so send their families a parent code from the club app (menu: Photo &amp; video consent).
                                </Notice>
                            </div>
                        )}
                        {message && <div className="mb-4"><Notice tone={message.tone}>{message.text}</Notice></div>}
                        <SquadList squad={squad} busyId={busyId} onOpen={setOpen} onTogglePaid={togglePaid} />
                    </section>
                </div>
            )}

            {open && <AnswersPanel player={open} onClose={closeAnswers} />}
        </div>
    );
}

/** Only for clubs that have switched this extra on (Settings, Club extras). */
export default function RegistrationSettingsPage() {
    return (
        <ClubExtraGate module="signingOn">
            <SigningOnAdmin />
        </ClubExtraGate>
    );
}
