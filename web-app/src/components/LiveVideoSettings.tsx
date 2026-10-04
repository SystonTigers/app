'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE, errorMessage, getSessionToken } from '@/lib/session';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/admin/AdminUi';

interface StreamSettings {
    youtube: { connected: boolean; channelName: string | null; needsReconnect: boolean };
    canConnect: boolean;
}

const RESULT_MESSAGES: Record<string, { text: string; error: boolean }> = {
    connected: { text: 'YouTube is connected. Streams on your channel now show in the app on match days.', error: false },
    cancelled: { text: 'Connecting was cancelled on Google. Nothing was changed.', error: true },
    failed: { text: "We couldn't connect to YouTube. Please try again.", error: true },
    no_channel: { text: "That Google account doesn't have a YouTube channel. Sign in with the account that owns your club's channel.", error: true },
};

/**
 * Club settings: live match video. Connect the club's YouTube channel and any
 * stream on it around kick-off pops up in the app for parents who aren't there.
 * Without it, managers paste the stream's link in Match Centre.
 */
export function LiveVideoSettings() {
    const search = useSearchParams();
    const [settings, setSettings] = useState<StreamSettings | null>(null);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
    const [busy, setBusy] = useState(false);

    const headers = useCallback((): Record<string, string> => {
        const token = getSessionToken();
        return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    }, []);

    const request = useCallback(async (path: string, init: RequestInit, fallback: string): Promise<StreamSettings | null> => {
        setBusy(true);
        try {
            const res = await fetch(`${API_BASE}${path}`, { ...init, headers: headers() });
            if (!res.ok) {
                setMessage({ text: await errorMessage(res, fallback), error: true });
                return null;
            }
            return ((await res.json())?.data ?? null) as StreamSettings | null;
        } catch {
            setMessage({ text: "We couldn't reach the server. Check your connection and try again.", error: true });
            return null;
        } finally {
            setBusy(false);
        }
    }, [headers]);

    useEffect(() => {
        request('/api/v1/stream/settings', {}, "We couldn't load your live video settings.").then((data) => data && setSettings(data));
        const result = search.get('youtube');
        if (result && RESULT_MESSAGES[result]) setMessage(RESULT_MESSAGES[result]);
    }, [request, search]);

    const connect = async () => {
        setBusy(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_BASE}/api/v1/stream/youtube/start`, { method: 'POST', headers: headers(), body: '{}' });
            if (!res.ok) {
                setMessage({ text: await errorMessage(res, "We couldn't start connecting to YouTube."), error: true });
                return;
            }
            window.location.href = (await res.json()).data.url;
        } catch {
            setMessage({ text: "We couldn't reach the server. Check your connection and try again.", error: true });
        } finally {
            setBusy(false);
        }
    };

    const disconnect = async () => {
        setMessage(null);
        const data = await request('/api/v1/stream/youtube', { method: 'DELETE' }, "We couldn't disconnect.");
        if (data) {
            setSettings(data);
            setMessage({ text: 'YouTube disconnected. Managers can still paste a stream link in Match Centre.', error: false });
        }
    };

    if (!settings) return message ? <div className="md:col-span-2"><Notice tone="error">{message.text}</Notice></div> : null;

    const yt = settings.youtube;
    const help = 'text-sm text-muted mt-1';
    const connectButton = (label: string) => (
        <button type="button" onClick={connect} disabled={busy} className="btn btn-primary mt-4">
            <Icon name="video" className="w-4 h-4" /> {label}
        </button>
    );

    return (
        <section className="card md:col-span-2" aria-labelledby="live-video-title">
            <h2 id="live-video-title" className="text-2xl flex items-center gap-2"><Icon name="play" className="w-5 h-5 text-brand" /> Live match video</h2>
            <p className={help}>
                Stream from your camera (XbotGo, phone or any RTMP camera) to your club&apos;s YouTube channel. The video pops up in the
                app for parents who can&apos;t be there, and they get a &quot;Live now&quot; alert. Set streams to <strong className="text-foreground">Unlisted</strong> in
                YouTube so they only show in your app, and only stream matches where parents have agreed to filming.
            </p>
            {message && <div className="mt-3"><Notice tone={message.error ? 'error' : 'success'}>{message.text}</Notice></div>}
            {yt.connected ? (
                <>
                    <p className={`${help} mt-3`}>
                        Connected to <strong className="text-foreground">{yt.channelName ?? 'your channel'}</strong>. Anything live on it
                        from 45 minutes before kick-off shows in the app automatically.
                    </p>
                    {yt.needsReconnect && (
                        <div className="mt-3">
                            <Notice tone="error">YouTube stopped accepting the connection (the password may have changed or access was removed). Connect again to keep streams appearing.</Notice>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                        {yt.needsReconnect && connectButton('Connect YouTube again')}
                        <button type="button" onClick={disconnect} disabled={busy} className="btn btn-secondary mt-4">Disconnect</button>
                    </div>
                </>
            ) : settings.canConnect ? (
                <>
                    <p className={`${help} mt-3`}>We only ask to see your channel&apos;s streams. We can&apos;t upload, change or delete anything.</p>
                    {connectButton('Connect YouTube')}
                </>
            ) : (
                <p className="mt-3 text-sm text-amber-300">Connecting YouTube isn&apos;t switched on yet.</p>
            )}
            <p className={`${help} mt-4`}>No YouTube connection? Managers can paste the stream&apos;s link under Live video in Match Centre on match day.</p>
        </section>
    );
}
