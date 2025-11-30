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
        <div className="flex flex-col h-full">
            <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-6">
                <h2 className="text-2xl font-bold">Training Tools</h2>
                <p className="text-sm opacity-90">Plan sessions & manage drill library</p>

                <div className="flex gap-4 mt-4">
                    <button
                        onClick={() => setView('sessions')}
                        className={`px-4 py-2 rounded ${view === 'sessions' ? 'bg-white text-brand' : 'bg-white/20 hover:bg-white/30'}`}
                    >
                        Sessions
                    </button>
                    <button
                        onClick={() => setView('drills')}
                        className={`px-4 py-2 rounded ${view === 'drills' ? 'bg-white text-brand' : 'bg-white/20 hover:bg-white/30'}`}
                    >
                        Drills Library
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {view === 'sessions' ? (
                    <div className="space-y-4">
                        {sessions.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No training sessions yet. Create one from the admin panel!
                            </div>
                        ) : (
                            sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-lg">{session.focus}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${session.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                    'bg-blue-100 text-blue-800'
                                            }`}>
                                            {session.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">
                                        📅 {new Date(session.session_date).toLocaleDateString()} at {session.session_time}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        👥 {session.team}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {drills.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                No drills in library yet. Add drills from the admin panel!
                            </div>
                        ) : (
                            drills.map((drill) => (
                                <div
                                    key={drill.id}
                                    className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold">{drill.name}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(drill.difficulty)}`}>
                                            {drill.difficulty}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{drill.category}</p>
                                    <p className="text-sm text-gray-700">{drill.description}</p>
                                    <p className="text-xs text-gray-500 mt-2">⏱️ {drill.duration}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
