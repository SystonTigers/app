'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/session';

interface PublicLiveMatch {
    opponent: string;
    homeAway: 'home' | 'away';
    status: 'scheduled' | 'live' | 'half_time' | 'full_time';
    minute: number | null;
    ourScore: number;
    theirScore: number;
    events: Array<{ type: string; minute: number | null; player: string | null }>;
}

const REFRESH_MS = 30_000;

function statusText(m: PublicLiveMatch): string {
    if (m.status === 'half_time') return 'Half time';
    if (m.status === 'full_time') return 'Full time';
    return m.minute !== null ? `${m.minute}'` : 'Live';
}

/**
 * Club page: live score posted from the touchline in Match Centre.
 * Shows nothing when no match has been on in the last 12 hours.
 */
export function LiveScoreCard({ tenant, clubName }: { tenant: string; clubName: string }) {
    const [matches, setMatches] = useState<PublicLiveMatch[]>([]);

    useEffect(() => {
        let stopped = false;
        const load = async () => {
            try {
                const res = await fetch(`${API_BASE}/public/${encodeURIComponent(tenant)}/live`, { cache: 'no-store' });
                if (!res.ok) return;
                const body = await res.json();
                if (!stopped && Array.isArray(body?.data)) setMatches(body.data);
            } catch {
                // Keep the last score shown; the next refresh will try again
            }
        };
        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => { stopped = true; clearInterval(timer); };
    }, [tenant]);

    if (!matches.length) return null;

    return (
        <div className="space-y-4 mb-8" aria-live="polite">
            {matches.map((m, i) => {
                const [home, away, homeScore, awayScore] = m.homeAway === 'home'
                    ? [clubName, m.opponent, m.ourScore, m.theirScore]
                    : [m.opponent, clubName, m.theirScore, m.ourScore];
                const live = m.status === 'live' || m.status === 'half_time';
                const scorers = m.events.filter((e) => e.type === 'goal' && e.player).reverse();
                return (
                    <section key={`${m.opponent}-${i}`} className="bg-gray-900 text-white chamfer-lg p-6" aria-label={`${home} ${homeScore}, ${away} ${awayScore}`}>
                        <p className={`text-xs font-black uppercase tracking-widest mb-3 ${live ? 'text-brand' : 'text-gray-400'}`}>
                            {live ? '● Live · ' : ''}{statusText(m)}
                        </p>
                        <div className="flex items-center justify-between gap-4">
                            <span className="flex-1 text-lg md:text-2xl font-black uppercase italic">{home}</span>
                            <span className="text-4xl md:text-5xl font-black tabular-nums">{homeScore} – {awayScore}</span>
                            <span className="flex-1 text-right text-lg md:text-2xl font-black uppercase italic">{away}</span>
                        </div>
                        {scorers.length > 0 && (
                            <p className="mt-3 text-sm text-gray-300">
                                ⚽ {scorers.map((s) => `${s.player}${s.minute !== null ? ` ${s.minute}'` : ''}`).join(', ')}
                            </p>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
