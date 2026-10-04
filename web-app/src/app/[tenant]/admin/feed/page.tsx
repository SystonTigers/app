'use client';

import { useCallback, useEffect, useState, use } from 'react';
import { createPost, deletePost } from '@/lib/sdk';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDateTime } from '@/lib/format';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Notice, sdkErrorMessage } from '@/components/admin/AdminUi';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

/** A row from GET /api/v1/feed. */
interface Post {
    id: string;
    title: string | null;
    content: string;
    author: string | null;
    image_url?: string | null;
    created_at?: string | number | null;
}

const EMPTY = { title: '', content: '', author: 'Admin', imageUrl: '' };

export default function FeedAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [formData, setFormData] = useState(EMPTY);
    const [formError, setFormError] = useState('');
    const [formDone, setFormDone] = useState('');
    const [listError, setListError] = useState('');
    const [saving, setSaving] = useState(false);

    const loadPosts = useCallback(async () => {
        setLoadError('');
        try {
            const res = await apiFetch('/api/v1/feed?limit=20');
            if (!res.ok) throw new Error(await errorMessage(res, "We couldn't load the club news."));
            const body = await res.json();
            setPosts(Array.isArray(body?.data) ? (body.data as Post[]) : []);
        } catch (err) {
            setLoadError(err instanceof Error && err.message ? err.message : "We couldn't load the club news. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPosts();
    }, [tenant, loadPosts]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormDone('');
        if (!formData.content.trim()) {
            setFormError('Write something to post.');
            return;
        }
        setFormError('');
        setSaving(true);
        try {
            await createPost({ ...formData, content: formData.content.trim() });
            setFormDone('Posted to the club news.');
            setFormData({ ...formData, title: '', content: '', imageUrl: '' });
            loadPosts();
        } catch (err) {
            setFormError(sdkErrorMessage(err, "That didn't post. Please try again."));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(post: Post) {
        if (!confirm('Delete this post? It comes off the website and the app.')) return;
        setListError('');
        try {
            await deletePost(post.id);
            loadPosts();
        } catch {
            setListError("That post wasn't deleted. Please try again.");
        }
    }

    return (
        <div className="container py-8 md:py-10">
            <PageHeader
                eyebrow="Club admin"
                title="Club news"
                subtitle="Posts show on your club's website and in the app. Match updates are posted for you from Match Centre."
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                <form onSubmit={handleSubmit} className="card lg:col-span-2 space-y-4" noValidate>
                    <h2 className="text-2xl">Write a post</h2>
                    <div>
                        <label htmlFor="post-title" className="label">Headline (optional)</label>
                        <input id="post-title" type="text" maxLength={120} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="field" />
                    </div>
                    <div>
                        <label htmlFor="post-content" className="label">Post</label>
                        <textarea id="post-content" rows={6} value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="field" required />
                    </div>
                    <div>
                        <label htmlFor="post-image" className="label">Picture link (optional)</label>
                        <input id="post-image" type="url" placeholder="https://…" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="field" />
                    </div>
                    {formError && <Notice tone="error">{formError}</Notice>}
                    {formDone && <Notice tone="success">{formDone}</Notice>}
                    <button type="submit" disabled={saving} className="btn btn-primary w-full">{saving ? 'Posting…' : 'Post'}</button>
                </form>

                <section className="lg:col-span-3 space-y-3" aria-labelledby="posts-title">
                    <h2 id="posts-title" className="text-2xl">Latest posts</h2>
                    {listError && <Notice tone="error">{listError}</Notice>}
                    {loading ? (
                        <LoadingBlock label="Loading posts" />
                    ) : loadError ? (
                        <ErrorNote message={loadError} onRetry={() => { setLoading(true); loadPosts(); }} />
                    ) : posts.length === 0 ? (
                        <EmptyNote icon="news" title="No posts yet">
                            Write your first post with the form: a welcome, training news or a thank-you to your sponsors.
                        </EmptyNote>
                    ) : (
                        <ul className="space-y-2">
                            {posts.map((post) => (
                                <li key={post.id} className="bg-surface border border-border chamfer-sm p-4 flex items-start gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs text-muted uppercase tracking-wider">
                                            {post.created_at ? formatDateTime(post.created_at) : ''}{post.author ? ` · ${post.author}` : ''}
                                        </p>
                                        {post.title && <h3 className="text-xl mt-1">{post.title}</h3>}
                                        <p className="mt-1 whitespace-pre-line break-words line-clamp-4">{post.content}</p>
                                        {post.image_url && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={post.image_url} alt="" className="mt-3 h-32 w-auto max-w-full object-cover border border-border" />
                                        )}
                                    </div>
                                    <button type="button" onClick={() => handleDelete(post)} className="p-2.5 text-muted hover:text-red-400" aria-label="Delete this post">
                                        <Icon name="trash" className="w-5 h-5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}
