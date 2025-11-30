'use client';

import { use, useState, useEffect } from 'react';
import { SocialPostComposer } from '@/components/SocialPostComposer';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

interface SocialPost {
    id: string;
    content: string;
    platforms: string[];
    status: string;
    scheduledFor: number | null;
    postedAt: number | null;
    createdAt: number;
}

export default function SocialAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/social/posts', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setPosts(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePost = async (content: string, platforms: string[], mediaUrls: string[], scheduledFor?: number) => {
        const token = localStorage.getItem('token');
        await fetch('/api/v1/social/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content, platforms, mediaUrls, scheduledFor }),
        });
        await loadPosts();
    };

    const getStatusBadge = (post: SocialPost) => {
        if (post.status === 'posted') {
            return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">✓ Posted</span>;
        }
        if (post.status === 'scheduled') {
            return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">🕒 Scheduled</span>;
        }
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">✗ Failed</span>;
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-6 rounded-lg">
                <h2 className="text-2xl font-bold">Social Media Dashboard</h2>
                <p className="text-sm opacity-90">Manage your social media posts across all platforms</p>
            </div>

            <SocialPostComposer onPost={handlePost} />

            {/* Posts History */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h3 className="text-lg font-semibold mb-4">Recent Posts</h3>

                {loading ? (
                    <p className="text-gray-500">Loading...</p>
                ) : posts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No posts yet</p>
                ) : (
                    <div className="space-y-4">
                        {posts.map(post => (
                            <div key={post.id} className="border dark:border-gray-700 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex gap-2">
                                        {post.platforms.map(p => (
                                            <span key={p} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                    {getStatusBadge(post)}
                                </div>
                                <p className="text-sm mb-2">{post.content}</p>
                                <p className="text-xs text-gray-500">
                                    {post.scheduledFor && !post.postedAt
                                        ? `Scheduled for ${new Date(post.scheduledFor).toLocaleString()}`
                                        : post.postedAt
                                            ? `Posted ${new Date(post.postedAt).toLocaleString()}`
                                            : `Created ${new Date(post.createdAt).toLocaleString()}`}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
