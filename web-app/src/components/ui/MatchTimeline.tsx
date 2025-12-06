'use client';

interface MatchEvent {
    id: string;
    minute: number;
    type: 'goal' | 'own-goal' | 'penalty' | 'yellow-card' | 'red-card' | 'substitution' | 'var' | 'half-time' | 'full-time';
    team: 'home' | 'away';
    player?: string;
    playerOff?: string; // For substitutions
    description?: string;
}

interface MatchTimelineProps {
    events: MatchEvent[];
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    currentMinute?: number;
    isLive?: boolean;
}

const EVENT_ICONS: Record<MatchEvent['type'], string> = {
    'goal': '⚽',
    'own-goal': '🥅',
    'penalty': '⚽🎯',
    'yellow-card': '🟨',
    'red-card': '🟥',
    'substitution': '🔄',
    'var': '📺',
    'half-time': '⏸️',
    'full-time': '🏁',
};

export function MatchTimeline({
    events,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    currentMinute = 90,
    isLive = false,
}: MatchTimelineProps) {
    const sortedEvents = [...events].sort((a, b) => a.minute - b.minute);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
                <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                        <div className="font-black text-xl">{homeTeam}</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-5xl font-black">{homeScore}</span>
                        <span className="text-2xl text-gray-400">-</span>
                        <span className="text-5xl font-black">{awayScore}</span>
                    </div>
                    <div className="text-center flex-1">
                        <div className="font-black text-xl">{awayTeam}</div>
                    </div>
                </div>
                {isLive && (
                    <div className="text-center mt-4">
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full text-sm font-bold">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            LIVE - {currentMinute}'
                        </span>
                    </div>
                )}
            </div>

            {/* Timeline */}
            <div className="p-6">
                <div className="relative">
                    {/* Center line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700 -translate-x-1/2" />

                    <div className="space-y-4">
                        {sortedEvents.map((event) => (
                            <div
                                key={event.id}
                                className={`flex items-center gap-4 ${event.team === 'home' ? 'flex-row' : 'flex-row-reverse'}`}
                            >
                                {/* Event content */}
                                <div className={`flex-1 ${event.team === 'home' ? 'text-right' : 'text-left'}`}>
                                    <div className={`inline-block p-3 rounded-xl ${event.type === 'goal' ? 'bg-green-100 dark:bg-green-900/30' :
                                            event.type === 'red-card' ? 'bg-red-100 dark:bg-red-900/30' :
                                                event.type === 'yellow-card' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                                                    'bg-gray-100 dark:bg-gray-700'
                                        }`}>
                                        {event.player && (
                                            <div className="font-bold text-gray-900 dark:text-white">{event.player}</div>
                                        )}
                                        {event.playerOff && (
                                            <div className="text-sm text-gray-500">← {event.playerOff}</div>
                                        )}
                                        {event.description && (
                                            <div className="text-sm text-gray-500">{event.description}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Center icon bubble */}
                                <div className="relative z-10 flex flex-col items-center">
                                    <div className="w-10 h-10 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center text-lg">
                                        {EVENT_ICONS[event.type]}
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 mt-1">{event.minute}'</span>
                                </div>

                                {/* Spacer for other side */}
                                <div className="flex-1" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Compact horizontal timeline
export function MatchTimelineCompact({ events }: { events: MatchEvent[] }) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto py-2">
            {events.map((event) => (
                <div
                    key={event.id}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                >
                    <span>{EVENT_ICONS[event.type]}</span>
                    <span className="font-bold">{event.minute}'</span>
                    {event.player && <span className="text-gray-500 truncate max-w-[100px]">{event.player}</span>}
                </div>
            ))}
        </div>
    );
}
