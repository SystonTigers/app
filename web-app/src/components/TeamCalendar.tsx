'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDate, ukDay } from '@/lib/format';
import { EmptyNote, PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';

type Rsvp = 'yes' | 'no' | 'maybe';

/** As GET /api/v1/events returns it (`date` yyyy-mm-dd and `time` HH:MM or "TBC", UK time) */
interface CalendarEvent {
    id: string;
    title: string;
    date: string;
    time: string;
    location?: string | null;
    description?: string | null;
    rsvp_yes_count: number;
    rsvp_no_count: number;
    rsvp_maybe_count: number;
}

const RSVP_LABEL: Record<Rsvp, string> = { yes: 'Going', maybe: 'Maybe', no: "Can't go" };

/** The club's events (members only): what's on, and whether you're going. */
export function TeamCalendar() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [mine, setMine] = useState<Record<string, Rsvp>>({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [rsvpError, setRsvpError] = useState('');
    const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

    const load = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        setLoadError('');
        try {
            const res = await apiFetch('/api/v1/events');
            if (!res.ok) {
                setLoadError(await errorMessage(res, "We couldn't load the calendar. Please try again."));
                return;
            }
            const data = await res.json();
            setEvents(Array.isArray(data.data) ? data.data : []);
        } catch (err) {
            console.error('Failed to load events', err);
            setLoadError("We couldn't load the calendar. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function rsvp(eventId: string, status: Rsvp) {
        const before = mine[eventId];
        setMine({ ...mine, [eventId]: status });
        setRsvpError('');
        try {
            const res = await apiFetch(`/api/v1/events/${eventId}/rsvp`, { method: 'POST', body: JSON.stringify({ status }) });
            if (!res.ok) throw new Error(`rsvp ${res.status}`);
            await load(true);
        } catch (err) {
            console.error('RSVP failed', err);
            setMine((m) => {
                const next = { ...m };
                if (before) next[eventId] = before;
                else delete next[eventId];
                return next;
            });
            setRsvpError("Your answer didn't save. Please try again.");
        }
    }

    const today = ukDay();
    const shown = events
        .filter((e) => (filter === 'upcoming' ? e.date >= today : e.date < today))
        .sort((a, b) => (filter === 'upcoming' ? 1 : -1) * `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

    return (
        <div>
            <PageHeader eyebrow="Club" title="Calendar" subtitle="Club events, socials and fixtures. Let the club know if you're going." />

            <div className="flex gap-2 mb-6" role="tablist" aria-label="Which events">
                {(['upcoming', 'past'] as const).map((f) => (
                    <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`btn btn-sm min-h-[40px] ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
                        {f === 'upcoming' ? 'Coming up' : 'Past'}
                    </button>
                ))}
            </div>

            {rsvpError && <p className="card border-red-500/40 text-red-300 py-3 mb-6" role="alert">{rsvpError}</p>}

            {loading ? (
                <div className="space-y-4" aria-busy="true" aria-label="Loading the calendar">
                    {[1, 2, 3].map((i) => <div key={i} className="h-32 card animate-pulse" />)}
                </div>
            ) : loadError ? (
                <EmptyNote icon="alert" title="The calendar didn't load" action={<button type="button" onClick={() => load()} className="btn btn-primary">Try again</button>}>
                    <p role="alert">{loadError}</p>
                </EmptyNote>
            ) : shown.length === 0 ? (
                <EmptyNote icon="calendar" title={filter === 'upcoming' ? 'Nothing on yet' : 'No past events'}>
                    {filter === 'upcoming' ? 'New club events show here as soon as staff add them.' : 'Events move here once they have happened.'}
                </EmptyNote>
            ) : (
                <ul className="space-y-4">
                    {shown.map((event) => (
                        <li key={event.id} className="card p-4 md:p-5 flex flex-col sm:flex-row gap-4">
                            <div className="shrink-0 sm:w-24 bg-surface-raised border border-border chamfer-sm flex sm:flex-col items-center justify-center gap-2 sm:gap-0 p-3">
                                <span className="text-xs font-bold text-brand uppercase tracking-widest">{formatDate(event.date, { month: 'short' })}</span>
                                <span className="font-display text-4xl font-extrabold leading-none">{formatDate(event.date, { day: 'numeric' })}</span>
                                <span className="text-xs font-bold text-muted uppercase">{formatDate(event.date, { weekday: 'short' })}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl leading-tight mb-2 break-words">{event.title}</h3>
                                <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted mb-3">
                                    <span className="inline-flex items-center gap-1.5"><Icon name="calendar" className="w-4 h-4" />{event.time === 'TBC' ? 'Time to be confirmed' : event.time}</span>
                                    {event.location && <span className="inline-flex items-center gap-1.5"><Icon name="flag" className="w-4 h-4" />{event.location}</span>}
                                </p>
                                {event.description && <p className="text-sm text-muted line-clamp-3 mb-3">{event.description}</p>}

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                                    <p className="text-xs font-bold text-muted uppercase tracking-wider">
                                        {event.rsvp_yes_count} going · {event.rsvp_maybe_count} maybe
                                    </p>
                                    {filter === 'upcoming' && (
                                        <div className="flex gap-2" role="group" aria-label={`Are you going to ${event.title}?`}>
                                            {(['yes', 'maybe', 'no'] as const).map((status) => (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    aria-pressed={mine[event.id] === status}
                                                    onClick={() => rsvp(event.id, status)}
                                                    className={`btn btn-sm min-h-[40px] px-3 ${mine[event.id] === status ? 'btn-primary' : 'btn-secondary'}`}
                                                >
                                                    {RSVP_LABEL[status]}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
