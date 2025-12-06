'use client';

import { useState, useEffect } from 'react';

interface TrainingSession {
    id: string;
    session_date: string;
    session_time: string;
    team: string;
    focus: string;
    status: string;
}

interface Drill {
    id: string;
    name: string;
    category: string;
    duration: string;
    difficulty: string;
    description: string;
}

interface TrainingToolsProps {
    tenant: string;
}

export function TrainingTools({ tenant }: TrainingToolsProps) {
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'sessions' | 'drills'>('sessions');

    useEffect(() => {
        loadSessions();
        loadDrills();
    }, [tenant]);

    const loadSessions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/training/sessions', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setSessions(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDrills = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/training/drills', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setDrills(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load drills:', error);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return 'bg-green-100 text-green-800';
            case 'intermediate': return 'bg-yellow-100 text-yellow-800';
            case 'advanced': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return <div className="p-8">Loading training tools...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="bg-gray-900 text-white p-8 relative overflow-hidden flex-shrink-0">
                <div className="absolute inset-0 bg-[url('/assets/pattern.jpg')] opacity-20 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-r from-green-900 to-gray-900 opacity-90" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Training Centre</h2>
                        <p className="text-green-100 font-medium">Plan sessions, manage drills, and track progress.</p>
                    </div>

                    <div className="flex bg-black/30 p-1 rounded-xl glass-panel">
                        <button
                            onClick={() => setView('sessions')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'sessions'
                                ? 'bg-white text-green-900 shadow-md'
                                : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            Sessions
                        </button>
                        <button
                            onClick={() => setView('drills')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'drills'
                                ? 'bg-white text-green-900 shadow-md'
                                : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            Drill Library
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950/50">
                {view === 'sessions' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sessions.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center opacity-60">
                                <div className="text-6xl mb-4">📋</div>
                                <h3 className="text-xl font-bold">No sessions planned</h3>
                                <p className="text-sm">Create a new training session to get started.</p>
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${session.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                session.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700'
                                            }`}>
                                            {session.status}
                                        </span>
                                    </div>

                                    <div className="mb-4">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                                            {new Date(session.session_date).toLocaleDateString(undefined, { weekday: 'long' })}
                                        </div>
                                        <div className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                                            {session.focus}
                                        </div>
                                        <div className="text-sm font-medium text-brand">
                                            {session.session_time}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                                        <span className="flex items-center gap-1">
                                            👥 {session.team}
                                        </span>
                                    </div>

                                    <div className="mt-4 pt-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                                        <button className="text-sm font-bold text-gray-900 hover:text-brand flex items-center gap-1">
                                            View Plan &rarr;
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {drills.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center opacity-60">
                                <div className="text-6xl mb-4">🏃</div>
                                <h3 className="text-xl font-bold">Library is empty</h3>
                                <p className="text-sm">Add drills to build your coaching database.</p>
                            </div>
                        ) : (
                            drills.map((drill) => (
                                <div
                                    key={drill.id}
                                    className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 flex flex-col"
                                >
                                    <div className={`h-2 w-full ${getDifficultyColor(drill.difficulty).replace('text-', 'bg-').split(' ')[0]}`} />
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{drill.category}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getDifficultyColor(drill.difficulty)}`}>
                                                {drill.difficulty}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{drill.name}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1 line-clamp-3 leading-relaxed">
                                            {drill.description}
                                        </p>

                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg w-fit">
                                            <span>⏱️ {drill.duration}</span>
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
