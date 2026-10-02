'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { apiFetch, errorMessage } from '@/lib/session';

/** As GET /api/v1/gallery/photos returns it */
interface Photo {
    id: string;
    uri: string;
    caption: string | null;
    uploadedAt: string;
    uploadedBy: string;
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

export function PhotoGallery({ tenant }: PhotoGalleryProps) {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadAlbums();
    }, [tenant]);

    useEffect(() => {
        if (selectedAlbum) {
            loadPhotos(selectedAlbum.id);
        }
    }, [selectedAlbum]);

    const loadAlbums = async () => {
        try {
            const res = await apiFetch('/api/v1/gallery/albums');
            const data = await res.json();
            if (data.success) {
                setAlbums(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load albums:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPhotos = async (albumId: string) => {
        try {
            const res = await apiFetch(`/api/v1/gallery/photos?albumId=${albumId}`);
            const data = await res.json();
            if (data.success) {
                setPhotos(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load photos:', error);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedAlbum) return;

        setUploading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('albumId', selectedAlbum.id);

            const res = await apiFetch('/api/v1/gallery/upload', {
                method: 'POST',
                body: formData,
            });

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
        if (!confirm('Delete this photo?')) return;

        setError('');
        try {
            const res = await apiFetch(`/api/v1/gallery/photos/${photoId}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                setError(await errorMessage(res, "That photo couldn't be removed."));
                return;
            }
            if (selectedAlbum) {
                await loadPhotos(selectedAlbum.id);
            }
            setSelectedPhoto(null);
        } catch {
            setError("That photo couldn't be removed. Check your connection and try again.");
        }
    };

    if (loading) {
        return <div className="p-8">Loading gallery...</div>;
    }

    // Photo detail modal
    if (selectedPhoto) {
        return (
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                <button
                    onClick={() => setSelectedPhoto(null)}
                    className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
                >
                    ✕
                </button>
                <div className="max-w-4xl w-full">
                    <img
                        src={selectedPhoto.uri}
                        alt={selectedPhoto.caption ?? ''}
                        className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                    />
                    {selectedPhoto.caption && (
                        <p className="text-white text-center mt-4">{selectedPhoto.caption ?? ''}</p>
                    )}
                    {error && <p className="text-red-300 text-center mt-2" role="alert">{error}</p>}
                    <button
                        onClick={() => deletePhoto(selectedPhoto.id)}
                        className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                        Delete Photo
                    </button>
                </div>
            </div>
        );
    }

    // Album view
    if (selectedAlbum) {
        return (
            <div className="flex flex-col h-full">
                <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-6">
                    <button
                        onClick={() => setSelectedAlbum(null)}
                        className="mb-2 hover:underline"
                    >
                        ← Back to Albums
                    </button>
                    <h2 className="text-2xl font-bold">{selectedAlbum.title}</h2>
                    <p className="text-sm opacity-90">{photos.length} photos</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {photos.map((photo) => (
                            <button
                                key={photo.id}
                                onClick={() => setSelectedPhoto(photo)}
                                className="aspect-square relative overflow-hidden rounded-lg shadow hover:shadow-lg transition-shadow"
                            >
                                <img
                                    src={photo.uri}
                                    alt={photo.caption ?? ''}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>

                    {photos.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No photos yet. Upload your first photo!
                        </div>
                    )}
                </div>

                <div className="border-t p-4 bg-white dark:bg-gray-800">
                    {error && <p className="text-red-600 mb-2" role="alert">{error}</p>}
                    <label className="bg-brand text-white px-6 py-3 rounded-lg hover:bg-brand/90 cursor-pointer inline-block">
                        {uploading ? 'Uploading...' : 'Upload Photo'}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>
        );
    }

    // Albums grid
    return (
        <div className="flex flex-col h-full">
            <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-6">
                <h2 className="text-2xl font-bold">Photo Gallery</h2>
                <p className="text-sm opacity-90">Team photos & memories</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {albums.map((album) => (
                        <button
                            key={album.id}
                            onClick={() => setSelectedAlbum(album)}
                            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow hover:shadow-md transition-shadow text-left"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">
                                    {album.type === 'match' ? '⚽' : album.type === 'training' ? '🏃' : album.type === 'throwback' ? '⏰' : '📸'}
                                </span>
                                <div>
                                    <h3 className="font-bold">{album.title}</h3>
                                    <p className="text-sm text-gray-500">
                                        {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
                                    </p>
                                </div>
                            </div>
                            {album.date && (
                                <p className="text-xs text-gray-400 mt-2">
                                    {new Date(album.date).toLocaleDateString()}
                                </p>
                            )}
                        </button>
                    ))}
                </div>

                {albums.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No albums yet. Club staff can make albums in the app's Gallery.
                    </div>
                )}
            </div>
        </div>
    );
}
