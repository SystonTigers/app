'use client';

import { useState, useEffect, use } from 'react';
import { createClientSDK, createPost, deletePost } from '@/lib/sdk';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function FeedAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        author: 'Admin',
        imageUrl: ''
    });

    useEffect(() => {
        loadPosts();
    }, [tenant]);

    async function loadPosts() {
        try {
            const sdk = createClientSDK(tenant);
            const data = await sdk.listFeed(1, 20);
            if ((data as any).success && Array.isArray((data as any).data)) {
                setPosts((data as any).data);
            } else if (Array.isArray(data)) {
                setPosts(data);
            } else {
                setPosts([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.content) return;

        try {
            await createPost(formData);
            setFormData({ ...formData, title: '', content: '', imageUrl: '' });
            loadPosts();
        } catch (err) {
            alert('Failed to create post');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this post?')) return;
        try {
            await deletePost(id);
            loadPosts();
        } catch (err) {
            alert('Failed to delete post');
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">News Feed Manager</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold mb-4">Create Post</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Title (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Content</label>
                                <textarea
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700 h-32"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Image URL (Optional)</label>
                                <input
                                    type="url"
                                    value={formData.imageUrl}
                                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-gray-700"
                                    placeholder="https://..."
                                />
                            </div>
                            <button type="submit" className="w-full bg-black text-white py-2 rounded hover:bg-gray-800">
                                Post Update
                            </button>
                        </form>
                    </div>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                    <div className="space-y-4">
                        {posts.map((post: any) => (
                            <div key={post.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 flex justify-between items-start">
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">
                                        {new Date(post.timestamp).toLocaleDateString()} by {post.author}
                                    </div>
                                    {post.content && <h3 className="font-semibold text-lg mb-2">{post.content}</h3>}
                                    {post.media && post.media[0] && (
                                        <img src={post.media[0]} alt="Post" className="h-32 w-auto rounded object-cover mt-2" />
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(post.id)}
                                    className="text-red-600 hover:text-red-900 ml-4"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                        {posts.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                No posts found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
