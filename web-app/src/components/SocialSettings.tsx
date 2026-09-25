'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE, errorMessage, getSessionToken } from '@/lib/session';
import { GraphicsSettings, type GraphicsInfo } from './GraphicsSettings';

type NameStyle = 'full' | 'first_initial' | 'initial_last' | 'first' | 'last';
type MatchKind = 'lineup' | 'goal' | 'opp_goal' | 'kick_off' | 'half_time' | 'second_half' | 'full_time' | 'yellow' | 'red' | 'sub' | 'motm';
type ClubKind = 'countdown' | 'matchday' | 'fixtures' | 'results' | 'table' | 'postponed' | 'birthday' | 'player_of_week' | 'player_of_month' | 'milestone' | 'throwback' | 'quote';
type Kind = MatchKind | ClubKind;
type Events = Record<Kind, { feed: boolean; social: boolean }>;

interface Settings {
    nameStyle: NameStyle;
    photos: boolean;
    undoWindow: boolean;
    events: Events;
    connections: { facebook: { id: string; name: string | null } | null; instagram: { id: string; name: string | null } | null };
    canConnect: boolean;
    graphics: GraphicsInfo;
}

const MATCH_KINDS: Array<[Kind, string]> = [
    ['lineup', 'Team news (line-up)'],
    ['kick_off', 'Kick-off'],
    ['goal', 'Our goals'],
    ['opp_goal', 'Opposition goals'],
    ['yellow', 'Yellow cards'],
    ['red', 'Red cards'],
    ['sub', 'Substitutions'],
    ['half_time', 'Half time'],
    ['second_half', 'Second half'],
    ['full_time', 'Full time'],
    ['motm', 'Man of the Match'],
];

/** Posted automatically on a schedule (UK time). */
const CLUB_KINDS: Array<[Kind, string]> = [
    ['countdown', '3 days to go (6pm, 3 days before)'],
    ['matchday', 'Match day (8am)'],
    ['postponed', 'Game postponed (when you mark it)'],
    ['fixtures', "This week's fixtures (Monday 6pm)"],
    ['results', "This week's results (Sunday 7pm)"],
    ['table', 'League table (Monday 12pm)'],
    ['player_of_week', 'Player of the week (Monday 7pm)'],
    ['player_of_month', 'Player of the month (1st of the month)'],
    ['milestone', 'Milestones: 10, 25, 50... appearances or goals (7pm)'],
    ['birthday', 'Player birthdays (8am, no age shown)'],
    ['throwback', 'Throwback Thursday photo (6pm)'],
    ['quote', 'Quote of the week (Wednesday 12pm)'],
];

const NAME_STYLES: Array<[NameStyle, string]> = [
    ['first_initial', 'Sam S.'],
    ['initial_last', 'S. Smith'],
    ['full', 'Sam Smith'],
    ['first', 'Sam'],
    ['last', 'Smith'],
];

const CONNECT_MESSAGES: Record<string, string> = {
    connected: 'Facebook and Instagram are connected.',
    cancelled: 'Connecting was cancelled on Facebook. Nothing was changed.',
    failed: "We couldn't connect to Facebook. Please try again.",
    no_pages: "That Facebook account doesn't manage any Pages. Log in with the account that runs your club's Page.",
};

/**
 * Club settings: how players appear publicly (club page and posts), the
 * Facebook/Instagram connection, and which match events post where.
 */
