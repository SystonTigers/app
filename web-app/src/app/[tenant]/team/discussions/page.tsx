'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

function CategoryBadge({ category }: { category: string }) {
    const colors: Record<string, string> = {
        tactics: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        training: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        'match-analysis': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${colors[category] || colors.general}`}>
            {category.replace('-', ' ')}
        </span>
    );
}

function DiscussionCard({ discussion }: { discussion: Discussion }) {
    const router = useRouter();

    return (
        <div
            onClick={() => router.push(`discussions/${discussion.id}`)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <CategoryBadge category={discussion.category} />
                    {discussion.pinned && (
                        <span className="text-lg" title="Pinned">📌</span>
                    )}
                    {discussion.locked && (
                        <span className="text-lg" title="Locked">🔒</span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>💬</span>
                    <span>{discussion.comment_count}</span>
                </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-brand transition-colors">
                {discussion.title}
            </h3>

            <div className="flex items-center justify-between text-sm text-gray-500">
                <span>by {discussion.author_name}</span>
                <span>{new Date(discussion.updated_at).toLocaleDateString()}</span>
            </div>
        </div>
    );
}

export default function DiscussionsPage({ params }: { params: Promise<{ tenant: string }> }) {
    const [tenant, setTenant] = useState('');
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState<string | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const router = useRouter();

    useEffect(() => {
        params.then(p => setTenant(p.tenant));
    }, [params]);

    useEffect(() => {
        if (!tenant) return;
        loadDiscussions();
    }, [tenant, category]);

    async function loadDiscussions() {
        try {
            setLoading(true);
            const query = category ? `?category=${category}` : '';
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/discussions${query}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setDiscussions(data.data);
            }
        } catch (err) {
            console.error('Failed to load discussions:', err);
        } finally {
            setLoading(false);
        }
    }

    const categories = [
        { value: null, label: 'All' },
        { value: 'tactics', label: 'Tactics' },
        { value: 'training', label: 'Training' },
        { value: 'match-analysis', label: 'Match Analysis' },
        { value: 'general', label: 'General' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-12 px-6">
                <div className="container">
                    <div className="flex items-end justify-between">
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Team Discussions</h1>
                            <p className="text-gray-500">Talk tactics, training, and match analysis with the team.</p>
                        </div>
                        <button
                            onClick={() => setShowCreateDialog(true)}
                            className="px-6 py-3 bg-brand text-white rounded-xl font-bold hover:bg-brand/90 transition-colors"
                        >
                            + New Discussion
                        </button>
                    </div>
                </div>
            </div>

            <div className="container px-6 py-12">
                {/* Category Filters */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {categories.map((cat) => (
                        <button
                            key={cat.value || 'all'}
                            onClick={() => setCategory(cat.value)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${category === cat.value
                                    ? 'bg-brand text-white shadow-lg'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Discussions List */}
                {loading ? (
                    <div className="grid gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : discussions.length > 0 ? (
                    <div className="grid gap-4">
                        {discussions.map((discussion) => (
                            <DiscussionCard key={discussion.id} discussion={discussion} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="text-6xl mb-4">💬</div>
                        <h3 className="text-2xl font-bold mb-2">No Discussions Yet</h3>
                        <p className="text-gray-500 mb-6">Start a conversation about tactics, training, or match analysis.</p>
                        <button
                            onClick={() => setShowCreateDialog(true)}
                            className="px-6 py-3 bg-brand text-white rounded-xl font-bold hover:bg-brand/90 transition-colors"
                        >
                            Create First Discussion
                        </button>
                    </div>
                )}
            </div>

            {/* Create Discussion Dialog (Simple version - can be enhanced) */}
            {showCreateDialog && (
                <CreateDiscussionDialog
                    tenant={tenant}
                    onClose={() => setShowCreateDialog(false)}
                    onCreated={() => {
                        setShowCreateDialog(false);
                        loadDiscussions();
                    }}
                />
            )}
        </div>
    );
}

function CreateDiscussionDialog({ tenant, onClose, onCreated }: { tenant: string; onClose: () => void; onCreated: () => void }) {
    const [category, setCategory] = useState('general');
    const [title, setTitle] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/discussions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({ category, title })
            });

            if (res.ok) {
                onCreated();
            }
        } catch (err) {
            console.error('Failed to create discussion:', err);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-black mb-6">New Discussion</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                        >
                            <option value="general">General</option>
                            <option value="tactics">Tactics</option>
                            <option value="training">Training</option>
                            <option value="match-analysis">Match Analysis</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What do you want to discuss?"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-bold hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !title.trim()}
                            className="flex-1 px-4 py-2 bg-brand text-white rounded-lg font-bold hover:bg-brand/90 disabled:opacity-50"
                        >
                            {submitting ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
