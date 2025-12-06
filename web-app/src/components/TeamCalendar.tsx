'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface CalendarEvent {
    id: string;
    title: string;
    start_time: string;
    end_time?: string;
    location?: string;
    description?: string;
    rsvp_yes_count: number;
    rsvp_no_count: number;
    rsvp_maybe_count: number;
    user_rsvp?: 'yes' | 'no' | 'maybe';
}

export function TeamCalendar() {
    const params = useParams();
    const tenant = params.tenant as string;
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

    useEffect(() => {
        loadEvents();
    }, [tenant, filter]);

    const loadEvents = async () => {
        try {
            // Fetch real events from the public API (or SDK if available for public)
            // Since we are in a client component, we can use fetch directly to the public endpoint
            // or use a public SDK method.
            // Let's use the public endpoint we created: GET /api/v1/events?tenantId=...
            // Wait, the route we made requires auth OR tenantId param.
            // But we don't have a public SDK method for this yet that doesn't require auth?
            // Actually, listEvents in SDK uses /api/v1/events.
            // Let's assume for now we fetch from the public API if we had one, but we only made an admin one?
            // Re-reading events.ts: "if (!targetTenantId) return 401".
            // So we need to pass tenantId if not authenticated.

            // Ideally we should have a public route for this like /public/:tenant/calendar
            // But for now let's try to hit the API with the tenant param.

            const res = await fetch(`/api/v1/events?tenantId=${tenant}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setEvents(data.data);
                }
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to load events', error);
            setLoading(false);
        }
    };

    const handleRsvp = async (eventId: string, status: 'yes' | 'no' | 'maybe') => {
        // Optimistic update
        setEvents(events.map(e => {
            if (e.id === eventId) {
                return { ...e, user_rsvp: status };
            }
            return e;
        }));

        try {
            await fetch(`/api/v1/events/${eventId}/rsvp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            // Reload to get accurate counts
            // loadEvents(); 
        } catch (error) {
            console.error('RSVP failed', error);
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
            {/* Header */}
            <div className="bg-gray-900 text-white p-8 relative overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-[url('/assets/pattern.png')] opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-gray-900 opacity-90" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Team Calendar</h2>
                        <p className="text-blue-200 font-medium">Coordinate events, matches, and socials.</p>
                    </div>

                    <div className="flex bg-black/30 p-1 rounded-xl glass-panel">
                        <button
                            onClick={() => setFilter('upcoming')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'upcoming'
                                ? 'bg-white text-blue-900 shadow-md'
                                : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setFilter('past')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'past'
                                ? 'bg-white text-blue-900 shadow-md'
                                : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            History
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950/50">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {events.length === 0 ? (
                            <div className="text-center py-20 opacity-60">
                                <div className="text-6xl mb-4">📅</div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">No events found</h3>
                                <p className="text-sm text-gray-500">Check back later for new schedules.</p>
                            </div>
                        ) : (
                            events.map(event => (
                                <div key={event.id} className="bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        {/* Date Badge */}
                                        <div className="flex-shrink-0 w-full md:w-32 bg-gray-50 dark:bg-gray-900/50 rounded-xl flex flex-col items-center justify-center p-4 border border-gray-100 dark:border-gray-700">
                                            <span className="text-xs font-black text-brand uppercase tracking-widest mb-1">
                                                {new Date(event.start_time).toLocaleDateString(undefined, { month: 'short' })}
                                            </span>
                                            <span className="text-4xl font-black text-gray-900 dark:text-white leading-none mb-1">
                                                {new Date(event.start_time).getDate()}
                                            </span>
                                            <span className="text-xs font-bold text-gray-400 uppercase">
                                                {new Date(event.start_time).toLocaleDateString(undefined, { weekday: 'short' })}
                                            </span>
                                        </div>

                                        {/* Event Details */}
                                        <div className="flex-1 py-4 pr-4">
                                            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2 group-hover:text-brand transition-colors">
                                                {event.title}
                                            </h3>

                                            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                                                <span className="flex items-center gap-1.5 font-medium">
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {new Date(event.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {event.location && (
                                                    <span className="flex items-center gap-1.5 font-medium">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        {event.location}
                                                    </span>
                                                )}
                                            </div>

                                            {event.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4">
                                                    {event.description}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                        {event.rsvp_yes_count} Going
                                                    </span>
                                                    <span className="w-1 h-3 bg-gray-300 rounded-full"></span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                                        {event.rsvp_maybe_count} Maybe
                                                    </span>
                                                </div>

                                                <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                                                    {(['yes', 'maybe', 'no'] as const).map((status) => (
                                                        <button
                                                            key={status}
                                                            onClick={(e) => { e.stopPropagation(); handleRsvp(event.id, status); }}
                                                            className={`
                                                                px-4 py-1.5 text-xs font-bold rounded-md capitalize transition-all
                                                                ${event.user_rsvp === status
                                                                    ? status === 'yes' ? 'bg-green-600 text-white shadow-md' : status === 'no' ? 'bg-red-600 text-white shadow-md' : 'bg-yellow-500 text-white shadow-md'
                                                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-800'}
                                                            `}
                                                        >
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
