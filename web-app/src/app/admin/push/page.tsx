'use client';

import { useState } from 'react';

export default function PushAdminPage() {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ success: boolean; sent: number } | null>(null);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setResult(null);

        try {
            const response = await fetch('/api/v1/push/broadcast', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': 'Bearer ...' // Admin token would be handled by middleware/cookie usually
                },
                body: JSON.stringify({
                    notification: { title, body },
                    data: { type: 'announcement' }
                })
            });

            const data = await response.json();
            setResult(data);
            if (data.success) {
                setTitle('');
                setBody('');
            }
        } catch (error) {
            console.error('Broadcast failed', error);
            setResult({ success: false, sent: 0 });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Push Notifications</h1>
                <p className="text-muted-foreground">Send broadcast messages to all subscribed devices</p>
            </div>

            <div className="card p-6">
                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 rounded-md border border-border bg-background"
                            placeholder="e.g. Match Cancelled"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Message</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full p-2 rounded-md border border-border bg-background h-32"
                            placeholder="Type your message here..."
                            required
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={sending}
                            className="btn btn-primary w-full"
                        >
                            {sending ? 'Sending...' : 'Send Broadcast'}
                        </button>
                    </div>
                </form>

                {result && (
                    <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700'}`}>
                        {result.success ? (
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Broadcast sent successfully to {result.sent} devices!</span>
                            </div>
                        ) : (
                            <span>Failed to send broadcast. Check console for details.</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
