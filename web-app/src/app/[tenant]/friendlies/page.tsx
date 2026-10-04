'use client';

import { use, useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatDate } from '@/lib/format';
import { canAccessAdmin, useUserRole } from '@/hooks/useUserRole';
import { EmptyNote, MembersOnlyPage, PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';

/** A club looking for a friendly (GET /api/v1/friendlies, /mine) */
interface FriendlyRequest {
    id: string;
    team_name: string;
    team_display_name?: string;
    location_pref: string;
    age_group: string | null;
    kit_colors: string | null;
    max_travel_miles: number | null;
    pitch_type: string | null;
    notes: string | null;
    badge_url?: string | null;
    pending_count?: number;
    status: string;
}

/** A match offered for one of those (GET /inbox, /sent) */
interface MatchRequest {
    id: string;
    requester_team_name: string;
    requester_display_name?: string;
    requester_badge_url?: string | null;
    host_team_name?: string;
    proposed_date: string | null;
    message: string | null;
    status: string;
}

type Tab = 'browse' | 'mine' | 'inbox' | 'sent';

const PATHS: Record<Tab, string> = { browse: '/api/v1/friendlies', mine: '/api/v1/friendlies/mine', inbox: '/api/v1/friendlies/inbox', sent: '/api/v1/friendlies/sent' };

const WHERE: Record<string, string> = { home: 'Home', away: 'Away', neutral: 'Neutral ground', any: 'Home or away' };
const PITCH: Record<string, string> = { grass: 'Grass', '3g': '3G', '4g': '4G' };
const AGE_GROUPS = ['U7', 'U8', 'U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U18', 'Adult'];
const blankForm = () => ({ age_group: '', location_pref: 'any', kit_colors: '', max_travel_miles: '30', pitch_type: 'any', notes: '' });

function Badge({ name, url }: { name: string; url?: string | null }) {
    return (
        <span className="w-12 h-12 shrink-0 hexagon bg-surface-raised flex items-center justify-center font-display text-xl font-extrabold text-brand overflow-hidden">
            {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="w-full h-full object-contain" />
            ) : (
                name.trim().charAt(0).toUpperCase() || '?'
            )}
        </span>
    );
}

function Tag({ children }: { children: ReactNode }) {
    return <span className="px-2 py-1 bg-surface-raised border border-border text-xs font-bold text-muted chamfer-sm">{children}</span>;
}

function StatusText({ status }: { status: string }) {
    const tone = status === 'accepted' || status === 'open' ? 'text-brand' : status === 'pending' ? 'text-yellow-400' : 'text-muted';
    const label: Record<string, string> = { open: 'Open', matched: 'Matched', pending: 'Waiting for a reply', accepted: 'Accepted', declined: 'Declined' };
    return <span className={`text-xs font-bold uppercase tracking-wider ${tone}`}>{label[status] ?? status}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label={title}>
            <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl italic mb-5">{title}</h2>
                {children}
            </div>
        </div>
    );
}

