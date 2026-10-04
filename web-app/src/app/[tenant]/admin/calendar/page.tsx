'use client';

import { useCallback, useEffect, useState, use } from 'react';
import { createEvent, deleteEvent, listEvents } from '@/lib/sdk';
import { formatDate, formatTime } from '@/lib/format';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice, sdkErrorMessage } from '@/components/admin/AdminUi';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

/** A row from GET /api/v1/events. */
interface ClubEvent {
    id: string;
    title: string;
    start_time: string;
    location: string | null;
    description: string | null;
    rsvp_yes_count: number | null;
    rsvp_no_count: number | null;
    rsvp_maybe_count: number | null;
}

const EMPTY = { title: '', date: '', time: '', location: '', description: '' };

export default function CalendarAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [events, setEvents] = useState<ClubEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [formData, setFormData] = useState(EMPTY);
    const [formError, setFormError] = useState('');
    const [formDone, setFormDone] = useState('');
    const [listError, setListError] = useState('');
    const [saving, setSaving] = useState(false);

    const loadEvents = useCallback(async () => {
        setLoadError('');
        try {
            const data: unknown = await listEvents();
            const list = Array.isArray(data) ? data : (data as { data?: unknown })?.data;
            setEvents(Array.isArray(list) ? (list as ClubEvent[]) : []);
        } catch (err) {
            setLoadError(sdkErrorMessage(err, "We couldn't load your events. Check your connection and try again."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEvents();
    }, [tenant, loadEvents]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormDone('');
        if (!formData.title.trim() || !formData.date || !formData.time) {
            setFormError('Enter a title, a date and a time.');
            return;
        }
        setFormError('');
        setSaving(true);
        try {
            const dateTime = new Date(`${formData.date}T${formData.time}`).toISOString();
            await createEvent({
                title: formData.title.trim(),
                date: dateTime,
                location: formData.location,
                description: formData.description,
            });
            setFormDone(`${formData.title.trim()} is on the club calendar.`);
            setFormData(EMPTY);
            loadEvents();
        } catch (err) {
            setFormError(sdkErrorMessage(err, "The event didn't save. Please try again."));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(ev: ClubEvent) {
        if (!confirm(`Delete ${ev.title}?`)) return;
        setListError('');
        try {
            await deleteEvent(ev.id);
            loadEvents();
        } catch {
            setListError("That event wasn't deleted. Please try again.");
        }
    }

    return (
        <div className="container py-8 md:py-10">
            <PageHeader
                eyebrow="Club admin"
                title="Events"
                subtitle="Presentation nights, tournaments, socials and meetings. Members see them in the app and say if they're coming."
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                <form onSubmit={handleSubmit} className="card lg:col-span-2 space-y-4" noValidate>
                    <h2 className="text-2xl">Add an event</h2>
                    <div>
                        <label htmlFor="event-title" className="label">Title</label>
                        <input id="event-title" type="text" maxLength={100} placeholder="e.g. Presentation night" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="field" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="event-date" className="label">Date</label>
                            <input id="event-date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="field px-3" required />
                        </div>
                        <div>
                            <label htmlFor="event-time" className="label">Time</label>
                            <input id="event-time" type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="field px-3" required />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="event-location" className="label">Where (optional)</label>
                        <input id="event-location" type="text" placeholder="e.g. Clubhouse" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="field" />
                    </div>
                    <div>
                        <label htmlFor="event-description" className="label">Details (optional)</label>
                        <textarea id="event-description" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="field" />
                    </div>
                    {formError && <Notice tone="error">{formError}</Notice>}
                    {formDone && <Notice tone="success">{formDone}</Notice>}
                    <button type="submit" disabled={saving} className="btn btn-primary w-full">{saving ? 'Saving…' : 'Add event'}</button>
                </form>

                <section className="lg:col-span-3 space-y-3" aria-labelledby="events-title">
                    <h2 id="events-title" className="text-2xl">Coming up</h2>
                    {listError && <Notice tone="error">{listError}</Notice>}
                    {loading ? (
                        <LoadingBlock label="Loading events" />
                    ) : loadError ? (
                        <ErrorNote message={loadError} onRetry={() => { setLoading(true); loadEvents(); }} />
                    ) : events.length === 0 ? (
                        <EmptyNote icon="flag" title="No events yet">
                            Add your first event with the form. Matches go on the Fixtures page instead.
                        </EmptyNote>
                    ) : (
                        <ul className="space-y-2">
                            {events.map((ev) => (
                                <li key={ev.id} className="bg-surface border border-border chamfer-sm p-4 flex items-start gap-4">
                                    <div className="w-14 shrink-0 text-center">
                                        <p className="font-display text-3xl font-extrabold leading-none text-brand">{formatDate(ev.start_time, { day: 'numeric' })}</p>
                                        <p className="text-xs text-muted uppercase tracking-wider">{formatDate(ev.start_time, { month: 'short' })}</p>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-xl">{ev.title}</h3>
                                        <p className="text-sm text-muted flex flex-wrap gap-x-3">
                                            <span>{formatTime(ev.start_time)}</span>
                                            {ev.location && <span className="inline-flex items-center gap-1"><Icon name="flag" className="w-3.5 h-3.5" />{ev.location}</span>}
                                        </p>
                                        {ev.description && <p className="text-sm mt-2">{ev.description}</p>}
                                        <p className="flex flex-wrap gap-3 mt-3 text-xs font-bold uppercase tracking-wider">
                                            <span className="text-green-400">{ev.rsvp_yes_count ?? 0} going</span>
                                            <span className="text-amber-300">{ev.rsvp_maybe_count ?? 0} maybe</span>
                                            <span className="text-muted">{ev.rsvp_no_count ?? 0} can&apos;t</span>
                                        </p>
                                    </div>
                                    <button type="button" onClick={() => handleDelete(ev)} className="p-2.5 text-muted hover:text-red-400" aria-label={`Delete ${ev.title}`}>
                                        <Icon name="trash" className="w-5 h-5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
