'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDate } from '@/lib/format';
import { canAccessAdmin, useUserRole } from '@/hooks/useUserRole';
import { EmptyNote, PageHeader } from '@/components/ui/Page';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/Icon';

/** As GET /api/v1/gallery/photos returns it */
interface Photo {
    id: string;
    uri: string;
    caption: string | null;
    uploadedAt: string;
    uploadedBy: string;
    /** Players tagged in the photo (staff tag them in the app) */
    players?: Array<{ id: string; name: string }>;
}

/** As GET /api/v1/gallery/albums returns it */
interface Album {
    id: string;
    title: string;
    type: string;
    date: string | null;
    coverPhoto: string | null;
    photoCount: number;
}

interface PhotoGalleryProps {
    tenant: string;
}

const ALBUM_ICONS: Record<string, IconName> = { match: 'ball', training: 'whistle', throwback: 'history' };

/** Members-only gallery: albums and photos; staff can also add and remove photos. */
export function PhotoGallery({ tenant }: PhotoGalleryProps) {
    const { role } = useUserRole();
    const isStaff = canAccessAdmin(role);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [photosLoading, setPhotosLoading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const loadAlbums = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const res = await apiFetch('/api/v1/gallery/albums');
            if (!res.ok) {
                setLoadError(await errorMessage(res, "We couldn't load the gallery. Please try again."));
                return;
            }
            const data = await res.json();
            setAlbums(Array.isArray(data.data) ? data.data : []);
        } catch (err) {
            console.error('Failed to load albums:', err);
            setLoadError("We couldn't load the gallery. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadPhotos = useCallback(async (albumId: string) => {
        setPhotosLoading(true);
        setError('');
        try {
            const res = await apiFetch(`/api/v1/gallery/photos?albumId=${encodeURIComponent(albumId)}`);
            if (!res.ok) {
                setError(await errorMessage(res, "We couldn't load this album's photos. Please try again."));
                return;
            }
            const data = await res.json();
            setPhotos(Array.isArray(data.data) ? data.data : []);
        } catch (err) {
            console.error('Failed to load photos:', err);
            setError("We couldn't load this album's photos. Check your connection and try again.");
        } finally {
            setPhotosLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAlbums();
    }, [loadAlbums, tenant]);

    useEffect(() => {
        if (selectedAlbum) loadPhotos(selectedAlbum.id);
    }, [selectedAlbum, loadPhotos]);

    useEffect(() => {
        if (!selectedPhoto) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedPhoto(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedPhoto]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedAlbum) return;

        setUploading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('albumId', selectedAlbum.id);

            const res = await apiFetch('/api/v1/gallery/upload', { method: 'POST', body: formData });
            if (!res.ok) {
                setError(await errorMessage(res, "That photo didn't upload. Please try again."));
                return;
            }
            await loadPhotos(selectedAlbum.id);
            e.target.value = '';
        } catch {
            setError("That photo didn't upload. Check your connection and try again.");
        } finally {
            setUploading(false);
        }
    };

    const deletePhoto = async (photoId: string) => {
        if (!confirm('Remove this photo from the gallery?')) return;

        setError('');
        try {
            const res = await apiFetch(`/api/v1/gallery/photos/${photoId}`, { method: 'DELETE' });
            if (!res.ok) {
                setError(await errorMessage(res, "That photo couldn't be removed. Please try again."));
                return;
            }
            if (selectedAlbum) await loadPhotos(selectedAlbum.id);
            setSelectedPhoto(null);
        } catch {
            setError("That photo couldn't be removed. Check your connection and try again.");
        }
    };

    const header = <PageHeader eyebrow="Club" title="Gallery" subtitle="Photos from matches, training and days out." />;

    if (loading) {
        return (
            <div>
                {header}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading the gallery">
                    {[1, 2, 3].map((i) => <div key={i} className="h-24 card animate-pulse" />)}
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div>
                {header}
                <EmptyNote icon="alert" title="The gallery didn't load" action={<button type="button" onClick={loadAlbums} className="btn btn-primary">Try again</button>}>
                    <p role="alert">{loadError}</p>
                </EmptyNote>
            </div>
        );
    }

    // One album
    if (selectedAlbum) {
        return (
            <div>
                <button type="button" onClick={() => { setSelectedAlbum(null); setPhotos([]); }} className="btn btn-ghost btn-sm min-h-[40px] -ml-4 mb-4">
                    <Icon name="arrowLeft" className="w-4 h-4" /> All albums
                </button>
                <PageHeader
                    eyebrow="Gallery"
                    title={selectedAlbum.title}
                    subtitle={`${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}${selectedAlbum.date ? ` · ${formatDate(selectedAlbum.date)}` : ''}`}
                    actions={isStaff ? (
                        <label className={`btn btn-primary ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                            <Icon name="upload" className="w-5 h-5" />
                            {uploading ? 'Uploading…' : 'Add a photo'}
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/gif" onChange={handleUpload} disabled={uploading} className="sr-only" />
                        </label>
                    ) : undefined}
                />

                {isStaff && (
                    <p className="text-sm text-muted mb-6 flex items-start gap-2">
                        <Icon name="shield" className="w-4 h-4 mt-0.5 text-brand" />
                        Only add photos of players whose parents have agreed to photos.
                    </p>
                )}
                {error && <p className="card border-red-500/40 text-red-300 py-4 mb-6" role="alert">{error}</p>}

                {photosLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" aria-busy="true" aria-label="Loading photos">
                        {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-square bg-surface animate-pulse chamfer-sm" />)}
                    </div>
                ) : photos.length === 0 ? (
                    <EmptyNote icon="image" title="No photos in this album yet">
                        {isStaff ? 'Add the first photo with the button above.' : 'Photos show here once club staff add them.'}
                    </EmptyNote>
                ) : (
                    <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {photos.map((photo) => (
                            <li key={photo.id}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedPhoto(photo)}
                                    className="block w-full aspect-square overflow-hidden chamfer-sm bg-surface border border-border hover:border-brand/60 transition-colors"
                                    aria-label={photo.caption ? `Open photo: ${photo.caption}` : 'Open photo'}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photo.uri} alt="" className="w-full h-full object-cover" loading="lazy" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {selectedPhoto && (
                    <div className="fixed inset-0 bg-background/95 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Photo">
                        <button
                            type="button"
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center text-foreground hover:text-brand"
                            aria-label="Close photo"
                            autoFocus
                        >
                            <Icon name="close" className="w-7 h-7" />
                        </button>
                        <figure className="max-w-4xl w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={selectedPhoto.uri} alt={selectedPhoto.caption ?? ''} className="w-full h-auto max-h-[75vh] object-contain" />
                            {selectedPhoto.caption && <figcaption className="text-center mt-4">{selectedPhoto.caption}</figcaption>}
                            {selectedPhoto.players && selectedPhoto.players.length > 0 && (
                                <p className="mt-3 flex flex-wrap justify-center items-center gap-2 text-sm">
                                    <span className="text-muted">In this photo:</span>
                                    {selectedPhoto.players.map((pl) => (
                                        <Link key={pl.id} href={`/${tenant}/squad/${pl.id}`} className="inline-flex items-center min-h-[32px] px-3 bg-brand/15 text-brand chamfer-sm no-underline hover:bg-brand/25">
                                            {pl.name}
                                        </Link>
                                    ))}
                                </p>
                            )}
                            {error && <p className="text-red-300 text-center mt-2" role="alert">{error}</p>}
                            {isStaff && (
                                <div className="mt-4 flex justify-center">
                                    <button type="button" onClick={() => deletePhoto(selectedPhoto.id)} className="btn btn-danger btn-sm min-h-[40px]">
                                        <Icon name="trash" className="w-4 h-4" /> Remove photo
                                    </button>
                                </div>
                            )}
                        </figure>
                    </div>
                )}
            </div>
        );
    }

    // All albums
    return (
        <div>
            {header}
            {albums.length === 0 ? (
                <EmptyNote icon="image" title="No albums yet">
                    {isStaff ? "Make albums in the club app's Gallery, then add photos here or in the app." : 'Photos show here once club staff add them.'}
                </EmptyNote>
            ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {albums.map((album) => (
                        <li key={album.id}>
                            <button
                                type="button"
                                onClick={() => setSelectedAlbum(album)}
                                className="card w-full text-left p-0 overflow-hidden hover:border-brand/60 transition-colors"
                            >
                                {album.coverPhoto && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={album.coverPhoto} alt="" className="w-full h-40 object-cover" loading="lazy" />
                                )}
                                <span className="flex items-center gap-3 p-4">
                                    <span className="w-11 h-11 shrink-0 hexagon bg-brand/15 text-brand flex items-center justify-center">
                                        <Icon name={ALBUM_ICONS[album.type] ?? 'image'} className="w-5 h-5" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-display text-xl font-bold uppercase leading-tight break-words">{album.title}</span>
                                        <span className="block text-sm text-muted">
                                            {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
                                            {album.date ? ` · ${formatDate(album.date)}` : ''}
                                        </span>
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
