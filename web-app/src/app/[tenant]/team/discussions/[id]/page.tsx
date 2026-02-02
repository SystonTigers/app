'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DiscussionVideoPlayer, getTimestampAtCurrentTime } from '@/components/DiscussionVideoPlayer';
import { MentionInput } from '@/components/MentionInput';

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
    related_entity_type?: 'drill' | 'plan' | 'match' | 'player';
    related_entity_id?: string;
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
    }

    return parts;
}

function TimestampContent({ content }: { content: string }) {
    const parts = parseTimestamps(content);

    const handleClick = (seconds: number) => {
        // This calls the global function exposed by DiscussionVideoPlayer
        const seek = (window as any).__discussionVideoSeek;
        if (seek) {
            seek(seconds);
        } else {
            console.warn('Video player not ready');
        }
    };

    return (
        <>
            {parts.map((part, i) =>
                part.type === 'timestamp' ? (
                    <button
                        key={i}
                        onClick={() => handleClick(part.seconds!)}
                        className="text-brand font-mono font-bold hover:underline mx-1 cursor-pointer bg-brand/10 px-1 chamfer-sm text-xs align-middle"
                    >
                        {part.display}
                    </button>
                ) : (
                    <span key={i}>{part.value}</span>
                )
            )}
        </>
    );
}

