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
            // In a real app, we'd pass filter params. For now, we'll fetch all and filter client-side 
            // or assume the backend returns relevant ones. 
            // The backend route is generic /api/v1/events (POST) or /api/v1/events/:id (GET).
            // Wait, the backend audit showed:
            // router.post("/api/:v/events", ...) -> createEvent
            // router.get("/api/:v/events/:id", ...) -> getEvent
            // It seems there is NO list events endpoint in the backend index.ts!
            // I need to check backend/src/routes/events.ts again.
            // If missing, I'll need to add it.
            // For now, I'll mock the data to get the UI ready, then fix the backend.

            // MOCK DATA for initial UI build
            const mockEvents: CalendarEvent[] = [
                {
                    id: '1',
                    title: 'Team Training',
                    start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                    location: 'Training Ground A',
                    description: 'Regular Tuesday session. Bring running shoes.',
                    rsvp_yes_count: 12,
                    rsvp_no_count: 2,
                    rsvp_maybe_count: 1,
                    user_rsvp: 'yes'
                },
                {
                    id: '2',
                    title: 'Match vs Rovers',
                    start_time: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
                    location: 'Home Stadium',
                    description: 'League match. Kickoff 3pm.',
                    rsvp_yes_count: 15,
                    rsvp_no_count: 0,
                    rsvp_maybe_count: 0
                }
            ];
            setEvents(mockEvents);
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Team Schedule</h2>
                <div className="flex gap-2 bg-surface p-1 rounded-lg border border-border">
                    <button
                        onClick={() => setFilter('upcoming')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'upcoming' ? 'bg-brand text-white shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        Upcoming
                    </button>
                    <button
                        onClick={() => setFilter('past')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'past' ? 'bg-brand text-white shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        Past
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4">
                    {events.map(event => (
                        <div key={event.id} className="card hover:border-brand/50 transition-colors group">
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                {/* Date Badge */}
                                <div className="flex-shrink-0 w-16 h-16 bg-brand/10 rounded-xl flex flex-col items-center justify-center text-brand border border-brand/20">
                                    <span className="text-xs font-bold uppercase">{new Date(event.start_time).toLocaleDateString(undefined, { month: 'short' })}</span>
                                    <span className="text-2xl font-bold">{new Date(event.start_time).getDate()}</span>
                                </div>

                                {/* Event Details */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg truncate">{event.title}</h3>
                                    <div className="text-sm text-muted flex items-center gap-3 mt-1">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {new Date(event.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {event.location && (
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {event.location}
                                            </span>
                                        )}
                                    </div>
                                    {event.description && (
                                        <p className="text-sm text-muted mt-2 line-clamp-1 group-hover:line-clamp-none transition-all">
                                            {event.description}
                                        </p>
                                    )}
                                </div>

                                {/* RSVP Actions */}
                                <div className="flex flex-col items-end gap-2 min-w-[140px]">
                                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                        {(['yes', 'maybe', 'no'] as const).map((status) => (
                                            <button
                                                key={status}
                                                onClick={(e) => { e.stopPropagation(); handleRsvp(event.id, status); }}
                                                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${event.user_rsvp === status
                                                        ? status === 'yes' ? 'bg-green-500 text-white' : status === 'no' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
                                                        : 'hover:bg-white dark:hover:bg-gray-700 text-muted-foreground'
                                                    }`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="text-xs text-muted flex gap-2">
                                        <span className="text-green-600 font-medium">{event.rsvp_yes_count} Going</span>
                                        <span>•</span>
                                        <span>{event.rsvp_maybe_count} Maybe</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
