'use client';

import { use, useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { DiscussionVideoPlayer, getTimestampAtCurrentTime } from '@/components/DiscussionVideoPlayer';
import { MentionInput } from '@/components/MentionInput';
import { EmptyNote, MembersOnlyPage } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { API_BASE, apiFetch, errorMessage } from '@/lib/session';
import { formatDate, formatDateTime } from '@/lib/format';

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

/** What a discussion is about, in the few fields this page shows. */
interface Related {
    title: string;
    detail?: string;
    href: string;
    linkText: string;
}

const CATEGORY_LABEL: Record<string, string> = { general: 'General', 'match-analysis': 'Match chat', training: 'Training', tactics: 'Tactics' };

type Part = { type: 'text'; value: string } | { type: 'timestamp'; display: string; seconds: number };

/** Splits "[12:34]" and "[1:23:45]" video times out of a comment. */
function parseTimestamps(content: string): Part[] {
    const regex = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;
    const parts: Part[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) parts.push({ type: 'text', value: content.slice(lastIndex, match.index) });
        const a = parseInt(match[1], 10);
        const b = parseInt(match[2], 10);
        const seconds = match[3] ? a * 3600 + b * 60 + parseInt(match[3], 10) : a * 60 + b;
        parts.push({ type: 'timestamp', display: match[0], seconds });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) parts.push({ type: 'text', value: content.slice(lastIndex) });
    return parts;
}

function CommentText({ content }: { content: string }) {
    return (
        <>
            {parseTimestamps(content).map((part, i) =>
                part.type === 'timestamp' ? (
                    <button
                        key={i}
                        type="button"
                        onClick={() => window.__discussionVideoSeek?.(part.seconds)}
                        className="font-mono font-bold text-brand bg-brand/10 px-1 mx-0.5 text-xs align-middle hover:underline"
                        aria-label={`Jump the video to ${part.display.slice(1, -1)}`}
                    >
                        {part.display}
                    </button>
                ) : (
                    <span key={i}>{part.value}</span>
                ),
            )}
        </>
    );
}

function CommentThread({ comment, onReply, canReply }: { comment: Comment; onReply: (c: Comment) => void; canReply: boolean }) {
    return (
        <li className="flex gap-3">
            <span className="w-10 h-10 shrink-0 hexagon bg-brand/15 text-brand flex items-center justify-center font-display font-bold" aria-hidden="true">
                {comment.author_name?.[0]?.toUpperCase() ?? '?'}
            </span>
            <div className="flex-1 min-w-0">
                <div className="bg-surface-raised border border-border chamfer-sm p-4">
                    <p className="flex flex-wrap items-center justify-between gap-x-3 mb-1">
                        <span className="font-bold">{comment.author_name}</span>
                        <span className="text-xs text-muted">{formatDateTime(comment.created_at)}</span>
                    </p>
                    <p className="whitespace-pre-wrap break-words"><CommentText content={comment.content} /></p>
                </div>
                {canReply && (
                    <button type="button" onClick={() => onReply(comment)} className="btn btn-ghost btn-sm min-h-[40px] -ml-4">
                        Reply
                    </button>
                )}
                {comment.replies && comment.replies.length > 0 && (
                    <ul className="mt-3 space-y-4 border-l-2 border-border pl-3 sm:pl-4">
                        {comment.replies.map((r) => <CommentThread key={r.id} comment={r} onReply={onReply} canReply={canReply} />)}
                    </ul>
                )}
            </div>
        </li>
    );
}

