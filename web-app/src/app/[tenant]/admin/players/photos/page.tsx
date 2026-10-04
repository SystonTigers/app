'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/session';
import { clubInitials } from '@/lib/brand';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice } from '@/components/admin/AdminUi';

interface Player {
    id: string;
    name: string;
    position: string | null;
    number?: number | null;
    photo_url?: string | null;
}

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function PlayerPhotosPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [players, setPlayers] = useState<Player[]>([]);
    const [uploading, setUploading] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

    const loadPlayers = useCallback(async () => {
        setLoadError('');
        try {
            const res = await apiFetch('/api/v1/squad');
            if (!res.ok) throw new Error(await errorMessage(res, "We couldn't load your squad."));
            const data = await res.json();
            setPlayers(Array.isArray(data?.data) ? (data.data as Player[]) : []);
        } catch (err) {
            setLoadError(err instanceof Error && err.message ? err.message : "We couldn't load your squad. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPlayers();
    }, [tenant, loadPlayers]);

    const handlePhotoUpload = async (player: Player, file: File) => {
        setUploading(player.id);
        setMessage(null);
        try {
            const formData = new FormData();
            formData.append('photo', file);
            formData.append('playerId', player.id);
            const res = await apiFetch(`/api/v1/players/${encodeURIComponent(player.id)}/photo`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error(await errorMessage(res, `${player.name}'s photo didn't upload. Please try again.`));
            setMessage({ tone: 'success', text: `Photo saved for ${player.name}.` });
            await loadPlayers();
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : `${player.name}'s photo didn't upload. Please try again.` });
        } finally {
            setUploading(null);
        }
    };

    const handlePhotoDelete = async (player: Player) => {
        if (!confirm(`Remove ${player.name}'s photo?`)) return;
        setMessage(null);
        try {
            const res = await apiFetch(`/api/v1/players/${encodeURIComponent(player.id)}/photo`, { method: 'DELETE' });
            if (!res.ok) throw new Error(await errorMessage(res, "The photo wasn't removed. Please try again."));
            setMessage({ tone: 'success', text: `Photo removed for ${player.name}.` });
            await loadPlayers();
        } catch (err) {
            setMessage({ tone: 'error', text: err instanceof Error ? err.message : "The photo wasn't removed. Please try again." });
        }
    };

    return (
        <div className="container py-8 md:py-10">
            <Link href={`/${tenant}/admin/squad`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand mb-4 min-h-[40px]">
                <Icon name="arrowLeft" className="w-4 h-4" /> Squad
            </Link>
            <PageHeader
                eyebrow="Squad"
                title="Player photos"
                subtitle="Profile photos for each player. They only show publicly if the club allows photos and the player's parents agreed."
            />

            {message && <div className="mb-6"><Notice tone={message.tone}>{message.text}</Notice></div>}

            {loading ? (
                <LoadingBlock label="Loading players" />
            ) : loadError ? (
                <ErrorNote message={loadError} onRetry={() => { setLoading(true); loadPlayers(); }} />
            ) : players.length === 0 ? (
                <EmptyNote icon="image" title="No players yet" action={<Link href={`/${tenant}/admin/squad`} className="btn btn-primary">Go to the squad</Link>}>
                    Add players to your squad first, then come back to add their photos.
                </EmptyNote>
            ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {players.map((player) => (
                        <li key={player.id} className="card flex flex-col items-center text-center">
                            {player.photo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={player.photo_url} alt={player.name} className="w-28 h-28 object-cover hexagon mb-4" />
                            ) : (
                                <div className="w-28 h-28 hexagon bg-brand/15 flex items-center justify-center font-display text-4xl font-extrabold text-brand mb-4" aria-hidden="true">
                                    {clubInitials(player.name)}
                                </div>
                            )}
                            <h2 className="text-xl">{player.name}</h2>
                            <p className="text-sm text-muted">{player.number != null ? `#${player.number}` : 'No number'}{player.position ? ` · ${player.position}` : ''}</p>
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                <label className={`btn btn-sm btn-primary ${uploading === player.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <Icon name="upload" className="w-4 h-4" />
                                    {uploading === player.id ? 'Uploading…' : player.photo_url ? 'Change' : 'Upload'}
                                    <span className="sr-only"> photo for {player.name}</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="sr-only"
                                        disabled={uploading === player.id}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handlePhotoUpload(player, file);
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                                {player.photo_url && (
                                    <button type="button" onClick={() => handlePhotoDelete(player)} className="btn btn-sm btn-danger">Remove<span className="sr-only"> {player.name}&apos;s photo</span></button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
