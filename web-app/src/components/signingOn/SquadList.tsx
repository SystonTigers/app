'use client';

import { Icon } from '@/components/ui/Icon';
import { EmptyNote } from '@/components/ui/Page';
import { Pill } from '@/components/admin/AdminUi';
import type { SquadStatus } from './types';

interface SquadListProps {
    squad: SquadStatus[];
    /** Player whose paid switch is saving */
    busyId: string | null;
    onOpen: (player: SquadStatus) => void;
    onTogglePaid: (player: SquadStatus) => void;
}

/** Who has signed on and paid this season. Only a signed-on player's row opens their answers. */
export function SquadList({ squad, busyId, onOpen, onTogglePaid }: SquadListProps) {
    if (!squad.length) {
        return (
            <EmptyNote icon="users" title="No players in the squad yet">
                Add your players in Squad, then families can sign them on in the club app.
            </EmptyNote>
        );
    }

    return (
        <ul className="space-y-3">
            {squad.map((p) => {
                const label = `${p.number != null ? `#${p.number} ` : ''}${p.name}`;
                return (
                    <li key={p.playerId} className="card py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                                {p.signedOn ? (
                                    <button type="button" onClick={() => onOpen(p)} className="group text-left" aria-label={`See ${p.name}'s signing-on answers`}>
                                        <span className="flex items-center gap-1 font-display text-xl font-extrabold uppercase tracking-wide text-foreground group-hover:text-brand">
                                            {label}
                                            <Icon name="chevronRight" className="w-4 h-4 text-brand" />
                                        </span>
                                    </button>
                                ) : (
                                    <span className="font-display text-xl font-extrabold uppercase tracking-wide text-foreground">{label}</span>
                                )}
                                <div className="mt-1 flex flex-wrap gap-2">
                                    <Pill tone={p.signedOn ? 'success' : 'neutral'}>{p.signedOn ? 'Signed on' : 'Not yet'}</Pill>
                                    {p.signedOn && <Pill tone={p.paid ? 'success' : 'warning'}>{p.paid ? 'Paid' : 'Not paid'}</Pill>}
                                    {p.linkedParents === 0
                                        ? <Pill tone="warning">No parent linked</Pill>
                                        : <Pill>{p.linkedParents === 1 ? '1 parent linked' : `${p.linkedParents} parents linked`}</Pill>}
                                </div>
                            </div>
                            {p.signedOn && (
                                <button
                                    type="button"
                                    disabled={busyId === p.playerId}
                                    onClick={() => onTogglePaid(p)}
                                    className={`btn btn-sm ${p.paid ? 'btn-ghost' : 'btn-secondary'}`}
                                    aria-label={p.paid ? `Mark ${p.name} as not paid` : `Mark ${p.name} as paid`}
                                >
                                    {busyId === p.playerId ? 'Saving…' : p.paid ? 'Mark not paid' : <><Icon name="check" className="w-4 h-4" /> Mark paid</>}
                                </button>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
