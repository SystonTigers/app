'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDateTime } from '@/lib/format';
import { PageHeader, EmptyNote } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { ErrorNote, LoadingBlock, Pill } from '@/components/admin/AdminUi';

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

/**
 * Hand-written social posts. The server only stores these (nothing sends them
 * to X, Facebook or Instagram), so the page says so and points managers at the
 * automatic posts in Settings, which do go out.
 */
export default function SocialAdminPage({ params }: PageProps) {
    const { tenant } = use(params);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const loadPosts = useCallback(async () => {
        setLoadError('');
        try {
            const res = await apiFetch('/api/v1/social/posts');
            if (!res.ok) throw new Error(await errorMessage(res, "We couldn't load your social posts."));
            const body = await res.json();
            setPosts(Array.isArray(body?.data) ? (body.data as SocialPost[]) : []);
        } catch (err) {
            setLoadError(err instanceof Error && err.message ? err.message : "We couldn't load your social posts. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    return (
        <div className="container py-8 md:py-10">
            <PageHeader
                eyebrow="Club admin"
                title="Social media"
                subtitle="Goals, results, team news and more are posted for you to the club app, Facebook and Instagram."
            />

            <EmptyNote
                icon="sparkles"
                title="Writing your own posts isn't switched on yet"
                action={<Link href={`/${tenant}/admin/settings`} className="btn btn-primary"><Icon name="settings" className="w-4 h-4" /> Automatic posts</Link>}
            >
                Connect Facebook and Instagram and choose what gets posted in Settings. Posts from Match Centre and the weekly round-ups go out automatically. For a one-off message, use Club news.
            </EmptyNote>

            <section className="mt-8 space-y-3" aria-labelledby="social-history-title">
                <h2 id="social-history-title" className="text-2xl">Saved posts</h2>
                {loading ? (
                    <LoadingBlock label="Loading posts" rows={2} />
                ) : loadError ? (
                    <ErrorNote message={loadError} onRetry={() => { setLoading(true); loadPosts(); }} />
                ) : posts.length === 0 ? (
                    <p className="text-muted">Nothing saved here.</p>
                ) : (
                    <ul className="space-y-2">
                        {posts.map((post) => (
                            <li key={post.id} className="bg-surface border border-border chamfer-sm p-4">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    {post.platforms.map((p) => <Pill key={p}>{p}</Pill>)}
                                    <Pill tone={post.status === 'published' || post.status === 'posted' ? 'success' : 'neutral'}>{post.status}</Pill>
                                </div>
                                <p className="whitespace-pre-line break-words">{post.content}</p>
                                <p className="text-xs text-muted mt-2">
                                    {post.postedAt ? `Posted ${formatDateTime(post.postedAt)}` : `Saved ${formatDateTime(post.createdAt)}`}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
