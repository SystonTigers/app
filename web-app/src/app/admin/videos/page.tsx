'use client';

import { useState, useEffect } from 'react';
import { createClientSDK } from '@/lib/sdk';

interface Video {
    id: string;
    filename: string;
    status: string;
    uploadTimestamp: number;
    size: number;
}

export default function VideosAdminPage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadVideos();
    }, []);

    async function loadVideos() {
        try {
            // We can reuse the public API for listing videos if we are admin
            // The SDK doesn't have a specific 'listVideos' method yet, but we can fetch directly
            // or add it to SDK. Let's fetch directly for now as we did in TeamCalendar
            // But wait, we are in Admin, so we have a token.
            // We should probably add listVideos/deleteVideo to SDK for consistency.

            // Actually, let's use the generic http client from SDK if we can, or just fetch.
            // The backend route is GET /api/v1/videos

            const res = await fetch('/api/v1/videos', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}` // Basic auth handling
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setVideos(data.data.videos || []);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this video? This cannot be undone.')) return;
        try {
            const res = await fetch(`/api/v1/videos/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                }
            });
            if (res.ok) {
                loadVideos();
            } else {
                alert('Failed to delete video');
            }
        } catch (err) {
            alert('Failed to delete video');
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Video Manager</h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {videos.map((video) => (
                            <tr key={video.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">{video.filename}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                    {new Date(video.uploadTimestamp).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                    {(video.size / 1024 / 1024).toFixed(2)} MB
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded text-xs ${video.status === 'ready' ? 'bg-green-100 text-green-800' :
                                            video.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                                video.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'
                                        }`}>
                                        {video.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <button
                                        onClick={() => handleDelete(video.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {videos.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No videos found. Upload videos from the team app.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
