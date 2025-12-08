'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    link: string | null;
    read: boolean;
    type: 'discussion_comment' | 'comment_reply' | 'mention' | 'discussion_locked' | 'discussion_pinned' | 'info' | 'success' | 'warning' | 'match';
    created_at: number;
}

export function NotificationCenter({ tenant }: { tenant?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const unreadCount = notifications.filter(n => !n.read).length;

    const loadNotifications = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            setLoading(true);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/notifications?limit=20`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                setNotifications(data.data);
            }
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load notifications on mount and periodically
    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 60000); // Poll every 60s
        return () => clearInterval(interval);
    }, [loadNotifications]);

    // Reload when dropdown opens
    useEffect(() => {
        if (isOpen) {
            loadNotifications();
        }
    }, [isOpen, loadNotifications]);

    const markAllRead = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/notifications/read-all`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Failed to mark all read:', err);
        }
    };

    const handleClick = async (notification: NotificationItem) => {
        const token = localStorage.getItem('token');

        // Mark as read
        if (!notification.read && token) {
            try {
                await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/notifications/${notification.id}/read`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setNotifications(notifications.map(n =>
                    n.id === notification.id ? { ...n, read: true } : n
                ));
            } catch (err) {
                console.error('Failed to mark read:', err);
            }
        }

        // Navigate if link exists
        if (notification.link) {
            setIsOpen(false);
            const fullLink = notification.link.startsWith('/') && tenant
                ? `/${tenant}${notification.link}`
                : notification.link;
            router.push(fullLink);
        }
    };

    const getTypeIcon = (type: NotificationItem['type']) => {
        switch (type) {
            case 'discussion_comment': return '💬';
            case 'comment_reply': return '↩️';
            case 'mention': return '@';
            case 'discussion_locked': return '🔒';
            case 'discussion_pinned': return '📌';
            case 'success': return '🏆';
            case 'warning': return '⚠️';
            case 'match': return '⚽';
            default: return '📋';
        }
    };

    const getTypeColor = (type: NotificationItem['type']) => {
        switch (type) {
            case 'discussion_comment':
            case 'comment_reply':
            case 'mention':
                return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
            case 'success':
                return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
            case 'warning':
                return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'match':
                return 'bg-brand/10 text-brand';
            default:
                return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
        }
    };

    const formatTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-xs text-brand hover:underline font-medium"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* Notification List */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {loading && notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <div className="animate-spin text-2xl mb-2">⏳</div>
                                    <p>Loading...</p>
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <div className="text-4xl mb-2">🔕</div>
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleClick(notification)}
                                        className={`px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${getTypeColor(notification.type)}`}>
                                                {getTypeIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className={`font-semibold text-sm truncate ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                        {notification.title}
                                                    </h4>
                                                    {!notification.read && (
                                                        <span className="w-2 h-2 bg-brand rounded-full flex-shrink-0" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {formatTime(notification.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        if (tenant) router.push(`/${tenant}/notifications`);
                                    }}
                                    className="w-full text-center text-sm text-brand font-medium hover:underline"
                                >
                                    View all notifications
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