function Friendlies() {
    const { role } = useUserRole();
    const isStaff = canAccessAdmin(role);
    const [tab, setTab] = useState<Tab>('browse');
    const [requests, setRequests] = useState<FriendlyRequest[]>([]);
    const [mine, setMine] = useState<FriendlyRequest[]>([]);
    const [inbox, setInbox] = useState<MatchRequest[]>([]);
    const [sent, setSent] = useState<MatchRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [posting, setPosting] = useState<ReturnType<typeof blankForm> | null>(null);
    const [asking, setAsking] = useState<FriendlyRequest | null>(null);
    const [askForm, setAskForm] = useState({ date: '', message: '' });
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async (which: Tab) => {
        setLoading(true);
        setLoadError('');
        try {
            const res = await apiFetch(PATHS[which]);
            if (!res.ok) {
                setLoadError(await errorMessage(res, "We couldn't load friendlies. Please try again."));
                return;
            }
            const data = await res.json();
            const list = Array.isArray(data.data) ? data.data : [];
            if (which === 'browse') setRequests(list);
            else if (which === 'mine') setMine(list);
            else if (which === 'inbox') setInbox(list);
            else setSent(list);
        } catch (err) {
            console.error('Failed to load friendlies:', err);
            setLoadError("We couldn't load friendlies. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(tab);
    }, [tab, load]);

    const closePosting = useCallback(() => setPosting(null), []);
    const closeAsking = useCallback(() => setAsking(null), []);

    async function act(run: () => Promise<Response>, fallback: string, done: string, after?: Tab) {
        setError('');
        setNotice('');
        try {
            const res = await run();
            if (!res.ok) {
                setError(await errorMessage(res, fallback));
                return false;
            }
            setNotice(done);
            if (after && after !== tab) setTab(after);
            else await load(tab);
            return true;
        } catch {
            setError(`${fallback.replace(/ Please try again\.$/, '')} Check your connection and try again.`);
            return false;
        }
    }

    async function post(e: FormEvent) {
        e.preventDefault();
        if (!posting) return;
        setBusy(true);
        setFormError('');
        try {
            const res = await apiFetch('/api/v1/friendlies', {
                method: 'POST',
                body: JSON.stringify({
                    preferred_dates: [],
                    location_pref: posting.location_pref,
                    age_group: posting.age_group,
                    kit_colors: posting.kit_colors,
                    max_travel_miles: Number(posting.max_travel_miles) || null,
                    pitch_type: posting.pitch_type,
                    notes: posting.notes,
                }),
            });
            if (!res.ok) {
                setFormError(await errorMessage(res, "Your post didn't save. Please try again."));
                return;
            }
            setPosting(null);
            setNotice('Posted. Other clubs can now offer you a game.');
            if (tab === 'mine') await load('mine');
            else setTab('mine');
        } catch {
            setFormError("Your post didn't save. Check your connection and try again.");
        } finally {
            setBusy(false);
        }
    }

    async function ask(e: FormEvent) {
        e.preventDefault();
        if (!asking) return;
        setBusy(true);
        setFormError('');
        try {
            const res = await apiFetch(`/api/v1/friendlies/${asking.id}/request`, {
                method: 'POST',
                body: JSON.stringify({ proposed_date: askForm.date || null, message: askForm.message }),
            });
            if (!res.ok) {
                setFormError(await errorMessage(res, "Your offer didn't send. Please try again."));
                return;
            }
            setAsking(null);
            setNotice(`Offer sent to ${asking.team_display_name || asking.team_name}. You'll see their reply under Sent.`);
        } catch {
            setFormError("Your offer didn't send. Check your connection and try again.");
        } finally {
            setBusy(false);
        }
    }

    const respond = (id: string, action: 'accept' | 'decline') =>
        act(
            () => apiFetch(`/api/v1/friendlies/match/${id}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),
            "That reply didn't save. Please try again.",
            action === 'accept' ? 'Game on! The friendly has been added to both clubs’ fixtures.' : 'Offer declined.',
        );

    const remove = (id: string) => {
        if (!confirm('Take this post down?')) return;
        act(() => apiFetch(`/api/v1/friendlies/${id}`, { method: 'DELETE' }), "That post couldn't be removed. Please try again.", 'Post taken down.');
    };

    const pendingCount = inbox.filter((m) => m.status === 'pending').length;
    const tabs: Array<{ id: Tab; label: string }> = isStaff
        ? [{ id: 'browse', label: 'Find a game' }, { id: 'mine', label: 'Our posts' }, { id: 'inbox', label: 'Offers' }, { id: 'sent', label: 'Sent' }]
        : [];

    return (
        <>
            <PageHeader
                eyebrow="Matches"
                title="Friendlies"
                subtitle={isStaff ? 'Find clubs looking for a friendly, or post that you need a game.' : 'Clubs looking for a friendly. Club staff arrange games from here.'}
                actions={isStaff ? <button type="button" onClick={() => { setFormError(''); setPosting(blankForm()); }} className="btn btn-primary"><Icon name="plus" className="w-5 h-5" /> We need a game</button> : undefined}
            />

            {tabs.length > 0 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-none mb-6" role="tablist" aria-label="Friendlies">
                    {tabs.map((t) => (
                        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setNotice(''); setError(''); }} className={`btn btn-sm min-h-[40px] shrink-0 ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}>
                            {t.label}
                            {t.id === 'inbox' && pendingCount > 0 && <span className="px-1.5 bg-brand-foreground text-brand text-xs">{pendingCount}</span>}
                        </button>
                    ))}
                </div>
            )}

            {notice && <p className="card border-brand/40 py-3 mb-6 flex items-center gap-2" role="status"><Icon name="check" className="w-5 h-5 text-brand" />{notice}</p>}
            {error && <p className="card border-red-500/40 text-red-300 py-3 mb-6" role="alert">{error}</p>}

            {loading ? (
                <div className="space-y-3" aria-busy="true" aria-label="Loading friendlies">
                    {[1, 2, 3].map((i) => <div key={i} className="h-28 card animate-pulse" />)}
                </div>
            ) : loadError ? (
                <EmptyNote icon="alert" title="Friendlies didn't load" action={<button type="button" onClick={() => load(tab)} className="btn btn-primary">Try again</button>}>
                    <p role="alert">{loadError}</p>
                </EmptyNote>
            ) : tab === 'browse' ? (
                requests.length === 0 ? (
                    <EmptyNote icon="handshake" title="No clubs looking right now">
                        {isStaff ? 'Post that you need a game and other clubs can offer you one.' : 'Clubs looking for a friendly will show here.'}
                    </EmptyNote>
                ) : (
                    <ul className="space-y-3">
                        {requests.map((r) => {
                            const name = r.team_display_name || r.team_name;
                            return (
                                <li key={r.id} className="card p-4 md:p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <Badge name={name} url={r.badge_url} />
                                            <div className="min-w-0">
                                                <h3 className="text-xl leading-tight break-words">{name}</h3>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {r.age_group && <Tag>{r.age_group}</Tag>}
                                                    <Tag>{WHERE[r.location_pref] ?? r.location_pref}</Tag>
                                                    {r.max_travel_miles ? <Tag>Up to {r.max_travel_miles} miles</Tag> : null}
                                                    {r.pitch_type && PITCH[r.pitch_type] && <Tag>{PITCH[r.pitch_type]}</Tag>}
                                                    {r.kit_colors && <Tag>Kit: {r.kit_colors}</Tag>}
                                                </div>
                                            </div>
                                        </div>
                                        {isStaff && (
                                            <button type="button" onClick={() => { setFormError(''); setAskForm({ date: '', message: '' }); setAsking(r); }} className="btn btn-outline btn-sm min-h-[40px] self-start sm:self-center">
                                                Offer a game
                                            </button>
                                        )}
                                    </div>
                                    {r.notes && <p className="mt-3 text-sm text-muted whitespace-pre-line">{r.notes}</p>}
                                </li>
                            );
                        })}
                    </ul>
                )
            ) : tab === 'mine' ? (
                mine.length === 0 ? (
                    <EmptyNote icon="handshake" title="No posts yet">Tap &ldquo;We need a game&rdquo; to tell other clubs you&apos;re looking.</EmptyNote>
                ) : (
                    <ul className="space-y-3">
                        {mine.map((r) => (
                            <li key={r.id} className="card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <StatusText status={r.status} />
                                        {(r.pending_count ?? 0) > 0 && <span className="text-xs font-bold text-yellow-400">{r.pending_count} {r.pending_count === 1 ? 'offer' : 'offers'} waiting</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {r.age_group && <Tag>{r.age_group}</Tag>}
                                        <Tag>{WHERE[r.location_pref] ?? r.location_pref}</Tag>
                                    </div>
                                </div>
                                <button type="button" onClick={() => remove(r.id)} className="btn btn-danger btn-sm min-h-[40px] self-start">
                                    <Icon name="trash" className="w-4 h-4" /> Take down
                                </button>
                            </li>
                        ))}
                    </ul>
                )
            ) : tab === 'inbox' ? (
                inbox.length === 0 ? (
                    <EmptyNote icon="mail" title="No offers yet">When a club offers you a game, it shows here for you to accept or decline.</EmptyNote>
                ) : (
                    <ul className="space-y-3">
                        {inbox.map((m) => {
                            const name = m.requester_display_name || m.requester_team_name;
                            return (
                                <li key={m.id} className="card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <Badge name={name} url={m.requester_badge_url} />
                                        <div className="min-w-0">
                                            <h3 className="text-xl leading-tight break-words">{name}</h3>
                                            {m.proposed_date && <p className="text-sm text-muted inline-flex items-center gap-1.5 mt-1"><Icon name="calendar" className="w-4 h-4" />{formatDate(m.proposed_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                                            {m.message && <p className="text-sm mt-2 whitespace-pre-line">{m.message}</p>}
                                        </div>
                                    </div>
                                    {m.status === 'pending' ? (
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => respond(m.id, 'accept')} className="btn btn-primary btn-sm min-h-[40px]">Accept</button>
                                            <button type="button" onClick={() => respond(m.id, 'decline')} className="btn btn-secondary btn-sm min-h-[40px]">Decline</button>
                                        </div>
                                    ) : (
                                        <StatusText status={m.status} />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )
            ) : sent.length === 0 ? (
                <EmptyNote icon="mail" title="No offers sent">Offer a game to a club under &ldquo;Find a game&rdquo; and its reply shows here.</EmptyNote>
            ) : (
                <ul className="space-y-3">
                    {sent.map((m) => (
                        <li key={m.id} className="card p-4 md:p-5 flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="text-xl leading-tight break-words">To {m.host_team_name ?? 'another club'}</h3>
                                {m.proposed_date && <p className="text-sm text-muted mt-1">{formatDate(m.proposed_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                            </div>
                            <StatusText status={m.status} />
                        </li>
                    ))}
                </ul>
            )}

            {posting && (
                <Modal title="We need a game" onClose={closePosting}>
                    <form onSubmit={post} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="f-age" className="label">Age group</label>
                                <select id="f-age" required value={posting.age_group} onChange={(e) => setPosting({ ...posting, age_group: e.target.value })} className="field">
                                    <option value="">Choose</option>
                                    {AGE_GROUPS.map((a) => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="f-where" className="label">Where</label>
                                <select id="f-where" value={posting.location_pref} onChange={(e) => setPosting({ ...posting, location_pref: e.target.value })} className="field">
                                    {Object.entries(WHERE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="f-miles" className="label">Travel up to (miles)</label>
                                <input id="f-miles" type="number" min={1} max={500} value={posting.max_travel_miles} onChange={(e) => setPosting({ ...posting, max_travel_miles: e.target.value })} className="field" />
                            </div>
                            <div>
                                <label htmlFor="f-pitch" className="label">Pitch</label>
                                <select id="f-pitch" value={posting.pitch_type} onChange={(e) => setPosting({ ...posting, pitch_type: e.target.value })} className="field">
                                    <option value="any">Any</option>
                                    {Object.entries(PITCH).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="f-kit" className="label">Our kit colours (to avoid a clash)</label>
                            <input id="f-kit" value={posting.kit_colors} onChange={(e) => setPosting({ ...posting, kit_colors: e.target.value })} placeholder="e.g. Red and white" className="field" />
                        </div>
                        <div>
                            <label htmlFor="f-notes" className="label">Anything else</label>
                            <textarea id="f-notes" rows={3} value={posting.notes} onChange={(e) => setPosting({ ...posting, notes: e.target.value })} placeholder="Dates and times that suit you" className="field resize-none" />
                        </div>
                        {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={closePosting} className="btn btn-secondary flex-1">Cancel</button>
                            <button type="submit" disabled={busy} className="btn btn-primary flex-1">{busy ? 'Posting…' : 'Post'}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {asking && (
                <Modal title="Offer a game" onClose={closeAsking}>
                    <p className="text-muted mb-5">To <strong className="text-foreground">{asking.team_display_name || asking.team_name}</strong></p>
                    <form onSubmit={ask} className="space-y-4">
                        <div>
                            <label htmlFor="a-date" className="label">Date</label>
                            <input id="a-date" type="date" value={askForm.date} onChange={(e) => setAskForm({ ...askForm, date: e.target.value })} className="field" />
                        </div>
                        <div>
                            <label htmlFor="a-message" className="label">Message (optional)</label>
                            <textarea id="a-message" rows={3} value={askForm.message} onChange={(e) => setAskForm({ ...askForm, message: e.target.value })} placeholder="Say hello and suggest a kick-off time" className="field resize-none" />
                        </div>
                        {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={closeAsking} className="btn btn-secondary flex-1">Cancel</button>
                            <button type="submit" disabled={busy} className="btn btn-primary flex-1">{busy ? 'Sending…' : 'Send offer'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </>
    );
}

export default function FriendliesPage({ params }: { params: Promise<{ tenant: string }> }) {
    const { tenant } = use(params);
    return (
        <MembersOnlyPage tenant={tenant} what="Friendlies" title="Friendlies" subtitle="Clubs looking for a friendly.">
            <div className="container py-8 md:py-12">
                <Friendlies />
            </div>
        </MembersOnlyPage>
    );
}