function DiscussionDetail({ tenant, discussionId }: { tenant: string; discussionId: string }) {
    const [discussion, setDiscussion] = useState<Discussion | null>(null);
    const [related, setRelated] = useState<Related | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notFound, setNotFound] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const [mentions, setMentions] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [postError, setPostError] = useState('');

    const load = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError('');
        try {
            const res = await apiFetch(`/api/v1/discussions/${encodeURIComponent(discussionId)}`);
            if (res.status === 404) {
                setNotFound(true);
                return;
            }
            if (!res.ok) {
                setError(await errorMessage(res, "We couldn't load this conversation. Please try again."));
                return;
            }
            const data = await res.json();
            setDiscussion({ ...data.data, comments: Array.isArray(data.data?.comments) ? data.data.comments : [] });
        } catch (err) {
            console.error('Failed to load discussion:', err);
            setError("We couldn't load this conversation. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, [discussionId]);

    useEffect(() => {
        load();
    }, [load]);

    // What the conversation is about: a match, player, drill or training session
    useEffect(() => {
        const type = discussion?.related_entity_type;
        const id = discussion?.related_entity_id;
        if (!type || !id) return;
        let stopped = false;
        (async () => {
            try {
                let found: Related | null = null;
                if (type === 'match') {
                    const res = await apiFetch(`/public/${encodeURIComponent(tenant)}/fixtures/${encodeURIComponent(id)}`);
                    const m = res.ok ? (await res.json()).data : null;
                    if (m) {
                        const score = m.homeScore != null && m.awayScore != null ? ` ${m.homeScore}-${m.awayScore} ` : ' v ';
                        found = { title: `${m.homeTeam}${score}${m.awayTeam}`, detail: [formatDate(m.date), m.competition].filter(Boolean).join(' · '), href: `/${tenant}/results`, linkText: 'See results' };
                    }
                } else if (type === 'player') {
                    const res = await fetch(`${API_BASE}/public/${encodeURIComponent(tenant)}/squad`);
                    const list = res.ok ? (await res.json()).data : [];
                    const p = Array.isArray(list) ? list.find((x: { id: string }) => x.id === id) : null;
                    if (p) found = { title: p.name, detail: [p.position, p.number != null ? `#${p.number}` : ''].filter(Boolean).join(' · '), href: `/${tenant}/squad/${id}`, linkText: 'See player' };
                } else {
                    const res = await apiFetch(type === 'drill' ? '/api/v1/training/drills' : '/api/v1/training/sessions');
                    const list = res.ok ? (await res.json()).data : [];
                    const item = Array.isArray(list) ? list.find((x: { id: string }) => x.id === id) : null;
                    if (item) found = { title: item.name ?? item.focus ?? 'Training', detail: type === 'plan' && item.session_date ? formatDate(item.session_date) : item.category, href: `/${tenant}/training`, linkText: 'Open training' };
                }
                if (!stopped) setRelated(found);
            } catch (err) {
                console.error('Failed to load what the discussion is about:', err);
            }
        })();
        return () => { stopped = true; };
    }, [discussion?.related_entity_type, discussion?.related_entity_id, tenant]);

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (!newComment.trim()) return;
        setSubmitting(true);
        setPostError('');
        try {
            const res = await apiFetch(`/api/v1/discussions/${encodeURIComponent(discussionId)}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content: newComment, parent_comment_id: replyingTo?.id ?? null, mentions }),
            });
            if (!res.ok) {
                setPostError(await errorMessage(res, "Your comment didn't post. Please try again."));
                return;
            }
            setNewComment('');
            setMentions([]);
            setReplyingTo(null);
            await load(true);
        } catch {
            setPostError("Your comment didn't post. Check your connection and try again.");
        } finally {
            setSubmitting(false);
        }
    }

    function insertTimestamp() {
        const ts = getTimestampAtCurrentTime();
        if (ts) setNewComment((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${ts} `);
    }

    const back = (
        <Link href={`/${tenant}/team/discussions`} className="btn btn-ghost btn-sm min-h-[40px] -ml-4 mb-4">
            <Icon name="arrowLeft" className="w-4 h-4" /> Team talk
        </Link>
    );

    if (loading) {
        return (
            <div aria-busy="true" aria-label="Loading the conversation">
                {back}
                <div className="h-40 card animate-pulse mb-6" />
                <div className="h-64 card animate-pulse" />
            </div>
        );
    }

    if (notFound || (!discussion && !error)) {
        return (
            <>
                {back}
                <EmptyNote icon="chat" title="Conversation not found" action={<Link href={`/${tenant}/team/discussions`} className="btn btn-primary">Back to Team talk</Link>}>
                    It may have been removed, or it&apos;s only for coaches.
                </EmptyNote>
            </>
        );
    }

    if (error || !discussion) {
        return (
            <>
                {back}
                <EmptyNote icon="alert" title="This conversation didn't load" action={<button type="button" onClick={() => load()} className="btn btn-primary">Try again</button>}>
                    <p role="alert">{error}</p>
                </EmptyNote>
            </>
        );
    }

    // Only show the player when the discussion links to a playable video URL or path
    const videoUrl = discussion.video_id && (discussion.video_id.startsWith('http') || discussion.video_id.startsWith('/')) ? discussion.video_id : null;

    return (
        <>
            {back}

            {videoUrl && (
                <div className="mb-6">
                    <DiscussionVideoPlayer videoUrl={videoUrl} videoId={discussion.video_id ?? ''} />
                </div>
            )}

            <header className="card mb-6">
                <p className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-wider mb-3">
                    <span className="text-brand">{CATEGORY_LABEL[discussion.category] ?? discussion.category}</span>
                    {discussion.pinned && <span className="inline-flex items-center gap-1 text-muted"><Icon name="star" className="w-3.5 h-3.5" /> Pinned</span>}
                    {discussion.locked && <span className="inline-flex items-center gap-1 text-muted"><Icon name="lock" className="w-3.5 h-3.5" /> Closed</span>}
                </p>
                <h1 className="page-title text-3xl md:text-4xl mb-3 break-words">{discussion.title}</h1>

                {related && (
                    <div className="mb-4 p-4 bg-surface-raised border border-border chamfer-sm">
                        <p className="font-display text-xl font-bold uppercase leading-tight">{related.title}</p>
                        {related.detail && <p className="text-sm text-muted mt-1">{related.detail}</p>}
                        <Link href={related.href} className="mt-2 inline-flex items-center gap-1 min-h-[40px] text-sm font-bold text-brand hover:underline">
                            {related.linkText} <Icon name="arrowRight" className="w-4 h-4" />
                        </Link>
                    </div>
                )}

                <p className="text-sm text-muted">Started by <span className="font-bold text-foreground">{discussion.author_name}</span> on {formatDate(discussion.created_at)}</p>
            </header>

            <section className="card mb-6" aria-labelledby="comments-title">
                <h2 id="comments-title" className="text-2xl italic mb-5">
                    Comments <span className="text-muted not-italic text-lg">{discussion.comments.length}</span>
                </h2>
                {discussion.comments.length > 0 ? (
                    <ul className="space-y-5">
                        {discussion.comments.map((c) => <CommentThread key={c.id} comment={c} onReply={setReplyingTo} canReply={!discussion.locked} />)}
                    </ul>
                ) : (
                    <p className="text-muted text-center py-8">No comments yet. Be the first to say something.</p>
                )}
            </section>

            {discussion.locked ? (
                <p className="card flex items-center gap-3 text-muted">
                    <Icon name="lock" className="w-5 h-5 text-brand" /> This conversation is closed, so no new comments can be added.
                </p>
            ) : (
                <form onSubmit={submit} className="card">
                    <label htmlFor="new-comment" className="text-xl font-display font-extrabold uppercase block mb-3">
                        {replyingTo ? `Reply to ${replyingTo.author_name}` : 'Add a comment'}
                    </label>
                    {replyingTo && (
                        <button type="button" onClick={() => setReplyingTo(null)} className="btn btn-ghost btn-sm min-h-[40px] -ml-4 mb-2">
                            <Icon name="close" className="w-4 h-4" /> Cancel reply
                        </button>
                    )}
                    <MentionInput
                        id="new-comment"
                        value={newComment}
                        onChange={setNewComment}
                        onMentionsChange={setMentions}
                        tenant={tenant}
                        placeholder={videoUrl ? 'Your thoughts. Type @ to mention someone, or [12:34] for a moment in the video.' : 'Your thoughts. Type @ to mention someone.'}
                        className="field min-h-[120px] resize-y"
                        disabled={submitting}
                    />
                    {postError && <p role="alert" className="text-sm text-red-400 mt-2">{postError}</p>}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                        {videoUrl ? (
                            <button type="button" onClick={insertTimestamp} className="btn btn-ghost btn-sm min-h-[40px] -ml-4">
                                <Icon name="video" className="w-4 h-4" /> Add the video time
                            </button>
                        ) : <span />}
                        <button type="submit" disabled={submitting || !newComment.trim()} className="btn btn-primary">
                            {submitting ? 'Posting…' : 'Post comment'}
                        </button>
                    </div>
                </form>
            )}
        </>
    );
}

export default function DiscussionDetailPage({ params }: { params: Promise<{ tenant: string; id: string }> }) {
    const { tenant, id } = use(params);
    return (
        <MembersOnlyPage tenant={tenant} what="Team talk conversations" title="Team talk">
            <div className="container py-8 md:py-12 max-w-4xl">
                <DiscussionDetail tenant={tenant} discussionId={id} />
            </div>
        </MembersOnlyPage>
    );
}
