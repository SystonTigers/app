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

interface PerformanceRecord {
    id: string;
    playerId: string;
    playerName: string;
    drillType: 'Sprint (40m)' | 'Bleep Test' | 'Parachute Run' | 'Agility Test';
    value: string;
    date: string;
    trend: 'up' | 'down' | 'neutral';
}

interface TacticsConfig {
    formation: string;
    playingStyle: string;
    pressingIntensity: 'low' | 'medium' | 'high';
    buildUpPlay: 'short' | 'mixed' | 'direct';
    defensiveLine: 'deep' | 'medium' | 'high';
    width: 'narrow' | 'normal' | 'wide';
    setPlayFocus: string[];
    phases?: {
        attacking?: any;
        defensive?: any;
    };
}

interface TacticalReview {
    id: string;
    videoId: string;
    videoName: string;
    formation: string;
    status: 'pending' | 'analyzing' | 'complete';
    score: number | null;
    insights: string[];
    date: string;
}

interface TrainingToolsProps {
    tenant: string;
}



export function TrainingTools({ tenant }: TrainingToolsProps) {
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [showNewDrillModal, setShowNewDrillModal] = useState(false);
    const [newDrill, setNewDrill] = useState<Partial<Drill>>({
        name: '', category: 'Technical', duration: '15 min', difficulty: 'intermediate', description: ''
    });
    const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'sessions' | 'drills' | 'performance' | 'tactics'>('sessions');

    // Mock performance records
    const [records, setRecords] = useState<PerformanceRecord[]>([
        { id: '1', playerId: '1', playerName: 'James Smith', drillType: 'Sprint (40m)', value: '4.5s', date: '2023-10-15', trend: 'up' },
        { id: '2', playerId: '3', playerName: 'Alex Johnson', drillType: 'Bleep Test', value: 'Level 12.4', date: '2023-11-02', trend: 'up' },
        { id: '3', playerId: '2', playerName: 'David Jones', drillType: 'Parachute Run', value: '12.8s', date: '2023-10-20', trend: 'neutral' },
        { id: '4', playerId: '1', playerName: 'James Smith', drillType: 'Agility Test', value: '8.2s', date: '2023-11-05', trend: 'up' },
        { id: '5', playerId: '4', playerName: 'Ben Wilson', drillType: 'Bleep Test', value: 'Level 10.1', date: '2023-10-10', trend: 'down' },
    ]);

    // Tactics configuration state
    // Tactics configuration state
    const [phase, setPhase] = useState<'attacking' | 'defensive'>('attacking');
    const [tactics, setTactics] = useState<TacticsConfig>({
        formation: '4-4-2',
        playingStyle: 'Balanced',
        pressingIntensity: 'medium',
        buildUpPlay: 'mixed',
        defensiveLine: 'medium',
        width: 'normal',
        setPlayFocus: ['corners', 'free-kicks'],
        phases: {
            attacking: { width: 'wide', tempo: 'fast' },
            defensive: { width: 'narrow', aggression: 'medium' }
        }
    });

    // Tactical AI reviews
    const [tacticalReviews, setTacticalReviews] = useState<TacticalReview[]>([
        { id: '1', videoId: 'v1', videoName: 'vs Rovers FC - Oct 15', formation: '4-4-2', status: 'complete', score: 78, insights: ['Good defensive shape', 'Transition could be faster', 'Wide play effective'], date: '2023-10-16' },
        { id: '2', videoId: 'v2', videoName: 'vs City United - Oct 22', formation: '4-3-3', status: 'complete', score: 65, insights: ['Midfield overrun at times', 'Wing-backs exposed', 'Set pieces well executed'], date: '2023-10-23' },
    ]);

    const [analyzingTactics, setAnalyzingTactics] = useState(false);

    useEffect(() => {
        loadSessions();
        loadDrills();
        loadTactics();
    }, [tenant]);

    const loadTactics = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/tactics', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success && data.data) {
                setTactics(data.data);
            }
        } catch (error) {
            console.error('Failed to load tactics:', error);
        }
    };

    const saveTactics = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/tactics', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tactics)
            });
            const data = await res.json();
            if (data.success) {
                alert('Tactics saved successfully!');
            } else {
                alert('Failed to save tactics');
            }
        } catch (error) {
            console.error('Failed to save tactics:', error);
            alert('Error saving tactics');
        }
    };

    const createDrill = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/training/drills', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: [], // Mocking required field equipment/players for now if needed, or update backend to be optional
                    ...newDrill,
                    players: '10+',
                    equipment: ['Cones', 'Bibs'],
                    focus: ['Skill']
                })
            });
            const data = await res.json();
            if (data.success) {
                loadDrills();
                setShowNewDrillModal(false);
                setNewDrill({ name: '', category: 'Technical', duration: '15 min', difficulty: 'intermediate', description: '' });
            }
        } catch (error) {
            console.error('Failed to create drill:', error);
        }
    };

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
                        <button
                            onClick={() => setView('performance')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'performance'
                                ? 'bg-white text-green-900 shadow-md'
                                : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            Records
                        </button>
                        <button
                            onClick={() => setView('tactics')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${view === 'tactics'
                                ? 'bg-white text-green-900 shadow-md'
                                : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                        >
                            ⚽ Tactics
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
                ) : view === 'performance' ? (
                    <div className="space-y-8">
                        {/* Stats Summary Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
                                <h3 className="font-bold text-lg opacity-90 mb-1">Fastest Sprint</h3>
                                <div className="text-4xl font-black mb-2">4.5s</div>
                                <div className="text-sm font-medium flex items-center gap-2">
                                    <span className="bg-white/20 px-2 py-1 rounded">James Smith</span>
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                                <h3 className="font-bold text-lg opacity-90 mb-1">Fitness King</h3>
                                <div className="text-4xl font-black mb-2">Lvl 12.4</div>
                                <div className="text-sm font-medium flex items-center gap-2">
                                    <span className="bg-white/20 px-2 py-1 rounded">Alex Johnson</span>
                                    <span className="text-xs opacity-75">Bleep Test</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm flex flex-col justify-center items-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 text-2xl font-black">+</div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Log New Record</h3>
                                <p className="text-xs text-gray-500">Record a player's achievement</p>
                            </div>
                        </div>

                        {/* Records Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <h3 className="font-black text-xl uppercase tracking-tight">Recent Benchmarks</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs font-bold uppercase text-gray-500 tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Player</th>
                                            <th className="px-6 py-4">Drill / Test</th>
                                            <th className="px-6 py-4">Result</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4 text-center">Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {records.map((record) => (
                                            <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-black/20 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                                    {record.playerName}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">
                                                        {record.drillType}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-black font-mono text-base">
                                                    {record.value}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {new Date(record.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-block w-6 h-6 rounded-full flex items-center justify-center text-xs ${record.trend === 'up' ? 'text-green-500 bg-green-100' :
                                                        record.trend === 'down' ? 'text-red-500 bg-red-100' :
                                                            'text-gray-400 bg-gray-100'
                                                        }`}>
                                                        {record.trend === 'up' ? '▲' : record.trend === 'down' ? '▼' : '–'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : view === 'tactics' ? (
                    <div className="space-y-8">
                        {/* Formation & Tactics Configuration */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Formation Selector */}
                            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-brand to-brand/80">
                                    <h3 className="font-black text-xl uppercase tracking-tight text-white">Formation</h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-1-4-1', '3-4-2-1', '3-4-3', '4-1-2-1-2'].map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setTactics({ ...tactics, formation: f })}
                                                className={`p-4 rounded-xl font-black text-sm transition-all ${tactics.formation === f
                                                    ? 'bg-brand text-white shadow-lg scale-105'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                    }`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Mini Pitch Visualization */}
                                    <div className="aspect-[3/4] bg-gradient-to-b from-green-600 to-green-700 rounded-2xl p-4 relative border-4 border-white dark:border-gray-700 shadow-inner">
                                        <div className="absolute inset-x-4 top-1/2 h-px bg-white/40" />
                                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-white/40" />
                                        <div className="absolute inset-x-4 bottom-4 h-16 border-2 border-white/40 rounded-t-lg" />
                                        <div className="absolute inset-x-4 top-4 h-16 border-2 border-white/40 rounded-b-lg" />

                                        {/* Formation dots */}
                                        <div className="absolute inset-0 flex flex-col justify-around items-center py-8">
                                            <div className="text-white font-black text-2xl drop-shadow-lg">{tactics.formation}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tactics Configuration */}
                            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-900">
                                    <h3 className="font-black text-xl uppercase tracking-tight text-white">Tactical Setup</h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    {/* Playing Style */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wider block mb-2">Playing Style</label>
                                        <select
                                            value={tactics.playingStyle}
                                            onChange={(e) => setTactics({ ...tactics, playingStyle: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-bold"
                                        >
                                            <option>Balanced</option>
                                            <option>Possession</option>
                                            <option>Counter-Attack</option>
                                            <option>High Press</option>
                                            <option>Direct Play</option>
                                        </select>
                                    </div>

                                    {/* Pressing Intensity */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wider block mb-2">Pressing Intensity</label>
                                        <div className="flex gap-2">
                                            {(['low', 'medium', 'high'] as const).map((level) => (
                                                <button
                                                    key={level}
                                                    onClick={() => setTactics({ ...tactics, pressingIntensity: level })}
                                                    className={`flex-1 py-3 rounded-xl font-bold uppercase text-sm transition-all ${tactics.pressingIntensity === level
                                                        ? level === 'high' ? 'bg-red-500 text-white' : level === 'medium' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                        }`}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Build Up Play */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wider block mb-2">Build-Up Play</label>
                                        <div className="flex gap-2">
                                            {(['short', 'mixed', 'direct'] as const).map((style) => (
                                                <button
                                                    key={style}
                                                    onClick={() => setTactics({ ...tactics, buildUpPlay: style })}
                                                    className={`flex-1 py-3 rounded-xl font-bold uppercase text-sm transition-all ${tactics.buildUpPlay === style
                                                        ? 'bg-brand text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                        }`}
                                                >
                                                    {style}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Defensive Line */}
                                    <div>
                                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wider block mb-2">Defensive Line</label>
                                        <div className="flex gap-2">
                                            {(['deep', 'medium', 'high'] as const).map((line) => (
                                                <button
                                                    key={line}
                                                    onClick={() => setTactics({ ...tactics, defensiveLine: line })}
                                                    className={`flex-1 py-3 rounded-xl font-bold uppercase text-sm transition-all ${tactics.defensiveLine === line
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                        }`}
                                                >
                                                    {line}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={saveTactics}
                                        className="w-full py-4 bg-gradient-to-r from-brand to-green-600 text-white font-black uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-transform shadow-lg"
                                    >
                                        Save Tactics
                                    </button>
                                </div>
                            </div>

                            {/* Phase Configuration */}
                            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-900 flex justify-between items-center">
                                    <h3 className="font-black text-xl uppercase tracking-tight text-white">Phase Specific Instructions</h3>
                                    <div className="flex bg-white/10 p-1 rounded-lg">
                                        <button
                                            onClick={() => setPhase('attacking')}
                                            className={`px-4 py-1 rounded-md text-sm font-bold transition-all ${phase === 'attacking' ? 'bg-brand text-white' : 'text-white/70'}`}
                                        >
                                            Attacking
                                        </button>
                                        <button
                                            onClick={() => setPhase('defensive')}
                                            className={`px-4 py-1 rounded-md text-sm font-bold transition-all ${phase === 'defensive' ? 'bg-red-500 text-white' : 'text-white/70'}`}
                                        >
                                            Defensive
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                                {phase === 'attacking' ? 'Attacking Width' : 'Defensive Width'}
                                            </label>
                                            <div className="flex gap-2">
                                                {['narrow', 'normal', 'wide'].map((w) => (
                                                    <button
                                                        key={w}
                                                        onClick={() => setTactics({
                                                            ...tactics,
                                                            phases: {
                                                                ...tactics.phases,
                                                                [phase]: { ...tactics.phases?.[phase], width: w }
                                                            }
                                                        })}
                                                        className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs transition-all ${tactics.phases?.[phase]?.width === w
                                                            ? 'bg-brand text-white'
                                                            : 'bg-gray-100 dark:bg-gray-700'
                                                            }`}
                                                    >
                                                        {w}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                                {phase === 'attacking' ? 'Tempo' : 'Aggression'}
                                            </label>
                                            <div className="flex gap-2">
                                                {['low', 'medium', 'high'].map((l) => (
                                                    <button
                                                        key={l}
                                                        onClick={() => setTactics({
                                                            ...tactics,
                                                            phases: {
                                                                ...tactics.phases,
                                                                [phase]: {
                                                                    ...tactics.phases?.[phase],
                                                                    [phase === 'attacking' ? 'tempo' : 'aggression']: l
                                                                }
                                                            }
                                                        })}
                                                        className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs transition-all ${(phase === 'attacking' ? tactics.phases?.attacking?.tempo : tactics.phases?.defensive?.aggression) === l
                                                                ? 'bg-brand text-white'
                                                                : 'bg-gray-100 dark:bg-gray-700'
                                                            }`}
                                                    >
                                                        {l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Tactical Analysis */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600">
                                <div>
                                    <h3 className="font-black text-xl uppercase tracking-tight text-white">🤖 AI Tactical Analysis</h3>
                                    <p className="text-purple-200 text-sm">Auto-evaluate your tactics from match footage</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setAnalyzingTactics(true);
                                        setTimeout(() => setAnalyzingTactics(false), 3000);
                                    }}
                                    disabled={analyzingTactics}
                                    className="px-6 py-3 bg-white text-purple-700 font-bold rounded-xl hover:bg-purple-50 transition-colors disabled:opacity-50"
                                >
                                    {analyzingTactics ? '⏳ Analyzing...' : '📹 Analyze Match'}
                                </button>
                            </div>

                            <div className="p-6">
                                {tacticalReviews.length === 0 ? (
                                    <div className="text-center py-12 opacity-60">
                                        <div className="text-6xl mb-4">🎬</div>
                                        <h3 className="text-xl font-bold">No tactical reviews yet</h3>
                                        <p className="text-sm">Upload match footage and run AI analysis</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {tacticalReviews.map((review) => (
                                            <div key={review.id} className="p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow bg-gray-50 dark:bg-gray-900/50">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div>
                                                        <h4 className="font-bold text-lg">{review.videoName}</h4>
                                                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded font-bold">{review.formation}</span>
                                                            <span>{new Date(review.date).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    <div className={`text-4xl font-black ${review.score! >= 75 ? 'text-green-500' :
                                                        review.score! >= 50 ? 'text-yellow-500' : 'text-red-500'
                                                        }`}>
                                                        {review.score}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {review.insights.map((insight, i) => (
                                                        <span key={i} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                                                            {insight}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <div
                            onClick={() => setShowNewDrillModal(true)}
                            className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center p-6 cursor-pointer hover:border-brand hover:bg-brand/5 transition-all min-h-[200px]"
                        >
                            <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center text-3xl mb-2">+</div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Create Custom Drill</h3>
                        </div>

                        {showNewDrillModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                                    <h3 className="text-2xl font-black uppercase text-gray-900 dark:text-white mb-4">New Drill</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-500 mb-1">Name</label>
                                            <input
                                                value={newDrill.name}
                                                onChange={e => setNewDrill({ ...newDrill, name: e.target.value })}
                                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none font-bold"
                                                placeholder="e.g. Triangle Passing"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-500 mb-1">Category</label>
                                                <select
                                                    value={newDrill.category}
                                                    onChange={e => setNewDrill({ ...newDrill, category: e.target.value })}
                                                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none font-bold"
                                                >
                                                    <option>Technical</option>
                                                    <option>Physical</option>
                                                    <option>Tactical</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-500 mb-1">Duration</label>
                                                <input
                                                    value={newDrill.duration}
                                                    onChange={e => setNewDrill({ ...newDrill, duration: e.target.value })}
                                                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none font-bold"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-500 mb-1">Description</label>
                                            <textarea
                                                value={newDrill.description}
                                                onChange={e => setNewDrill({ ...newDrill, description: e.target.value })}
                                                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none font-bold h-24"
                                                placeholder="Drill instructions..."
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => setShowNewDrillModal(false)}
                                                className="flex-1 py-3 rounded-xl font-bold bg-gray-100 hover:bg-gray-200"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={createDrill}
                                                className="flex-1 py-3 rounded-xl font-bold bg-brand text-white hover:bg-green-600"
                                            >
                                                Create Drill
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

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
        </div >
    );
}
