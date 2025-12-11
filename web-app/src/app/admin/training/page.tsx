'use client';

import { useState, useEffect } from 'react';

interface TrainingSession {
    id: string;
    date: string;
    time: string;
    location: string;
    type: 'regular' | 'match-prep' | 'recovery' | 'skills';
    responses: {
        yes: string[];
        no: string[];
        maybe: string[];
        pending: string[];
    };
}

interface PlayerAttendance {
    id: string;
    name: string;
    position: string;
    sessionsAttended: number;
    totalSessions: number;
    percentage: number;
    lastSession: string;
    trend: 'up' | 'down' | 'stable';
}

const mockSessions: TrainingSession[] = [
    {
        id: '1',
        date: '2024-12-14',
        time: '10:00',
        location: 'Main Pitch',
        type: 'regular',
        responses: {
            yes: ['Tom', 'Jake', 'Mike', 'Sam', 'Chris', 'Dan', 'Will', 'James'],
            no: ['Ben', 'Alex'],
            maybe: ['Luke'],
            pending: ['Harry', 'Oscar', 'Ethan'],
        },
    },
    {
        id: '2',
        date: '2024-12-17',
        time: '18:30',
        location: 'Training Ground',
        type: 'match-prep',
        responses: {
            yes: ['Tom', 'Jake', 'Mike', 'Sam'],
            no: [],
            maybe: ['Chris'],
            pending: ['Dan', 'Will', 'James', 'Ben', 'Alex', 'Luke', 'Harry', 'Oscar', 'Ethan'],
        },
    },
];

const mockPlayers: PlayerAttendance[] = [
    { id: '1', name: 'Tom Wilson', position: 'GK', sessionsAttended: 23, totalSessions: 24, percentage: 96, lastSession: '2024-12-10', trend: 'stable' },
    { id: '2', name: 'Jake Smith', position: 'CB', sessionsAttended: 22, totalSessions: 24, percentage: 92, lastSession: '2024-12-10', trend: 'up' },
    { id: '3', name: 'Mike Brown', position: 'CB', sessionsAttended: 21, totalSessions: 24, percentage: 88, lastSession: '2024-12-10', trend: 'stable' },
    { id: '4', name: 'Sam Jones', position: 'RB', sessionsAttended: 20, totalSessions: 24, percentage: 83, lastSession: '2024-12-07', trend: 'down' },
    { id: '5', name: 'Chris Taylor', position: 'LB', sessionsAttended: 19, totalSessions: 24, percentage: 79, lastSession: '2024-12-10', trend: 'up' },
    { id: '6', name: 'Ben Davies', position: 'CM', sessionsAttended: 17, totalSessions: 24, percentage: 71, lastSession: '2024-12-05', trend: 'down' },
    { id: '7', name: 'Alex White', position: 'CM', sessionsAttended: 16, totalSessions: 24, percentage: 67, lastSession: '2024-12-03', trend: 'down' },
];