export function SocialSettings() {
    const search = useSearchParams();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [events, setEvents] = useState<Events | null>(null);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
    const [busy, setBusy] = useState(false);
    const [choices, setChoices] = useState<Array<{ id: string; name: string; instagram: string | null }> | null>(null);
    const [chosenPage, setChosenPage] = useState('');

    const headers = useCallback((): Record<string, string> => {
        const token = getSessionToken();
        return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    }, []);

    const apply = (data: Settings) => {
        setSettings(data);
        setEvents(data.events);
    };

    const request = useCallback(async (path: string, init: RequestInit, fallback: string): Promise<Settings | null> => {
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}${path}`, { ...init, headers: headers() });
            if (!res.ok) {
                setMessage({ text: await errorMessage(res, fallback), error: true });
                return null;
            }
            const body = await res.json();
            return (body?.data ?? null) as Settings | null;
        } catch {
            setMessage({ text: "We couldn't reach the server. Check your connection and try again.", error: true });
            return null;
        } finally {
            setBusy(false);
        }
    }, [headers]);

    useEffect(() => {
        request('/api/v1/social/settings', {}, "We couldn't load your settings.").then((data) => data && apply(data));
        const result = search.get('social');
        if (result && CONNECT_MESSAGES[result]) setMessage({ text: CONNECT_MESSAGES[result], error: result !== 'connected' });
        const key = search.get('key');
        if (result === 'choose' && key) {
            fetch(`${API_BASE}/api/v1/social/meta/choices/${encodeURIComponent(key)}`, { headers: headers() })
                .then((res) => res.json())
                .then((body) => {
                    if (body?.success) setChoices(body.data);
                    else setMessage({ text: body?.error?.message ?? 'That choice has expired. Click Connect again.', error: true });
                })
                .catch(() => setMessage({ text: "We couldn't load your Pages. Click Connect again.", error: true }));
        }
    }, [request, search, headers]);

    // Managers can change the name style; photos are the club admins' decision
    const saveNameStyle = async (nameStyle: NameStyle) => {
        const data = await request('/api/v1/social/settings', { method: 'PUT', body: JSON.stringify({ nameStyle }) }, "We couldn't save that.");
        if (data) {
            apply(data);
            setMessage({ text: 'Saved. New posts use this name style.', error: false });
        }
    };

    const savePhotos = async (photos: boolean) => {
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/v1/tenants/me`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ publicPhotos: photos }) });
            if (!res.ok) {
                setMessage({ text: await errorMessage(res, "We couldn't save that."), error: true });
                return;
            }
            setSettings((s) => (s ? { ...s, photos } : s));
            setMessage({ text: 'Saved.', error: false });
        } finally {
            setBusy(false);
        }
    };

    const saveGraphics = async (body: { pack?: string; sponsorName?: string | null }, done: string) => {
        const data = await request('/api/v1/social/settings', { method: 'PUT', body: JSON.stringify(body) }, "We couldn't save that.");
        if (data) {
            apply(data);
            setMessage({ text: done, error: false });
        }
    };

    const connect = async () => {
        setBusy(true);
        try {
            const res = await fetch(`${API_BASE}/api/v1/social/meta/start`, { method: 'POST', headers: headers(), body: '{}' });
            if (!res.ok) {
                setMessage({ text: await errorMessage(res, "We couldn't start connecting to Facebook."), error: true });
                return;
            }
            window.location.href = (await res.json()).data.url;
        } finally {
            setBusy(false);
        }
    };

    const choosePage = async () => {
        const data = await request('/api/v1/social/meta/select', { method: 'POST', body: JSON.stringify({ key: search.get('key'), pageId: chosenPage }) }, "We couldn't connect that Page.");
        if (data) {
            apply(data);
            setChoices(null);
            setMessage({ text: CONNECT_MESSAGES.connected, error: false });
        }
    };

    const disconnect = async () => {
        const data = await request('/api/v1/social/connections/meta', { method: 'DELETE' }, "We couldn't disconnect.");
        if (data) {
            apply(data);
            setMessage({ text: 'Disconnected. Nothing more will be posted to Facebook or Instagram.', error: false });
        }
    };

    const savePosting = async (undoWindow: boolean) => {
        const data = await request('/api/v1/social/settings', { method: 'PUT', body: JSON.stringify({ undoWindow, events }) }, "We couldn't save your posting choices.");
        if (data) {
            apply(data);
            setMessage({ text: 'Posting choices saved.', error: false });
        }
    };

    if (!settings || !events) {
        return message ? <p role="alert" className="text-sm text-red-600">{message.text}</p> : null;
    }

    const fb = settings.connections.facebook;
    const ig = settings.connections.instagram;
    const card = 'bg-white dark:bg-gray-800 rounded-lg p-6 shadow';
    const heading = 'font-semibold text-lg text-gray-900 dark:text-white';
    const help = 'text-sm text-gray-500 dark:text-gray-400 mt-1';

    return (
        <div className="space-y-4 md:col-span-2">
            {message && (
                <p role={message.error ? 'alert' : 'status'} className={`text-sm ${message.error ? 'text-red-600' : 'text-green-700 dark:text-green-400'}`}>{message.text}</p>
            )}

            <section className={card} aria-labelledby="names-title">
                <h3 id="names-title" className={heading}>Players on your club page and social posts</h3>
                <p className={help}>Anyone can see these. Only show full names or photos if parents have agreed. Parents and players in your app always see full names. Team managers can change the name style; only club admins can switch photos on.</p>
                <fieldset className="mt-4">
                    <legend className="text-sm font-medium text-gray-900 dark:text-white mb-2">Show names as</legend>
                    <div className="flex flex-wrap gap-3">
                        {NAME_STYLES.map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 cursor-pointer">
                                <input id={`name-style-${value}`} type="radio" name="name-style" className="accent-brand" checked={settings.nameStyle === value} disabled={busy}
                                    onChange={() => saveNameStyle(value)} />
                                {label}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <label className="mt-4 flex items-start gap-3 cursor-pointer">
                    <input id="public-photos" type="checkbox" className="mt-1 h-5 w-5 accent-brand" checked={settings.photos} disabled={busy}
                        onChange={(e) => savePhotos(e.target.checked)} />
                    <span className="text-sm text-gray-900 dark:text-white">Show players&apos; photos (on goal graphics and the club page)</span>
                </label>
            </section>

            <GraphicsSettings graphics={settings.graphics} busy={busy} onSave={saveGraphics}
                onMessage={(text, error) => setMessage({ text, error })} />

            <section className={card} aria-labelledby="connect-title">
                <h3 id="connect-title" className={heading}>Facebook and Instagram</h3>
                {fb ? (
                    <>
                        <p className={help}>
                            Posting to the Facebook Page <strong className="text-gray-900 dark:text-white">{fb.name ?? fb.id}</strong>
                            {ig ? <> and Instagram <strong className="text-gray-900 dark:text-white">@{ig.name ?? ig.id}</strong></> : <>. No Instagram business account is linked to that Page, so nothing goes to Instagram.</>}
                        </p>
                        <button type="button" onClick={disconnect} disabled={busy} className="mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-900 dark:text-white disabled:opacity-50">
                            Disconnect
                        </button>
                    </>
                ) : choices ? (
                    <>
                        <p className={help}>You run more than one Facebook Page. Choose your club&apos;s:</p>
                        <div className="mt-3 space-y-2">
                            {choices.map((c) => (
                                <label key={c.id} className="flex items-center gap-2 text-sm text-gray-900 dark:text-white cursor-pointer">
                                    <input id={`page-${c.id}`} type="radio" name="page" className="accent-brand" checked={chosenPage === c.id} onChange={() => setChosenPage(c.id)} />
                                    {c.name}{c.instagram ? ` (Instagram @${c.instagram})` : ''}
                                </label>
                            ))}
                        </div>
                        <button type="button" onClick={choosePage} disabled={!chosenPage || busy} className="mt-4 px-4 py-2 bg-brand text-black rounded-lg text-sm font-bold disabled:opacity-50">
                            Connect this Page
                        </button>
                    </>
                ) : (
                    <>
                        <p className={help}>
                            Connect your club&apos;s Facebook Page to post match updates automatically. If an Instagram business account is linked to the Page, posts go there too.
                        </p>
                        {settings.canConnect ? (
                            <button type="button" onClick={connect} disabled={busy} className="mt-4 px-4 py-2 bg-brand text-black rounded-lg text-sm font-bold disabled:opacity-50">
                                Connect Facebook and Instagram
                            </button>
                        ) : (
                            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">Facebook and Instagram posting isn&apos;t switched on yet. Posts still go to your club app.</p>
                        )}
                    </>
                )}
                <p className={`${help} mt-4`}>TikTok: use Share next to each update in Match Centre until TikTok approves automatic posting.</p>
            </section>

            <section className={card} aria-labelledby="posting-title">
                <h3 id="posting-title" className={heading}>What gets posted</h3>
                <label className="mt-3 flex items-start gap-3 cursor-pointer">
                    <input id="undo-window" type="checkbox" className="mt-1 h-5 w-5 accent-brand" checked={settings.undoWindow} disabled={busy}
                        onChange={(e) => savePosting(e.target.checked)} />
                    <span className="text-sm text-gray-900 dark:text-white">
                        Wait 1 minute before posting, so a mistake can be undone in Match Centre
                        <span className="block text-gray-500 dark:text-gray-400">Instagram doesn&apos;t let apps delete posts, so this is the only way to stop a wrong one there.</span>
                    </span>
                </label>
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                <th className="py-2 font-medium">When</th>
                                <th className="py-2 font-medium text-center">Club app</th>
                                <th className="py-2 font-medium text-center">Facebook and Instagram</th>
                            </tr>
                        </thead>
                        <tbody>
                            {([['During matches', MATCH_KINDS], ['Club posts', CLUB_KINDS]] as const).map(([group, kinds]) => (
                                <Fragment key={group}>
                                    <tr><th colSpan={3} scope="colgroup" className="pt-4 pb-1 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{group}</th></tr>
                                    {kinds.map(([kind, label]) => (
                                        <tr key={kind} className="border-b border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white">
                                            <td className="py-2">{label}</td>
                                            {(['feed', 'social'] as const).map((where) => (
                                                <td key={where} className="py-2 text-center">
                                                    <input
                                                        id={`post-${kind}-${where}`}
                                                        type="checkbox"
                                                        className="h-5 w-5 accent-brand"
                                                        aria-label={`${label}: ${where === 'feed' ? 'club app' : 'Facebook and Instagram'}`}
                                                        checked={events[kind][where]}
                                                        onChange={(e) => setEvents({ ...events, [kind]: { ...events[kind], [where]: e.target.checked } })}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button type="button" onClick={() => savePosting(settings.undoWindow)} disabled={busy} className="mt-4 px-4 py-2 bg-brand text-black rounded-lg text-sm font-bold disabled:opacity-50">
                    Save posting choices
                </button>
            </section>
        </div>
    );
}
