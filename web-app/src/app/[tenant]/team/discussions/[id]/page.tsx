'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DiscussionVideoPlayer, getTimestampAtCurrentTime } from '@/components/DiscussionVideoPlayer';

interface Comment {
    id: string;
    author_name: string;
    content: string;
    video_timestamp: number | null;
    created_at: number;
    replies?: Comment[];
}

interface Discussion {
    id: string;
    category: string;
    title: string;
    author_id: string;
    author_name: string;
    video_id: string | null;
    pinned: boolean;
    locked: boolean;
    created_at: number;
    comments: Comment[];
}

// Parse timestamps like [12:34] or [1:23:45] in content
function parseTimestamps(content: string) {
    const regex = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;
    const parts: Array<{ type: 'text' | 'timestamp'; value?: string; seconds?: number; display?: string }> = [];
    let lastIndex = 0;

    let match;
    while ((match = regex.exec(content)) !== null) {
        // Add text before timestamp
        if (match.index > lastIndex) {
            parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
        }

        // Calculate seconds
        const h = parseInt(match[1]);
        const m = parseInt(match[2]);
        const s = match[3] ? parseInt(match[3]) : 0;
        const seconds = match[3] ? h * 3600 + m * 60 + s : h * 60 + m;

        parts.push({ type: 'timestamp', display: match[0], seconds });
        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
        parts.push({ type: 'text', value: content.slice(lastIndex) });
        onReply,
            isCoach
    }: {
        comment: Comment;
        onReply: (parentId: string) => void;
        isCoach: boolean;
    }) {
        return (
            <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand/60 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {comment.author_name[0]}
                </div>

                <div className="flex-1">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-gray-900 dark:text-white">{comment.author_name}</span>
                            <span className="text-xs text-gray-500">
                                {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <div className="text-gray-700 dark:text-gray-300">
                            <TimestampContent content={comment.content} />
                        </div>
                    </div>

                    <button
                        onClick={() => onReply(comment.id)}
                        className="mt-2 text-sm text-gray-500 hover:text-brand font-medium transition-colors"
                    >
                        Reply
                    </button>

                    {/* Nested replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 ml-6 space-y-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                            {comment.replies.map(reply => (
                                <CommentThread
                                    key={reply.id}
                                    comment={reply}
                                    onReply={onReply}
                                    isCoach={isCoach}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    function CategoryBadge({ category }: { category: string }) {
        const colors: Record<string, string> = {
            tactics: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            training: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'match-analysis': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        };

        return (
            <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${colors[category] || colors.general}`}>
                {category.replace('-', ' ')}
            </span>
        );
    }

    export default function DiscussionDetailPage({
        params
    }: {
        params: Promise<{ tenant: string; id: string }>
    }) {
        const [tenant, setTenant] = useState('');
        const [discussionId, setDiscussionId] = useState('');
        const [discussion, setDiscussion] = useState<Discussion | null>(null);
        const [loading, setLoading] = useState(true);
        const [newComment, setNewComment] = useState('');
        const [replyingTo, setReplyingTo] = useState<string | null>(null);
        const [submitting, setSubmitting] = useState(false);
        const router = useRouter();

        useEffect(() => {
            params.then(p => {
                setTenant(p.tenant);
                setDiscussionId(p.id);
            });
        }, [params]);

        useEffect(() => {
            if (!tenant || !discussionId) return;
            loadDiscussion();
        }, [tenant, discussionId]);

        async function loadDiscussion() {
            try {
                setLoading(true);
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/discussions/${discussionId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    }
                });
                const data = await res.json();
                if (data.success) {
                    setDiscussion(data.data);
                }
            } catch (err) {
                console.error('Failed to load discussion:', err);
            } finally {
                setLoading(false);
            }
        }

        async function handleSubmitComment(e: React.FormEvent) {
            e.preventDefault();
            if (!newComment.trim() || !discussionId) return;

            try {
                setSubmitting(true);
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/discussions/${discussionId}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    },
                    body: JSON.stringify({
                        content: newComment,
                        parent_comment_id: replyingTo
                    })
                });

                if (res.ok) {
                    setNewComment('');
                    setReplyingTo(null);
                    loadDiscussion(); // Reload to show new comment
                }
            } catch (err) {
                console.error('Failed to submit comment:', err);
            } finally {
                setSubmitting(false);
            }
        }

        async function togglePin() {
            if (!discussion) return;
            try {
                await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/discussions/${discussionId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    },
                    body: JSON.stringify({ pinned: !discussion.pinned })
                });
                loadDiscussion();
            } catch (err) {
                console.error('Failed to toggle pin:', err);
            }
        }

        async function toggleLock() {
            if (!discussion) return;
            try {
                await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/discussions/${discussionId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    },
                    body: JSON.stringify({ locked: !discussion.locked })
                });
                loadDiscussion();
            } catch (err) {
                console.error('Failed to toggle lock:', err);
            }
        }

        if (loading) {
            return (
                <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
                    <div className="container px-6 py-12">
                        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse mb-8"></div>
                        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                    </div>
                </div>
            );
        }

        if (!discussion) {
            return (
                <div className="min-h-screen bg-gray-50 dark:bg-black pb-20 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Discussion not found</h2>
                        <Link href={`/${tenant}/team/discussions`} className="text-brand hover:underline">
                            ← Back to discussions
                        </Link>
                    </div>
                </div>
            );
        }

        const isCoach = false; // TODO: Get from user context

        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
                {/* Back Button */}
                <div className="border-b border-gray-200 dark:border-gray-800 py-4 px-6 bg-white dark:bg-gray-900">
                    <div className="container">
                        <Link
                            href={`/${tenant}/team/discussions`}
                            className="text-gray-600 dark:text-gray-400 hover:text-brand transition-colors inline-flex items-center gap-2"
                        >
                            ← Back to discussions
                        </Link>
                    </div>
                </div>

                <div className="container px-6 py-12">
                    {/* Discussion Header */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <CategoryBadge category={discussion.category} />
                                {discussion.pinned && <span className="text-2xl">📌</span>}
                                {discussion.locked && <span className="text-2xl">🔒</span>}
                            </div>

                            {isCoach && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={togglePin}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        {discussion.pinned ? 'Unpin' : 'Pin'}
                                    </button>
                                    <button
                                        onClick={toggleLock}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        {discussion.locked ? 'Unlock' : 'Lock'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">
                            {discussion.title}
                        </h1>

                        <div className="text-sm text-gray-500">
                            Started by <span className="font-bold">{discussion.author_name}</span> on {new Date(discussion.created_at).toLocaleDateString()}
                        </div>
                    </div>

                    {/* Comments */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8">
                        <h2 className="text-2xl font-black uppercase tracking-tight mb-6">Comments</h2>

                        <div className="space-y-6">
                            {discussion.comments.length > 0 ? (
                                discussion.comments.map(comment => (
                                    <CommentThread
                                        key={comment.id}
                                        comment={comment}
                                        onReply={setReplyingTo}
                                        isCoach={isCoach}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    <p className="text-lg mb-2">No comments yet</p>
                                    <p className="text-sm">Be the first to share your thoughts!</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Add Comment */}
                    {(!discussion.locked || isCoach) && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                            <h3 className="text-xl font-black uppercase tracking-tight mb-4">
                                {replyingTo ? 'Add Reply' : 'Add Comment'}
                            </h3>

                            {replyingTo && (
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
                                    <span className="text-sm text-blue-800 dark:text-blue-300">Replying to a comment</span>
                                    <button
                                        onClick={() => setReplyingTo(null)}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSubmitComment}>
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Share your thoughts... (Use [MM:SS] for timestamps)"
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 min-h-[120px] resize-y"
                                    disabled={submitting}
                                />

                                <div className="flex justify-end mt-4">
                                    <button
                                        type="submit"
                                        disabled={submitting || !newComment.trim()}
                                        className="px-6 py-3 bg-brand text-white rounded-xl font-bold hover:bg-brand/90 disabled:opacity-50 transition-all"
                                    >
                                        {submitting ? 'Posting...' : 'Post Comment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {discussion.locked && !isCoach && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
                            <span className="text-3xl mb-2 block">🔒</span>
                            <p className="text-yellow-800 dark:text-yellow-300 font-bold">
                                This discussion is locked
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                                Only coaches can add new comments
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
