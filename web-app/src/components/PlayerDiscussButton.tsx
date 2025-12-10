'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PlayerDiscussButtonProps {
    tenant: string;
    playerId: string;
    playerName: string;
}

export function PlayerDiscussButton({ tenant, playerId, playerName }: PlayerDiscussButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function startDiscussion() {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                // Redirect to login if not authenticated
                router.push(`/${tenant}/login?redirect=${encodeURIComponent(window.location.pathname)}`);
                return;
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/discussions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: `Player Discussion: ${playerName}`,
                    category: 'training', // Player development fits under training
                    related_entity_type: 'player',
                    related_entity_id: playerId
                })
            });

            const data = await res.json();
            if (data.success && data.data?.id) {
                router.push(`/${tenant}/team/discussions/${data.data.id}`);
            } else {
                console.error('Failed to create discussion:', data.error);
                alert('Failed to start discussion. Please try again.');
            }
        } catch (err) {
            console.error('Error creating discussion:', err);
            alert('Failed to start discussion. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={startDiscussion}
            disabled={loading}
            className="bg-gray-800 text-white hover:bg-brand hover:text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
            {loading ? (
                <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Starting...
                </>
            ) : (
                <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Discuss
                </>
            )}
        </button>
    );
}
