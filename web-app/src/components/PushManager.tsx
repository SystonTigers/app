'use client';

import { useState, useEffect } from 'react';

export function PushManager() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [registered, setRegistered] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
            // Check if we have a token stored (mock check)
            const token = localStorage.getItem('fcm_token');
            if (token) setRegistered(true);
        }
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            alert('This browser does not support desktop notification');
            return;
        }

        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === 'granted') {
            registerDevice();
        }
    };

    const registerDevice = async () => {
        try {
            // In a real app, we would get the FCM token here using firebase-messaging
            // const token = await getToken(messaging, { vapidKey: '...' });
            const mockToken = `mock-token-${Date.now()}`;

            await fetch('/api/v1/push/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}` // Mock auth
                },
                body: JSON.stringify({
                    platform: 'web',
                    token: mockToken
                })
            });

            localStorage.setItem('fcm_token', mockToken);
            setRegistered(true);
            console.log('Device registered for push notifications');
        } catch (error) {
            console.error('Failed to register device', error);
        }
    };

    if (permission === 'granted' && registered) {
        return null; // Hidden if already set up
    }

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-surface border border-border shadow-lg rounded-lg p-4 max-w-sm flex items-start gap-4 animate-fade-in-up">
                <div className="bg-brand/10 p-2 rounded-full text-brand">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-sm mb-1">Enable Notifications</h4>
                    <p className="text-xs text-muted mb-3">Get instant updates for match goals and team announcements.</p>
                    <div className="flex gap-2">
                        <button
                            onClick={requestPermission}
                            className="btn btn-primary text-xs px-3 py-1.5"
                        >
                            Enable
                        </button>
                        <button
                            onClick={() => setPermission('denied')} // Just hide for session
                            className="btn btn-ghost text-xs px-3 py-1.5"
                        >
                            Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
