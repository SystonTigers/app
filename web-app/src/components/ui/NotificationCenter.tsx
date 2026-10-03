'use client';

/** The bell in the club header: the signed-in person's latest notifications. */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, getSessionToken } from '@/lib/session';
import { formatDate } from '@/lib/format';
import { Icon, type IconName } from './Icon';

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    link: string | null;
    read: boolean;
    type: 'discussion_comment' | 'comment_reply' | 'mention' | 'discussion_locked' | 'discussion_pinned' | 'info' | 'success' | 'warning' | 'match';
    created_at: number;
}

const ICONS: Record<NotificationItem['type'], IconName> = {
    discussion_comment: 'chat',
    comment_reply: 'chat',
    mention: 'chat',
    discussion_locked: 'lock',
    discussion_pinned: 'flag',
    success: 'trophy',
    warning: 'alert',
    match: 'ball',
    info: 'info',
};

function timeAgo(timestamp: number): string {
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return formatDate(timestamp);
}

export function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const router = useRouter();
    const tenant = (useParams()?.tenant as string | undefined) ?? '';

    const unreadCount = notifications.filter((n) => !n.read).length;

    const loadNotifications = useCallback(async () => {
        if (!getSessionToken()) return;
        try {
            setLoading(true);
            const res = await apiFetch('/api/v1/notifications?limit=20');
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) setNotifications(data.data);
            setFailed(false);
        } catch {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 60000);
        return () => clearInterval(interval);
    }, [loadNotifications]);

    useEffect(() => {
        if (isOpen) loadNotifications();
    }, [isOpen, loadNotifications]);

    const markAllRead = async () => {
        const res = await apiFetch('/api/v1/notifications/read-all', { method: 'POST' }).catch(() => null);
        if (res?.ok) setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    };

    const open = async (notification: NotificationItem) => {
        if (!notification.read) {
            const res = await apiFetch(`/api/v1/notifications/${notification.id}/read`, { method: 'POST' }).catch(() => null);
            if (res?.ok) setNotifications((list) => list.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
        }
        if (notification.link) {
            setIsOpen(false);
            router.push(notification.link.startsWith('/') && tenant ? `/${tenant}${notification.link}` : notification.link);
        }
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-300 hover:text-brand transition-colors"
                aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                aria-expanded={isOpen}
            >
                <Icon name="bell" className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-brand text-brand-foreground text-[11px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <button type="button" aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setIsOpen(false)} />
                    <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 bg-surface border border-border shadow-2xl z-50 overflow-hidden chamfer-sm">
                        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                            <h3 className="text-lg">Notifications</h3>
                            {unreadCount > 0 && (
                                <button type="button" onClick={markAllRead} className="text-xs font-bold text-brand hover:underline">
                                    Mark all as read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            {loading && notifications.length === 0 ? (
                                <p className="p-8 text-center text-muted">Loading…</p>
                            ) : failed && notifications.length === 0 ? (
                                <p className="p-8 text-center text-muted">Notifications didn&apos;t load. Please try again in a moment.</p>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-muted">
                                    <Icon name="bell" className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                                    <p>You&apos;re all caught up. Replies, mentions and match news will show here.</p>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <button
                                        type="button"
                                        key={n.id}
                                        onClick={() => open(n)}
                                        className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface-raised transition-colors flex items-start gap-3 ${!n.read ? 'bg-brand/5' : ''}`}
                                    >
                                        <span className="w-9 h-9 hexagon bg-brand/15 text-brand flex items-center justify-center shrink-0">
                                            <Icon name={ICONS[n.type] ?? 'info'} className="w-4 h-4" />
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="flex items-center justify-between gap-2">
                                                <span className={`font-semibold text-sm truncate ${!n.read ? 'text-foreground' : 'text-gray-400'}`}>{n.title}</span>
                                                {!n.read && <span className="w-2 h-2 bg-brand rounded-full shrink-0" />}
                                            </span>
                                            <span className="block text-sm text-muted truncate">{n.message}</span>
                                            <span className="block text-xs text-gray-500 mt-1">{timeAgo(n.created_at)}</span>
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
