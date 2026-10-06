'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/session';
import { Icon } from '@/components/ui/Icon';

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
                // Members only: signed out, the list is empty and nothing shows
                const res = await apiFetch(`/public/${encodeURIComponent(tenant)}/live`, { cache: 'no-store' });
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
                    <section key={`${m.opponent}-${i}`} className={`card ${live ? 'border-brand/50' : ''}`} aria-label={`${home} ${homeScore}, ${away} ${awayScore}`}>
                        <p className={`inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest mb-4 ${live ? 'text-brand' : 'text-muted'}`}>
                            {live && <span className="w-2 h-2 bg-brand rotate-45 animate-pulse" aria-hidden="true" />}
                            {live ? `Live · ${statusText(m)}` : statusText(m)}
                        </p>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <span className="font-display text-lg md:text-2xl font-extrabold uppercase italic leading-tight break-words">{home}</span>
                            <span className="font-display text-4xl md:text-5xl font-extrabold tabular-nums">{homeScore}&ndash;{awayScore}</span>
                            <span className="text-right font-display text-lg md:text-2xl font-extrabold uppercase italic leading-tight break-words">{away}</span>
                        </div>
                        {scorers.length > 0 && (
                            <p className="mt-4 text-sm text-muted flex items-start gap-2">
                                <Icon name="ball" className="w-4 h-4 mt-0.5 text-brand" />
                                <span>{scorers.map((s) => `${s.player}${s.minute !== null ? ` ${s.minute}'` : ''}`).join(', ')}</span>
                            </p>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
