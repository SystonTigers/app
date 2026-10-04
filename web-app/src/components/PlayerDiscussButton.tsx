'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/session';
import { canAccessAdmin, useUserRole } from '@/hooks/useUserRole';
import { Icon } from '@/components/ui/Icon';

interface PlayerDiscussButtonProps {
    tenant: string;
    playerId: string;
    playerName: string;
}

/**
 * Staff only: start a coaches' chat about a player in Team Talk (the
 * "training" category, which parents and players can't see).
 */
export function PlayerDiscussButton({ tenant, playerId, playerName }: PlayerDiscussButtonProps) {
    const router = useRouter();
    const { role } = useUserRole();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!canAccessAdmin(role)) return null;

    async function startDiscussion() {
        setLoading(true);
        setError('');
        try {
            const res = await apiFetch('/api/v1/discussions', {
                method: 'POST',
                body: JSON.stringify({
                    title: `Player development: ${playerName}`,
                    category: 'training',
                    related_entity_type: 'player',
                    related_entity_id: playerId,
                }),
            });
            if (!res.ok) {
                setError(await errorMessage(res, "We couldn't start the chat. Please try again."));
                return;
            }
            const data = await res.json();
            router.push(`/${tenant}/team/discussions/${data.data.id}`);
        } catch (err) {
            console.error('Failed to start player discussion:', err);
            setError("We couldn't start the chat. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-2 md:items-end">
            <button type="button" onClick={startDiscussion} disabled={loading} className="btn btn-secondary">
                <Icon name="chat" className="w-5 h-5" />
                {loading ? 'Starting…' : 'Discuss with coaches'}
            </button>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        </div>
    );
}
