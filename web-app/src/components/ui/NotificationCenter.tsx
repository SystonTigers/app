'use client';

import { useState } from 'react';

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    type: 'info' | 'success' | 'warning' | 'match';
    icon: string;
}

export function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([
        { id: '1', title: 'Match Reminder', message: 'vs Rovers FC kicks off in 2 hours', time: '2h ago', read: false, type: 'match', icon: '⚽' },
        { id: '2', title: 'New Result', message: 'Final score: 3-1 Victory!', time: '1d ago', read: false, type: 'success', icon: '🏆' },
        { id: '3', title: 'Training Update', message: 'Session moved to 6pm Tuesday', time: '2d ago', read: true, type: 'info', icon: '📋' },
        { id: '4', title: 'New Message', message: 'Coach posted in Team Chat', time: '3d ago', read: true, type: 'info', icon: '💬' },
    ]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const getTypeColor = (type: NotificationItem['type']) => {
        switch (type) {
            case 'success': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
            case 'warning': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'match': return 'bg-brand/10 text-brand';
            default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
        }
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
                        {unreadCount}
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
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <div className="text-4xl mb-2">🔕</div>
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${getTypeColor(notification.type)}`}>
                                                {notification.icon}
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
                                                    {notification.time}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                            <button className="w-full text-center text-sm text-brand font-medium hover:underline">
                                View all notifications
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
