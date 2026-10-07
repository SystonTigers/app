'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { formatDate, formatDateTime } from '@/lib/format';
import { Dialog, ErrorNote, LoadingBlock, Pill } from '@/components/admin/AdminUi';
import { signingOnCall, type SigningOnEntry, type SquadStatus } from './types';

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="py-2 grid grid-cols-[8rem_1fr] gap-3">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-sm text-foreground break-words whitespace-pre-line">{children}</dd>
        </div>
    );
}

const yesNo = (on: boolean) => <Pill tone={on ? 'success' : 'neutral'}>{on ? 'Yes' : 'No'}</Pill>;

/**
 * One player's signing-on answers for this season. Medical notes and allergies
 * are only shown here, never in the squad list.
 */
export function AnswersPanel({ player, onClose }: { player: SquadStatus; onClose: () => void }) {
    const [entry, setEntry] = useState<SigningOnEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setEntry(await signingOnCall<SigningOnEntry | null>(`/players/${encodeURIComponent(player.playerId)}`, {}, "We couldn't load their answers. Please try again."));
        } catch (err) {
            setError(err instanceof Error ? err.message : "We couldn't load their answers. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [player.playerId]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <Dialog title={player.name} onClose={onClose} wide>
            {loading ? (
                <LoadingBlock label="Loading their answers" rows={2} />
            ) : error ? (
                <ErrorNote message={error} onRetry={load} />
            ) : !entry ? (
                <p className="text-muted">{player.name} hasn&apos;t signed on this season yet.</p>
            ) : (
                <div className="space-y-6">
                    <p className="text-sm text-muted">Sent {formatDateTime(entry.submittedAt)}{entry.paid && entry.paidAt ? ` · paid ${formatDate(entry.paidAt)}` : ''}</p>
                    <section>
                        <h3 className="text-xl mb-1">Details</h3>
                        <dl className="divide-y divide-border">
                            <Row label="Date of birth">{entry.details.dob ? formatDate(entry.details.dob) : 'Not given'}</Row>
                            <Row label="Address">{entry.details.address || 'Not given'}</Row>
                            <Row label="School">{entry.details.school || 'Not given'}</Row>
                            <Row label="Medical notes">{entry.details.medical || 'None'}</Row>
                            <Row label="Allergies">{entry.details.allergies || 'None'}</Row>
                        </dl>
                    </section>
                    <section>
                        <h3 className="text-xl mb-1">Emergency contacts</h3>
                        <ul className="divide-y divide-border">
                            {entry.contacts.map((c, i) => (
                                <li key={i} className="py-2 text-sm">
                                    <strong className="text-foreground">{c.name}</strong>
                                    {c.relationship && <span className="text-muted"> · {c.relationship}</span>}
                                    <span className="block">
                                        <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="text-brand hover:underline">{c.phone}</a>
                                        {c.email && <> · <a href={`mailto:${c.email}`} className="text-brand hover:underline break-all">{c.email}</a></>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                    <section>
                        <h3 className="text-xl mb-1">Consent</h3>
                        <dl className="divide-y divide-border">
                            <Row label="Photos">{yesNo(entry.photos)}</Row>
                            <Row label="Video">{yesNo(entry.video)}</Row>
                            <Row label="Code of conduct">{entry.conductAgreed ? <Pill tone="success">Agreed</Pill> : <Pill tone="neutral">Not asked</Pill>}</Row>
                        </dl>
                    </section>
                </div>
            )}
        </Dialog>
    );
}
