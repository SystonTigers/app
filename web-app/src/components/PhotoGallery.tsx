'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Photo {
    id: string;
    photo_key: string;
    caption: string;
    uploaded_at: number;
    uploaded_by: string;
}

interface Album {
    id: string;
    name: string;
    type: string;
    album_date: string | null;
    photo_count: number;
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
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/gallery/albums', {
                headers: { Authorization: `Bearer ${token}` },
            });
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
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/gallery/photos?albumId=${albumId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
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
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('albumId', selectedAlbum.id);

            const res = await fetch('/api/v1/gallery/upload', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                await loadPhotos(selectedAlbum.id);
                e.target.value = '';
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
        }
    };

    const deletePhoto = async (photoId: string) => {
        if (!confirm('Delete this photo?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/v1/gallery/photos/${photoId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (selectedAlbum) {
                await loadPhotos(selectedAlbum.id);
            }
            setSelectedPhoto(null);
        } catch (error) {
            console.error('Delete failed:', error);
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
                        src={`/api/v1/gallery/photos/${selectedPhoto.id}`}
                        alt={selectedPhoto.caption}
                        className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                    />
                    {selectedPhoto.caption && (
                        <p className="text-white text-center mt-4">{selectedPhoto.caption}</p>
                    )}
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
                    <h2 className="text-2xl font-bold">{selectedAlbum.name}</h2>
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
                                    src={`/api/v1/gallery/photos/${photo.id}`}
                                    alt={photo.caption}
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
                                    {album.type === 'match' ? '⚽' : album.type === 'training' ? '🏃' : '📸'}
                                </span>
                                <div>
                                    <h3 className="font-bold">{album.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
                                    </p>
                                </div>
                            </div>
                            {album.album_date && (
                                <p className="text-xs text-gray-400 mt-2">
                                    {new Date(album.album_date).toLocaleDateString()}
                                </p>
                            )}
                        </button>
                    ))}
                </div>

                {albums.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No albums yet. Create your first album from the admin panel!
                    </div>
                )}
            </div>
        </div>
    );
}
