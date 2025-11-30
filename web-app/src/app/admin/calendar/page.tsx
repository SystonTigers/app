'use client';

import { useState, useEffect } from 'react';
import { createClientSDK, createEvent, deleteEvent, listEvents } from '@/lib/sdk';

export default function CalendarAdminPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        time: '',
        location: '',
        description: ''
    });

    useEffect(() => {
        loadEvents();
    }, []);

    async function loadEvents() {
        try {
            const sdk = createClientSDK();
            const data = await listEvents();
            setEvents(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.title || !formData.date || !formData.time) return;

        try {
            const dateTime = new Date(`${formData.date}T${formData.time}`).toISOString();
            await createEvent({
                title: formData.title,
                date: dateTime,
                location: formData.location,
                description: formData.description
            });
            setFormData({ title: '', date: '', time: '', location: '', description: '' });
            loadEvents();
        } catch (err) {
            alert('Failed to create event');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this event?')) return;
        try {
            await deleteEvent(id);
            loadEvents();
        } catch (err) {
            alert('Failed to delete event');
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Calendar Manager</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Add Event</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-gray-700"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Time</label>
                                    <input
                                        type="time"
                                        value={formData.time}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-gray-700"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700 h-24"
                                />
                            </div>
                            <button type="submit" className="w-full bg-black text-white py-2 rounded hover:bg-gray-800">
                                Add Event
                            </button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                    <div className="space-y-4">
                        {events.map((event: any) => (
                            <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-brand uppercase">
                                            {new Date(event.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {new Date(event.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-lg">{event.title}</h3>
                                    {event.location && <p className="text-sm text-gray-500 mt-1">📍 {event.location}</p>}
                                    {event.description && <p className="text-sm text-gray-600 mt-2">{event.description}</p>}

                                    <div className="flex gap-4 mt-3 text-xs text-gray-500">
                                        <span className="text-green-600 font-medium">✅ {event.rsvp_yes_count} Going</span>
                                        <span className="text-red-600">❌ {event.rsvp_no_count} Not Going</span>
                                        <span className="text-yellow-600">❓ {event.rsvp_maybe_count} Maybe</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(event.id)}
                                    className="text-red-600 hover:text-red-900 ml-4"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                        {events.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                No events scheduled.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