function CommentThread({
    comment,
    onReply,
    isCoach
}: {
    comment: Comment;
    onReply: (parentId: string) => void;
    isCoach: boolean;
}) {
    return (
        <div className="flex gap-3">
            <div className="w-10 h-10 chamfer-sm bg-gradient-to-br from-brand to-brand/60 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {comment.author_name[0]}
            </div>

            <div className="flex-1">
                <div className="bg-gray-50 dark:bg-gray-900 chamfer-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900 dark:text-white">{comment.author_name}</span>
                        <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
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
        <span className={`px-3 py-1 chamfer-sm text-sm font-bold uppercase ${colors[category] || colors.general}`}>
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
    const [mentions, setMentions] = useState<string[]>([]);

    const [relatedEntity, setRelatedEntity] = useState<any>(null);

    // Hardcoded video URL for demo/phase 2 if no video_id is present.
    // In production, video_id would potentially be resolved to a URL.

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

    useEffect(() => {
        if (discussion?.related_entity_id && discussion?.related_entity_type) {
            loadRelatedEntity();
        }
    }, [discussion]);

    async function loadRelatedEntity() {
        if (!discussion?.related_entity_id || !discussion?.related_entity_type) return;

        try {
            const token = localStorage.getItem('token') || '';
            const headers = { 'Authorization': `Bearer ${token}` };
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE || '';

            if (discussion.related_entity_type === 'drill') {
                const res = await fetch(`${baseUrl}/api/v1/training/drills`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.data)) {
                        const found = data.data.find((d: any) => d.id === discussion.related_entity_id);
                        if (found) setRelatedEntity(found);
                    }
                }
            } else if (discussion.related_entity_type === 'plan') {
                const res = await fetch(`${baseUrl}/api/v1/training/sessions`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.data)) {
                        const found = data.data.find((s: any) => s.id === discussion.related_entity_id);
                        if (found) setRelatedEntity(found);
                    }
                }
            } else if (discussion.related_entity_type === 'match') {
                const res = await fetch(`${baseUrl}/public/${tenant}/fixtures/${discussion.related_entity_id}`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setRelatedEntity(data.data);
                    }
                }
            } else if (discussion.related_entity_type === 'player') {
                // Fetch player from squad endpoint
                const res = await fetch(`${baseUrl}/public/${tenant}/squad`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.data)) {
                        const found = data.data.find((p: any) => p.id === discussion.related_entity_id);
                        if (found) setRelatedEntity(found);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load related entity:', e);
        }
    }


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
                    parent_comment_id: replyingTo,
                    mentions: mentions
                })
            });

            if (res.ok) {
                setNewComment('');
                setMentions([]);
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

    const insertTimestamp = () => {
        const ts = getTimestampAtCurrentTime();
        if (ts) {
            setNewComment(prev => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' ' : '') + ts + ' ');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
                <div className="container px-6 py-12">
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 chamfer-sm animate-pulse mb-8"></div>
                    <div className="h-64 bg-gray-200 dark:bg-gray-700 chamfer-sm animate-pulse"></div>
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

    // Use a dummy video URL for testing/demo if none provided
    // If discussion.video_id looks like a URL, use it. Otherwise use fallback.
    const hasVideo = discussion.category === 'match-analysis' || !!discussion.video_id;
    let videoUrl = "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"; // Fallback/Demo
    if (discussion.video_id && (discussion.video_id.startsWith('http') || discussion.video_id.startsWith('/'))) {
        videoUrl = discussion.video_id;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
            {/* Back Button */}
            <div className="border-b border-gray-200 dark:border-gray-800 py-4 px-6 bg-white dark:bg-gray-900 sticky top-0 z-50 shadow-sm">
                <div className="container flex justify-between items-center">
                    <Link
                        href={`/${tenant}/team/discussions`}
                        className="text-gray-600 dark:text-gray-400 hover:text-brand transition-colors inline-flex items-center gap-2"
                    >
                        ← Back to discussions
                    </Link>
                </div>
            </div>

            <div className="container px-6 py-8">
                {/* Video Player Section */}
                {hasVideo && (
                    <div className="mb-8 sticky top-20 z-40">
                        <DiscussionVideoPlayer
                            videoUrl={videoUrl}
                            videoId={discussion.video_id || 'demo'}
                        />
                    </div>
                )}

                {/* Discussion Header */}
                <div className="bg-white dark:bg-gray-800 chamfer-lg shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8">
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
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 chamfer-sm text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {discussion.pinned ? 'Unpin' : 'Pin'}
                                </button>
                                <button
                                    onClick={toggleLock}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 chamfer-sm text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {discussion.locked ? 'Unlock' : 'Lock'}
                                </button>
                            </div>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">
                        {discussion.title}
                    </h1>

                    {relatedEntity && (
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 chamfer-sm border border-gray-100 dark:border-gray-600/50">
                            <div className="text-xs font-bold uppercase text-gray-400 mb-1">
                                Related {discussion.related_entity_type}
                            </div>

                            {discussion.related_entity_type === 'match' ? (
                                <div>
                                    <div className="font-black text-xl text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-1">
                                        <span>⚽ {relatedEntity.homeTeam} {relatedEntity.homeScore}-{relatedEntity.awayScore} {relatedEntity.awayTeam}</span>
                                    </div>
                                    <div className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                        {new Date(relatedEntity.date).toLocaleDateString()} • {relatedEntity.competition}
                                    </div>
                                </div>
                            ) : discussion.related_entity_type === 'player' ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 chamfer-sm bg-gradient-to-br from-brand to-brand/60 flex items-center justify-center text-white font-black text-2xl shrink-0">
                                        {relatedEntity.number || relatedEntity.name?.[0] || '?'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-black text-xl text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            <span>👤 {relatedEntity.name}</span>
                                        </div>
                                        <div className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                            {relatedEntity.position || 'Player'}
                                            {relatedEntity.number && ` • #${relatedEntity.number}`}
                                        </div>
                                        {relatedEntity.stats && (
                                            <div className="flex gap-4 mt-2 text-xs">
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    <span className="font-bold text-gray-900 dark:text-white">{relatedEntity.stats.goals || 0}</span> Goals
                                                </span>
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    <span className="font-bold text-gray-900 dark:text-white">{relatedEntity.stats.assists || 0}</span> Assists
                                                </span>
                                                <span className="text-gray-600 dark:text-gray-400">
                                                    <span className="font-bold text-gray-900 dark:text-white">{relatedEntity.stats.appearances || 0}</span> Apps
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="font-bold text-lg text-brand flex items-center gap-2">
                                    {discussion.related_entity_type === 'drill' ? '🏃' : '📋'}
                                    {relatedEntity.title || relatedEntity.name || 'Unknown Entity'}
                                </div>
                            )}

                            {relatedEntity.description && discussion.related_entity_type !== 'match' && discussion.related_entity_type !== 'player' && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                                    {relatedEntity.description}
                                </p>
                            )}

                            {discussion.related_entity_type === 'match' && (
                                <Link
                                    href={`/${tenant}/results`}
                                    className="mt-3 inline-block text-xs font-bold text-brand hover:underline"
                                >
                                    View Full Result &rarr;
                                </Link>
                            )}

                            {discussion.related_entity_type === 'player' && (
                                <Link
                                    href={`/${tenant}/squad/${discussion.related_entity_id}`}
                                    className="mt-3 inline-block text-xs font-bold text-brand hover:underline"
                                >
                                    View Player Profile &rarr;
                                </Link>
                            )}

                            {(discussion.related_entity_type === 'drill' || discussion.related_entity_type === 'plan') && (
                                <Link
                                    href={`/${tenant}/training`}
                                    className="mt-2 inline-block text-xs font-bold text-brand hover:underline"
                                >
                                    View in Training Tools &rarr;
                                </Link>
                            )}
                        </div>
                    )}

                    <div className="text-sm text-gray-500">
                        Started by <span className="font-bold">{discussion.author_name}</span> on {new Date(discussion.created_at).toLocaleDateString()}
                    </div>
                </div>

                {/* Comments */}
                <div className="bg-white dark:bg-gray-800 chamfer-lg shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8">
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
                    <div className="bg-white dark:bg-gray-800 chamfer-lg shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                        <h3 className="text-xl font-black uppercase tracking-tight mb-4">
                            {replyingTo ? 'Add Reply' : 'Add Comment'}
                        </h3>

                        {replyingTo && (
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 chamfer-sm flex items-center justify-between">
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
                            <MentionInput
                                value={newComment}
                                onChange={setNewComment}
                                onMentionsChange={setMentions}
                                tenant={tenant}
                                placeholder="Share your thoughts... (Use [MM:SS] for timestamps, @ to mention)"
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 chamfer-sm bg-white dark:bg-gray-700 min-h-[120px] resize-y mb-2"
                                disabled={submitting}
                            />

                            {hasVideo && (
                                <button
                                    type="button"
                                    onClick={insertTimestamp}
                                    className="text-sm text-brand font-bold hover:underline mb-4 inline-flex items-center gap-1"
                                >
                                    ⏰ Insert Current Timestamp
                                </button>
                            )}

                            <div className="flex justify-end mt-4">
                                <button
                                    type="submit"
                                    disabled={submitting || !newComment.trim()}
                                    className="px-6 py-3 bg-brand text-white chamfer-sm font-bold hover:bg-brand/90 disabled:opacity-50 transition-all"
                                >
                                    {submitting ? 'Posting...' : 'Post Comment'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {discussion.locked && !isCoach && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 chamfer-sm p-6 text-center">
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