export default function TrainingPage() {
    const [view, setView] = useState<'upcoming' | 'attendance'>('upcoming');
    const [sessions] = useState<TrainingSession[]>(mockSessions);
    const [players] = useState<PlayerAttendance[]>(mockPlayers);
    const [notifyDays, setNotifyDays] = useState(2);
    const [notifyTime, setNotifyTime] = useState('18:00');
    const [minAttendance, setMinAttendance] = useState(75);
    const [showSettings, setShowSettings] = useState(false);

    const getAttendanceColor = (pct: number) => {
        if (pct >= 90) return 'text-green-600';
        if (pct >= 75) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getAttendanceBg = (pct: number) => {
        if (pct >= 90) return 'bg-green-100 dark:bg-green-900/30';
        if (pct >= 75) return 'bg-yellow-100 dark:bg-yellow-900/30';
        return 'bg-red-100 dark:bg-red-900/30';
    };

    const sendNotifications = (sessionId: string) => {
        alert(`Sending "Who's Training?" notifications for session ${sessionId}`);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    const teamAverage = Math.round(players.reduce((sum, p) => sum + p.percentage, 0) / players.length);
    const belowThreshold = players.filter(p => p.percentage < minAttendance).length;

    return (
        <div className="container mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Training</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage sessions and track attendance</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                        <SettingsIcon />
                        Settings
                    </button>
                    <button className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2">
                        <PlusIcon />
                        Add Session
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <h3 className="font-semibold text-lg mb-4">Notification Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Send "Who's Training?" notification
                            </label>
                            <select
                                value={notifyDays}
                                onChange={(e) => setNotifyDays(Number(e.target.value))}
                                className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value={1}>1 day before</option>
                                <option value={2}>2 days before</option>
                                <option value={3}>3 days before</option>
                                <option value={7}>1 week before</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Send at time
                            </label>
                            <input
                                type="time"
                                value={notifyTime}
                                onChange={(e) => setNotifyTime(e.target.value)}
                                className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Min attendance threshold: {minAttendance}%
                            </label>
                            <input
                                type="range"
                                min="50"
                                max="100"
                                step="5"
                                value={minAttendance}
                                onChange={(e) => setMinAttendance(Number(e.target.value))}
                                className="w-full mt-2"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                    <div className={`text-3xl font-bold ${getAttendanceColor(teamAverage)}`}>{teamAverage}%</div>
                    <div className="text-sm text-gray-500">Team Average</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                    <div className="text-3xl font-bold text-blue-600">{sessions.length}</div>
                    <div className="text-sm text-gray-500">Upcoming Sessions</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                    <div className="text-3xl font-bold text-orange-600">{belowThreshold}</div>
                    <div className="text-sm text-gray-500">Below {minAttendance}%</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
                    <div className="text-3xl font-bold text-purple-600">24</div>
                    <div className="text-sm text-gray-500">Sessions This Month</div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setView('upcoming')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'upcoming'
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    Upcoming Sessions
                </button>
                <button
                    onClick={() => setView('attendance')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'attendance'
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                >
                    Attendance Register
                </button>
            </div>

            {/* Upcoming Sessions View */}
            {view === 'upcoming' && (
                <div className="space-y-4">
                    {sessions.map((session) => {
                        const totalResponses = session.responses.yes.length + session.responses.no.length + session.responses.maybe.length;
                        const totalPlayers = totalResponses + session.responses.pending.length;
                        const responseRate = Math.round((totalResponses / totalPlayers) * 100);

                        return (
                            <div key={session.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-bold">{formatDate(session.date)}</span>
                                            <span className="text-gray-500">{session.time}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${session.type === 'match-prep' ? 'bg-red-100 text-red-800' :
                                                    session.type === 'recovery' ? 'bg-blue-100 text-blue-800' :
                                                        session.type === 'skills' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {session.type.replace('-', ' ')}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 mt-1">{session.location}</div>
                                    </div>
                                    <button
                                        onClick={() => sendNotifications(session.id)}
                                        className="mt-3 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <BellIcon />
                                        Send Reminder
                                    </button>
                                </div>

                                {/* Response Summary */}
                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{session.responses.yes.length}</div>
                                        <div className="text-xs text-gray-500">Attending</div>
                                    </div>
                                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600">{session.responses.no.length}</div>
                                        <div className="text-xs text-gray-500">Not Available</div>
                                    </div>
                                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                        <div className="text-2xl font-bold text-yellow-600">{session.responses.maybe.length}</div>
                                        <div className="text-xs text-gray-500">Maybe</div>
                                    </div>
                                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div className="text-2xl font-bold text-gray-600">{session.responses.pending.length}</div>
                                        <div className="text-xs text-gray-500">No Response</div>
                                    </div>
                                </div>

                                {/* Response Rate Bar */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 transition-all"
                                            style={{ width: `${responseRate}%` }}
                                        />
                                    </div>
                                    <span className="text-sm text-gray-500">{responseRate}% responded</span>
                                </div>

                                {/* Pending Players */}
                                {session.responses.pending.length > 0 && (
                                    <div className="mt-4 pt-4 border-t dark:border-gray-700">
                                        <div className="text-sm text-gray-500 mb-2">Waiting for response:</div>
                                        <div className="flex flex-wrap gap-2">
                                            {session.responses.pending.map((name) => (
                                                <span key={name} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Attendance Register View */}
            {view === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                                    <th className="text-left py-4 px-6 font-medium text-gray-700 dark:text-gray-300">Player</th>
                                    <th className="text-left py-4 px-4 font-medium text-gray-700 dark:text-gray-300">Position</th>
                                    <th className="text-center py-4 px-4 font-medium text-gray-700 dark:text-gray-300">Attended</th>
                                    <th className="text-center py-4 px-4 font-medium text-gray-700 dark:text-gray-300">Attendance %</th>
                                    <th className="text-center py-4 px-4 font-medium text-gray-700 dark:text-gray-300">Trend</th>
                                    <th className="text-left py-4 px-4 font-medium text-gray-700 dark:text-gray-300">Last Attended</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.sort((a, b) => b.percentage - a.percentage).map((player) => (
                                    <tr key={player.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="py-4 px-6">
                                            <div className="font-medium text-gray-900 dark:text-white">{player.name}</div>
                                        </td>
                                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{player.position}</td>
                                        <td className="py-4 px-4 text-center text-gray-600 dark:text-gray-400">
                                            {player.sessionsAttended} / {player.totalSessions}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full font-bold ${getAttendanceBg(player.percentage)} ${getAttendanceColor(player.percentage)}`}>
                                                {player.percentage}%
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            {player.trend === 'up' && <span className="text-green-500">↑</span>}
                                            {player.trend === 'down' && <span className="text-red-500">↓</span>}
                                            {player.trend === 'stable' && <span className="text-gray-400">→</span>}
                                        </td>
                                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                                            {formatDate(player.lastSession)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// Icons
function SettingsIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    );
}

function BellIcon() {
    return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
    );
}
