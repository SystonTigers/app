'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDateTime, formatTime } from '@/lib/format';
import { EmptyNote, PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';

interface Message {
    id: string;
    ts: number;
    userId: string;
    text: string;
}

interface ChatRoom {
    roomId: string;
    name: string;
    type: 'team' | 'group' | 'direct';
    lastTs: number;
}

interface TeamChatProps {
    tenant: string;
}

const REFRESH_MS = 5000;

/** The signed-in user's id, to tell their own messages apart. */
function myUserId(): string | null {
    try {
        const raw = localStorage.getItem('user_data');
        const id = raw ? (JSON.parse(raw) as { id?: unknown }).id : null;
        return typeof id === 'string' ? id : null;
    } catch {
        return null;
    }
}

/** "Just now", "5 min ago", "14:20" today, else "3 Oct 2026, 14:20". */
function when(ts: number): string {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    return mins < 60 * 18 ? formatTime(ts) : formatDateTime(ts);
}

export function TeamChat({ tenant }: TeamChatProps) {
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [room, setRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [sendError, setSendError] = useState('');
    const [sending, setSending] = useState(false);
    const [me, setMe] = useState<string | null>(null);
    const endRef = useRef<HTMLDivElement>(null);

    const loadRooms = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const res = await apiFetch('/api/v1/chat/rooms');
            if (!res.ok) {
                setLoadError(await errorMessage(res, "We couldn't load the chats. Please try again."));
                return;
            }
            const data = await res.json();
            setRooms(Array.isArray(data.data) ? data.data : []);
        } catch (err) {
            console.error('Failed to load rooms:', err);
            setLoadError("We couldn't load the chats. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMessages = useCallback(async (roomId: string) => {
        try {
            const res = await apiFetch(`/api/v1/chat/${encodeURIComponent(roomId)}/history?limit=100`);
            if (!res.ok) return;
            const data = await res.json();
            const list: Message[] = Array.isArray(data.data?.messages) ? data.data.messages : [];
            setMessages([...list].reverse());
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    }, []);

    useEffect(() => {
        setMe(myUserId());
        loadRooms();
    }, [loadRooms, tenant]);

    useEffect(() => {
        if (!room) return;
        loadMessages(room.roomId);
        const timer = setInterval(() => loadMessages(room.roomId), REFRESH_MS);
        return () => clearInterval(timer);
    }, [room, loadMessages]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [messages]);

    async function send(e?: FormEvent) {
        e?.preventDefault();
        if (!text.trim() || !room) return;
        setSending(true);
        setSendError('');
        try {
            const res = await apiFetch(`/api/v1/chat/${encodeURIComponent(room.roomId)}/send`, { method: 'POST', body: JSON.stringify({ text: text.trim() }) });
            if (!res.ok) {
                setSendError(await errorMessage(res, "Your message didn't send. Please try again."));
                return;
            }
            setText('');
            await loadMessages(room.roomId);
        } catch {
            setSendError("Your message didn't send. Check your connection and try again.");
        } finally {
            setSending(false);
        }
    }

    if (!room) {
        return (
            <div>
                <PageHeader eyebrow="Club" title="Chat" subtitle="Talk to your team, coaches and other parents." />
                {loading ? (
                    <div className="space-y-3" aria-busy="true" aria-label="Loading chats">
                        {[1, 2, 3].map((i) => <div key={i} className="h-20 card animate-pulse" />)}
                    </div>
                ) : loadError ? (
                    <EmptyNote icon="alert" title="Chats didn't load" action={<button type="button" onClick={loadRooms} className="btn btn-primary">Try again</button>}>
                        <p role="alert">{loadError}</p>
                    </EmptyNote>
                ) : rooms.length === 0 ? (
                    <EmptyNote icon="chat" title="No chats yet">Chats show here once the club sets them up.</EmptyNote>
                ) : (
                    <ul className="space-y-3">
                        {rooms.map((r) => (
                            <li key={r.roomId}>
                                <button type="button" onClick={() => { setMessages([]); setSendError(''); setRoom(r); }} className="card w-full p-4 flex items-center gap-4 text-left hover:border-brand/60 transition-colors">
                                    <span className="w-12 h-12 shrink-0 hexagon bg-brand/15 text-brand flex items-center justify-center">
                                        <Icon name={r.type === 'team' ? 'shield' : r.type === 'group' ? 'users' : 'chat'} className="w-5 h-5" />
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block font-display text-xl font-bold uppercase leading-tight break-words">{r.name}</span>
                                        <span className="block text-sm text-muted">{r.type === 'team' ? 'Team chat' : r.type === 'group' ? 'Group chat' : 'Chat'}</span>
                                    </span>
                                    {r.lastTs > 0 && <span className="text-xs font-bold text-muted shrink-0">{when(r.lastTs)}</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    }

    return (
        <div className="card p-0 flex flex-col h-[calc(100dvh-220px)] min-h-[420px]">
            <div className="flex items-center gap-3 p-3 border-b border-border">
                <button type="button" onClick={() => setRoom(null)} className="w-11 h-11 flex items-center justify-center text-muted hover:text-brand" aria-label="Back to all chats">
                    <Icon name="arrowLeft" className="w-6 h-6" />
                </button>
                <div className="min-w-0">
                    <h1 className="text-2xl leading-tight break-words">{room.name}</h1>
                    <p className="text-xs font-bold text-muted uppercase tracking-wider">{room.type === 'team' ? 'Team chat' : 'Group chat'}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
                {messages.length === 0 && <p className="text-center text-muted py-10">No messages yet. Say hello!</p>}
                {messages.map((m) => {
                    const mine = !!me && m.userId === me;
                    return (
                        <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                            <p className="text-[11px] font-bold text-muted mb-1 px-1">{mine ? 'You' : 'Club member'} · {when(m.ts)}</p>
                            <p className={`max-w-[85%] sm:max-w-[70%] px-4 py-3 chamfer-sm text-sm whitespace-pre-wrap break-words ${mine ? 'bg-brand text-brand-foreground' : 'bg-surface-raised border border-border'}`}>
                                {m.text}
                            </p>
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            <form onSubmit={send} className="p-3 border-t border-border">
                {sendError && <p role="alert" className="text-sm text-red-400 mb-2">{sendError}</p>}
                <div className="flex gap-2 items-end">
                    <label htmlFor="chat-message" className="sr-only">Message</label>
                    <textarea
                        id="chat-message"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                send();
                            }
                        }}
                        placeholder="Write a message"
                        rows={1}
                        maxLength={2000}
                        className="field flex-1 resize-none max-h-32 min-h-[44px]"
                    />
                    <button type="submit" disabled={!text.trim() || sending} className="btn btn-primary min-h-[44px] px-4" aria-label="Send">
                        <Icon name="arrowRight" className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
}
