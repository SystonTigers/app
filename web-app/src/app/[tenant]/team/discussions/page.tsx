'use client';

import { use, useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDate } from '@/lib/format';
import { canAccessAdmin, useUserRole } from '@/hooks/useUserRole';
import { EmptyNote, MembersOnlyPage, PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';

interface Discussion {
    id: string;
    category: string;
    title: string;
    author_name: string;
    pinned: boolean;
    locked: boolean;
    created_at: number;
    updated_at: number;
    comment_count: number;
}

const CATEGORY_LABEL: Record<string, string> = {
    general: 'General',
    'match-analysis': 'Match chat',
    training: 'Training',
    tactics: 'Tactics',
};

/** Players and parents only see these two (the server enforces it too). */
const MEMBER_CATEGORIES = ['general', 'match-analysis'];
const STAFF_CATEGORIES = ['general', 'match-analysis', 'training', 'tactics'];

function DiscussionCard({ tenant, discussion }: { tenant: string; discussion: Discussion }) {
    return (
        <li>
            <Link href={`/${tenant}/team/discussions/${discussion.id}`} className="card block p-5 hover:border-brand/60 transition-colors group">
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
                        <span className="text-brand">{CATEGORY_LABEL[discussion.category] ?? discussion.category}</span>
                        {discussion.pinned && <span className="inline-flex items-center gap-1 text-muted"><Icon name="star" className="w-3.5 h-3.5" /> Pinned</span>}
                        {discussion.locked && <span className="inline-flex items-center gap-1 text-muted"><Icon name="lock" className="w-3.5 h-3.5" /> Closed</span>}
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                        <Icon name="chat" className="w-4 h-4" /><span className="sr-only">Replies:</span>{discussion.comment_count}
                    </span>
                </div>
                <h3 className="text-xl leading-tight mb-2 group-hover:text-brand transition-colors break-words">{discussion.title}</h3>
                <p className="flex flex-wrap justify-between gap-2 text-sm text-muted">
                    <span>Started by {discussion.author_name}</span>
                    <span>{formatDate(discussion.updated_at)}</span>
                </p>
            </Link>
        </li>
    );
}

function Discussions({ tenant }: { tenant: string }) {
    const router = useRouter();
    const { role } = useUserRole();
    const isStaff = canAccessAdmin(role);
    const isFan = role === 'fan';
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ category: 'general', title: '' });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const categories = isStaff ? STAFF_CATEGORIES : MEMBER_CATEGORIES;

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await apiFetch(`/api/v1/discussions${category ? `?category=${encodeURIComponent(category)}` : ''}`);
            if (!res.ok) {
                setError(await errorMessage(res, "We couldn't load Team talk. Please try again."));
                return;
            }
            const data = await res.json();
            setDiscussions(Array.isArray(data.data) ? data.data : []);
        } catch (err) {
            console.error('Failed to load discussions:', err);
            setError("We couldn't load Team talk. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, [category]);

    useEffect(() => {
        if (isFan) return;
        load();
    }, [load, isFan]);

    useEffect(() => {
        if (!creating) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCreating(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [creating]);

    async function create(e: FormEvent) {
        e.preventDefault();
        if (!form.title.trim()) return;
        setSubmitting(true);
        setFormError('');
        try {
            const res = await apiFetch('/api/v1/discussions', { method: 'POST', body: JSON.stringify({ category: form.category, title: form.title.trim() }) });
            if (!res.ok) {
                setFormError(await errorMessage(res, "That didn't start. Please try again."));
                return;
            }
            const data = await res.json();
            router.push(`/${tenant}/team/discussions/${data.data.id}`);
        } catch {
            setFormError("That didn't start. Check your connection and try again.");
        } finally {
            setSubmitting(false);
        }
    }

    const header = (
        <PageHeader
            eyebrow="Club"
            title="Team talk"
            subtitle={isStaff ? 'Talk tactics, training and matches with your coaches, players and parents.' : 'Chat about matches and club news with players, parents and coaches.'}
            actions={!isFan ? (
                <button type="button" onClick={() => { setFormError(''); setForm({ category: 'general', title: '' }); setCreating(true); }} className="btn btn-primary">
                    <Icon name="plus" className="w-5 h-5" /> Start a conversation
                </button>
            ) : undefined}
        />
    );

    if (isFan) {
        return (
            <>
                <PageHeader eyebrow="Club" title="Team talk" />
                <EmptyNote icon="lock" title="For players, parents and staff">
                    Team talk is where the club&apos;s players, parents and coaches chat. Supporters can follow results and news on the club page.
                </EmptyNote>
            </>
        );
    }

    return (
        <>
            {header}

            <div className="flex gap-2 overflow-x-auto scrollbar-none mb-6" role="tablist" aria-label="Topic">
                {[null, ...categories].map((c) => (
                    <button key={c ?? 'all'} type="button" role="tab" aria-selected={category === c} onClick={() => setCategory(c)} className={`btn btn-sm min-h-[40px] shrink-0 ${category === c ? 'btn-primary' : 'btn-secondary'}`}>
                        {c ? CATEGORY_LABEL[c] : 'All'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3" aria-busy="true" aria-label="Loading conversations">
                    {[1, 2, 3].map((i) => <div key={i} className="h-28 card animate-pulse" />)}
                </div>
            ) : error ? (
                <EmptyNote icon="alert" title="Team talk didn't load" action={<button type="button" onClick={load} className="btn btn-primary">Try again</button>}>
                    <p role="alert">{error}</p>
                </EmptyNote>
            ) : discussions.length === 0 ? (
                <EmptyNote icon="chat" title="No conversations yet">Start one with the button above: a match, a question for the coaches, or club news.</EmptyNote>
            ) : (
                <ul className="space-y-3">
                    {discussions.map((d) => <DiscussionCard key={d.id} tenant={tenant} discussion={d} />)}
                </ul>
            )}

            {creating && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Start a conversation">
                    <form onSubmit={create} className="card w-full max-w-md space-y-4">
                        <h2 className="text-2xl italic">Start a conversation</h2>
                        <div>
                            <label htmlFor="d-category" className="label">Topic</label>
                            <select id="d-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="field">
                                {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                            </select>
                            {isStaff && (form.category === 'training' || form.category === 'tactics') && (
                                <p className="text-xs text-muted mt-2">Only coaches and club staff see {CATEGORY_LABEL[form.category].toLowerCase()} conversations.</p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="d-title" className="label">What&apos;s it about?</label>
                            <input id="d-title" required maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Saturday's win at Oadby" className="field" />
                        </div>
                        {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setCreating(false)} className="btn btn-secondary flex-1">Cancel</button>
                            <button type="submit" disabled={submitting || !form.title.trim()} className="btn btn-primary flex-1">{submitting ? 'Starting…' : 'Start'}</button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
}

export default function DiscussionsPage({ params }: { params: Promise<{ tenant: string }> }) {
    const { tenant } = use(params);
    return (
        <MembersOnlyPage tenant={tenant} what="Team talk conversations" title="Team talk" subtitle="Chat about matches and club news.">
            <div className="container py-8 md:py-12">
                <Discussions tenant={tenant} />
            </div>
        </MembersOnlyPage>
    );
}
