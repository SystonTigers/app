'use client';

import { useEffect, useState } from 'react';
import { API_BASE, errorMessage, getSessionToken } from '@/lib/session';

interface TableRow {
    position: number;
    team: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number | null;
    goalsAgainst: number | null;
    goalDifference: number;
    points: number;
}

interface LeagueOverview {
    settings: { competition: string; ourTeam: string | null; detectedTeam: string | null; seasonStart: string; mode: 'results' | 'table' };
    teams: string[];
    resultsSaved: number;
    table: TableRow[];
}

type PasteResponse = LeagueOverview & { kind: 'results' | 'table'; found?: number; added?: number; skipped?: number; olderThanSeason?: number; rowsFound?: number };

function authHeaders(): Record<string, string> {
    const token = getSessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * The club's own league table: paste results (or the table) copied from the
 * league's website and we work it out, sorted by points, goal difference and
 * goals scored. Our Match Centre results are added automatically.
 */
export function LeagueTableSettings() {
    const [data, setData] = useState<LeagueOverview | null>(null);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
    const [competition, setCompetition] = useState('');
    const [seasonStart, setSeasonStart] = useState('');

    function show(next: LeagueOverview) {
        setData(next);
        setCompetition(next.settings.competition);
        setSeasonStart(next.settings.seasonStart);
    }

    useEffect(() => {
        fetch(`${API_BASE}/api/v1/club/league`, { headers: authHeaders() })
            .then(async (res) => {
                if (!res.ok) throw new Error(await errorMessage(res, 'Couldn\'t load your league table.'));
                return res.json();
            })
            .then((body) => show(body.data as LeagueOverview))
            .catch((err: Error) => setMessage({ error: true, text: err.message }));
    }, []);

    async function send(path: string, method: string, body: unknown): Promise<PasteResponse | null> {
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                method,
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.success) {
                setMessage({ error: true, text: json?.error?.message || 'That didn\'t work. Please try again.' });
                return null;
            }
            show(json.data as LeagueOverview);
            return json.data as PasteResponse;
        } catch {
            setMessage({ error: true, text: 'Couldn\'t reach the server. Check your connection and try again.' });
            return null;
        } finally {
            setBusy(false);
        }
    }

    async function paste() {
        const result = await send('/api/v1/club/league/paste', 'POST', { text });
        if (!result) return;
        setText('');
        if (result.kind === 'table') {
            setMessage({ error: false, text: `Table saved with ${result.rowsFound} teams, sorted by points, goal difference and goals scored.` });
        } else {
            const extra = [
                result.added === 0 ? 'no new ones (you already had them all)' : `${result.added} new`,
                result.skipped ? `${result.skipped} postponed or unreadable skipped` : '',
                result.olderThanSeason ? `${result.olderThanSeason} from before the season start ignored` : '',
            ].filter(Boolean).join(', ');
            setMessage({ error: false, text: `Found ${result.found} results: ${extra}. Your table is up to date.` });
        }
    }

    const s = data?.settings;
    const ourName = s?.ourTeam || s?.detectedTeam || '';

    return (
        <section className="card space-y-5">
            <div>
                <h2 className="text-2xl">Your league table</h2>
                <p className="text-sm text-muted mt-1">
                    Sorted by points, then goal difference, then goals scored. Your own results from Match Centre are added automatically.
                    For everyone else&apos;s, copy the league&apos;s results page (FA Full-Time, COMET, GotSport, any site) and paste it here once a week.
                </p>
            </div>

            {message && (
                <div role={message.error ? 'alert' : 'status'} className={`p-3 text-sm ${message.error ? 'border border-red-500/40 bg-red-500/10 text-red-200' : 'border border-green-500/40 bg-green-500/10 text-green-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-2">
                <label htmlFor="league-paste" className="label">Paste results or the table</label>
                <p className="text-xs text-muted">On the league&apos;s results page, press Ctrl+A then Ctrl+C (on a phone: select all, copy), then paste below. Pasting the same results again is fine: we skip ones we already have.</p>
                <textarea
                    id="league-paste"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={6}
                    spellCheck={false}
                    placeholder={'e.g.\n27/09/26 10:30   Syston Town Juniors U18 Tigers   3 - 1   Birstall United U18'}
                    className="field font-mono text-xs"
                />
                <div className="flex justify-end">
                    <button type="button" onClick={paste} disabled={busy || !text.trim()} className="btn btn-primary">
                        {busy ? 'Working it out…' : 'Update table'}
                    </button>
                </div>
            </div>

            {s && (
                <div className="grid gap-4 md:grid-cols-3 text-sm">
                    <label className="space-y-1">
                        <span className="label">League name</span>
                        <input value={competition} onChange={(e) => setCompetition(e.target.value)} className="field" />
                    </label>
                    <label className="space-y-1">
                        <span className="label">Your team in the league</span>
                        <select
                            value={s.ourTeam ?? ''}
                            onChange={(e) => send('/api/v1/club/league', 'PUT', { ourTeam: e.target.value })}
                            disabled={busy || data.teams.length === 0}
                            className="field"
                        >
                            <option value="">{s.detectedTeam ? `Automatic (${s.detectedTeam})` : 'Automatic'}</option>
                            {data.teams.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="label">Season started</span>
                        <input type="date" value={seasonStart} onChange={(e) => setSeasonStart(e.target.value)} className="field" />
                    </label>
                    <div className="md:col-span-3 flex flex-wrap justify-between gap-2">
                        <button
                            type="button"
                            disabled={busy || data.resultsSaved === 0}
                            onClick={() => send('/api/v1/club/league/results', 'DELETE', undefined).then((r) => r && setMessage({ error: false, text: 'Pasted results cleared. Paste the results page again to start fresh.' }))}
                            className="btn btn-sm btn-ghost hover:text-red-400"
                        >
                            Clear pasted results ({data.resultsSaved})
                        </button>
                        <button
                            type="button"
                            disabled={busy || (competition === s.competition && seasonStart === s.seasonStart)}
                            onClick={() => send('/api/v1/club/league', 'PUT', { competition, seasonStart }).then((r) => r && setMessage({ error: false, text: 'Saved.' }))}
                            className="btn btn-outline"
                        >
                            Save league details
                        </button>
                    </div>
                </div>
            )}

            {data && data.table.length > 0 && (
                <div className="table-scroll relative">
                    <table className="w-full text-sm tabular-nums">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wider text-muted border-b border-border">
                                <th className="py-2 pr-2">#</th><th className="py-2 pr-2">Team</th>
                                <th className="py-2 px-1 text-center">P</th><th className="py-2 px-1 text-center">W</th><th className="py-2 px-1 text-center">D</th><th className="py-2 px-1 text-center">L</th>
                                <th className="py-2 px-1 text-center">GD</th><th className="py-2 pl-1 text-center">Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.table.map((r) => (
                                <tr key={r.team} className={`border-b border-border ${r.team === ourName ? 'font-bold bg-brand/10' : ''}`}>
                                    <td className="py-2 pr-2">{r.position}</td>
                                    <td className="py-2 pr-2">{r.team}</td>
                                    <td className="py-2 px-1 text-center">{r.played}</td>
                                    <td className="py-2 px-1 text-center">{r.won}</td>
                                    <td className="py-2 px-1 text-center">{r.drawn}</td>
                                    <td className="py-2 px-1 text-center">{r.lost}</td>
                                    <td className="py-2 px-1 text-center">{r.goalDifference > 0 ? '+' : ''}{r.goalDifference}</td>
                                    <td className="py-2 pl-1 text-center">{r.points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
