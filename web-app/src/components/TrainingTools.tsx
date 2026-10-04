'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/session';
import { formatLongDate } from '@/lib/format';
import { canAccessAdmin, useUserRole } from '@/hooks/useUserRole';
import { EmptyNote, PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';

/** As GET /api/v1/training/sessions returns it */
interface TrainingSession {
    id: string;
    session_date: string;
    session_time: string;
    team: string;
    focus: string;
    location?: string | null;
    status: string;
    attendance?: { present: number; marked: number };
}

/** As GET /api/v1/training/drills returns it */
interface Drill {
    id: string;
    name: string;
    category: string;
    duration: string;
    difficulty: string;
    description: string;
}

type Level = 'low' | 'medium' | 'high';

interface TacticsConfig {
    formation: string;
    playingStyle: string;
    pressingIntensity: Level;
    buildUpPlay: 'short' | 'mixed' | 'direct';
    defensiveLine: 'deep' | 'medium' | 'high';
    width: 'narrow' | 'normal' | 'wide';
    setPlayFocus: string[];
    phases?: {
        attacking?: { width?: string; tempo?: string };
        defensive?: { width?: string; aggression?: string };
    };
}

/** The server's drill categories (services/drills.ts) */
const DRILL_CATEGORIES = ['Warm-up', 'Passing', 'Shooting', 'Dribbling', 'Defending', 'Tactical', 'Fitness', 'Cool-down', 'Goalkeeping', 'Technical'];
const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-1-4-1', '3-4-2-1', '3-4-3', '4-1-2-1-2', '2-3-1', '3-2-1', '2-3-2-1', '3-3-2'];
const STYLES = ['Balanced', 'Possession', 'Counter-Attack', 'High Press', 'Direct Play'];

const DEFAULT_TACTICS: TacticsConfig = {
    formation: '4-4-2',
    playingStyle: 'Balanced',
    pressingIntensity: 'medium',
    buildUpPlay: 'mixed',
    defensiveLine: 'medium',
    width: 'normal',
    setPlayFocus: ['corners', 'free-kicks'],
    phases: { attacking: { width: 'wide', tempo: 'high' }, defensive: { width: 'narrow', aggression: 'medium' } },
};

const today = () => new Date().toISOString().slice(0, 10);
const blankSession = () => ({ date: today(), time: '18:30', team: '', location: '', focus: '' });
const blankDrill = () => ({ name: '', category: 'Passing', duration: '15', difficulty: 'intermediate', description: '' });

type View = 'sessions' | 'drills' | 'tactics';

interface TrainingToolsProps {
    tenant: string;
}

/** Choice buttons for one setting (radio-style). */
function Choice<T extends string>({ label, options, value, onChange, disabled }: { label: string; options: readonly T[]; value: T | undefined; onChange: (v: T) => void; disabled?: boolean }) {
    return (
        <fieldset>
            <legend className="label">{label}</legend>
            <div className="flex gap-2">
                {options.map((o) => (
                    <button
                        key={o}
                        type="button"
                        aria-pressed={value === o}
                        disabled={disabled}
                        onClick={() => onChange(o)}
                        className={`btn btn-sm flex-1 min-h-[40px] px-2 disabled:opacity-100 disabled:cursor-default ${value === o ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        {o}
                    </button>
                ))}
            </div>
        </fieldset>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label={title}>
            <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl italic mb-5">{title}</h2>
                {children}
            </div>
        </div>
    );
}

/** Training: sessions, the club's drills and the team's tactics. Staff plan and edit; members see the plan. */
export function TrainingTools({ tenant }: TrainingToolsProps) {
    const router = useRouter();
    const { role } = useUserRole();
    const isStaff = canAccessAdmin(role);
    const [view, setView] = useState<View>('sessions');
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [tactics, setTactics] = useState<TacticsConfig>(DEFAULT_TACTICS);
    const [tacticsSaved, setTacticsSaved] = useState(false);
    const [phase, setPhase] = useState<'attacking' | 'defensive'>('attacking');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [sessionForm, setSessionForm] = useState<ReturnType<typeof blankSession> | null>(null);
    const [drillForm, setDrillForm] = useState<ReturnType<typeof blankDrill> | null>(null);
    const [formError, setFormError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [sRes, dRes, tRes] = await Promise.all([
                apiFetch('/api/v1/training/sessions'),
                apiFetch('/api/v1/training/drills'),
                apiFetch('/api/v1/tactics'),
            ]);
            if (!sRes.ok) {
                setLoadError(await errorMessage(sRes, "We couldn't load training. Please try again."));
                return;
            }
            const s = await sRes.json();
            setSessions(Array.isArray(s.data) ? s.data : []);
            if (dRes.ok) {
                const d = await dRes.json();
                setDrills(Array.isArray(d.data) ? d.data : []);
            }
            if (tRes.ok) {
                const t = await tRes.json();
                if (t.data && typeof t.data === 'object') {
                    setTactics({ ...DEFAULT_TACTICS, ...t.data });
                    setTacticsSaved(true);
                }
            }
        } catch (err) {
            console.error('Failed to load training:', err);
            setLoadError("We couldn't load training. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load, tenant]);

    const closeSessionForm = useCallback(() => setSessionForm(null), []);
    const closeDrillForm = useCallback(() => setDrillForm(null), []);

    async function createSession(e: FormEvent) {
        e.preventDefault();
        if (!sessionForm) return;
        setBusy(true);
        setFormError('');
        try {
            const res = await apiFetch('/api/v1/training/sessions', {
                method: 'POST',
                body: JSON.stringify({
                    date: sessionForm.date,
                    time: sessionForm.time,
                    focus: sessionForm.focus,
                    ...(sessionForm.team.trim() ? { team: sessionForm.team } : {}),
                    ...(sessionForm.location.trim() ? { location: sessionForm.location } : {}),
                }),
            });
            if (!res.ok) {
                setFormError(await errorMessage(res, "That session didn't save. Please try again."));
                return;
            }
            setSessionForm(null);
            setNotice('Session planned.');
            await load();
        } catch {
            setFormError("That session didn't save. Check your connection and try again.");
        } finally {
            setBusy(false);
        }
    }

    async function createDrill(e: FormEvent) {
        e.preventDefault();
        if (!drillForm) return;
        setBusy(true);
        setFormError('');
        try {
            const res = await apiFetch('/api/v1/training/drills', {
                method: 'POST',
                body: JSON.stringify({
                    name: drillForm.name,
                    category: drillForm.category,
                    durationMinutes: Number(drillForm.duration),
                    difficulty: drillForm.difficulty,
                    description: drillForm.description,
                }),
            });
            if (!res.ok) {
                setFormError(await errorMessage(res, "That drill didn't save. Please try again."));
                return;
            }
            setDrillForm(null);
            setNotice('Drill added to the library.');
            await load();
        } catch {
            setFormError("That drill didn't save. Check your connection and try again.");
        } finally {
            setBusy(false);
        }
    }

    async function saveTactics() {
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const res = await apiFetch('/api/v1/tactics', { method: 'POST', body: JSON.stringify(tactics) });
            if (!res.ok) {
                setError(await errorMessage(res, "The tactics didn't save. Please try again."));
                return;
            }
            setTacticsSaved(true);
            setNotice('Tactics saved.');
        } catch {
            setError("The tactics didn't save. Check your connection and try again.");
        } finally {
            setBusy(false);
        }
    }

    async function discuss(type: 'drill' | 'plan', id: string, title: string) {
        setError('');
        try {
            const res = await apiFetch('/api/v1/discussions', {
                method: 'POST',
                body: JSON.stringify({ category: 'training', title: `Discussing: ${title}`, related_entity_type: type, related_entity_id: id }),
            });
            if (!res.ok) {
                setError(await errorMessage(res, "We couldn't start the chat. Please try again."));
                return;
            }
            const data = await res.json();
            router.push(`/${tenant}/team/discussions/${data.data.id}`);
        } catch {
            setError("We couldn't start the chat. Check your connection and try again.");
        }
    }

    const setPhaseValue = (key: 'width' | 'tempo' | 'aggression', value: string) =>
        setTactics({ ...tactics, phases: { ...tactics.phases, [phase]: { ...tactics.phases?.[phase], [key]: value } } });

    const tabs: Array<{ id: View; label: string }> = [
        { id: 'sessions', label: 'Sessions' },
        { id: 'drills', label: 'Drill library' },
        { id: 'tactics', label: 'Tactics' },
    ];

    const action = isStaff && view === 'sessions'
        ? <button type="button" onClick={() => { setFormError(''); setSessionForm(blankSession()); }} className="btn btn-primary"><Icon name="plus" className="w-5 h-5" /> Plan a session</button>
        : isStaff && view === 'drills'
            ? <button type="button" onClick={() => { setFormError(''); setDrillForm(blankDrill()); }} className="btn btn-primary"><Icon name="plus" className="w-5 h-5" /> Add a drill</button>
            : undefined;

    return (
        <div>
            <PageHeader eyebrow="Club" title="Training" subtitle={isStaff ? 'Plan sessions, build your drill library and set your tactics.' : "What's coming up at training, the drills we use and how we play."} actions={action} />

            <div className="flex gap-2 overflow-x-auto scrollbar-none mb-6" role="tablist" aria-label="Training">
                {tabs.map((t) => (
                    <button key={t.id} type="button" role="tab" aria-selected={view === t.id} onClick={() => { setView(t.id); setNotice(''); setError(''); }} className={`btn btn-sm min-h-[40px] shrink-0 ${view === t.id ? 'btn-primary' : 'btn-secondary'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {notice && <p className="card border-brand/40 py-3 mb-6 flex items-center gap-2" role="status"><Icon name="check" className="w-5 h-5 text-brand" />{notice}</p>}
            {error && <p className="card border-red-500/40 text-red-300 py-3 mb-6" role="alert">{error}</p>}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading training">
                    {[1, 2, 3].map((i) => <div key={i} className="h-36 card animate-pulse" />)}
                </div>
            ) : loadError ? (
                <EmptyNote icon="alert" title="Training didn't load" action={<button type="button" onClick={load} className="btn btn-primary">Try again</button>}>
                    <p role="alert">{loadError}</p>
                </EmptyNote>
            ) : view === 'sessions' ? (
                sessions.length === 0 ? (
                    <EmptyNote icon="clipboard" title="No sessions planned">
                        {isStaff ? 'Plan the next session with the button above, and everyone at the club will see it.' : 'Sessions show here once the coaches plan them.'}
                    </EmptyNote>
                ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sessions.map((s) => (
                            <li key={s.id} className="card flex flex-col">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-muted">{formatLongDate(s.session_date)}</p>
                                    <span className={`text-[11px] font-bold uppercase tracking-wider ${s.status === 'cancelled' ? 'text-red-400' : 'text-brand'}`}>
                                        {s.status === 'planned' ? 'Planned' : s.status}
                                    </span>
                                </div>
                                <h3 className="text-2xl leading-tight mb-1 break-words">{s.focus}</h3>
                                {s.session_time && <p className="font-display text-lg font-bold text-brand">{s.session_time}</p>}
                                <div className="mt-3 pt-3 border-t border-border text-sm text-muted flex flex-wrap gap-x-4 gap-y-1">
                                    {s.team && <span className="inline-flex items-center gap-1.5"><Icon name="users" className="w-4 h-4" />{s.team}</span>}
                                    {s.location && <span className="inline-flex items-center gap-1.5"><Icon name="flag" className="w-4 h-4" />{s.location}</span>}
                                    {isStaff && s.attendance && s.attendance.marked > 0 && (
                                        <span className="inline-flex items-center gap-1.5"><Icon name="check" className="w-4 h-4" />{s.attendance.present} came</span>
                                    )}
                                </div>
                                {isStaff && (
                                    <button type="button" onClick={() => discuss('plan', s.id, s.focus)} className="btn btn-ghost btn-sm min-h-[40px] mt-3 self-start -ml-4">
                                        <Icon name="chat" className="w-4 h-4" /> Discuss with coaches
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )
            ) : view === 'drills' ? (
                drills.length === 0 ? (
                    <EmptyNote icon="target" title="No club drills yet">
                        {isStaff ? "Add the drills your coaches use, so everyone runs them the same way. The app's Drill Library has plenty more to start from." : "The club's own drills show here once the coaches add them."}
                    </EmptyNote>
                ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {drills.map((d) => (
                            <li key={d.id} className="card flex flex-col">
                                <div className="flex justify-between items-start gap-3 mb-2 text-xs font-bold uppercase tracking-wider">
                                    <span className="text-brand">{d.category}</span>
                                    <span className="text-muted">{d.difficulty}</span>
                                </div>
                                <h3 className="text-xl leading-tight mb-2 break-words">{d.name}</h3>
                                <p className="text-sm text-muted mb-4 flex-1 line-clamp-4">{d.description}</p>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-bold text-muted inline-flex items-center gap-1.5"><Icon name="history" className="w-4 h-4" />{d.duration}</span>
                                    {isStaff && (
                                        <button type="button" onClick={() => discuss('drill', d.id, d.name)} className="btn btn-ghost btn-sm min-h-[40px]">
                                            <Icon name="chat" className="w-4 h-4" /> Discuss
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )
            ) : !isStaff && !tacticsSaved ? (
                <EmptyNote icon="clipboard" title="No tactics set yet">The coaches haven&apos;t set the team&apos;s shape yet.</EmptyNote>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section className="card">
                        <h2 className="text-2xl italic mb-4">Formation</h2>
                        {isStaff && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6" role="group" aria-label="Formation">
                                {FORMATIONS.map((f) => (
                                    <button key={f} type="button" aria-pressed={tactics.formation === f} onClick={() => setTactics({ ...tactics, formation: f })} className={`btn btn-sm min-h-[40px] px-2 ${tactics.formation === f ? 'btn-primary' : 'btn-secondary'}`}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="aspect-[3/4] max-h-[420px] mx-auto bg-surface-raised border border-border chamfer-lg relative hex-grid">
                            <div className="absolute inset-x-4 top-1/2 h-px bg-brand/30" />
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-brand/30" />
                            <div className="absolute left-1/4 right-1/4 bottom-4 h-14 border border-brand/30 border-b-0" />
                            <div className="absolute left-1/4 right-1/4 top-4 h-14 border border-brand/30 border-t-0" />
                            <p className="absolute inset-0 flex items-center justify-center font-display text-5xl font-extrabold text-brand">{tactics.formation}</p>
                        </div>
                    </section>

                    <section className="card space-y-5">
                        <h2 className="text-2xl italic">How we play</h2>
                        <div>
                            <label htmlFor="playing-style" className="label">Playing style</label>
                            <select id="playing-style" value={tactics.playingStyle} disabled={!isStaff} onChange={(e) => setTactics({ ...tactics, playingStyle: e.target.value })} className="field disabled:opacity-100">
                                {STYLES.map((s) => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <Choice label="Pressing" options={['low', 'medium', 'high'] as const} value={tactics.pressingIntensity} disabled={!isStaff} onChange={(v) => setTactics({ ...tactics, pressingIntensity: v })} />
                        <Choice label="Build-up play" options={['short', 'mixed', 'direct'] as const} value={tactics.buildUpPlay} disabled={!isStaff} onChange={(v) => setTactics({ ...tactics, buildUpPlay: v })} />
                        <Choice label="Defensive line" options={['deep', 'medium', 'high'] as const} value={tactics.defensiveLine} disabled={!isStaff} onChange={(v) => setTactics({ ...tactics, defensiveLine: v })} />
                    </section>

                    <section className="card lg:col-span-2">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                            <h2 className="text-2xl italic">In and out of possession</h2>
                            <div className="flex gap-2" role="tablist" aria-label="Phase">
                                {(['attacking', 'defensive'] as const).map((p) => (
                                    <button key={p} type="button" role="tab" aria-selected={phase === p} onClick={() => setPhase(p)} className={`btn btn-sm min-h-[40px] ${phase === p ? 'btn-primary' : 'btn-secondary'}`}>
                                        {p === 'attacking' ? 'With the ball' : 'Without the ball'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Choice label="Width" options={['narrow', 'normal', 'wide'] as const} value={tactics.phases?.[phase]?.width as 'narrow' | 'normal' | 'wide' | undefined} disabled={!isStaff} onChange={(v) => setPhaseValue('width', v)} />
                            {phase === 'attacking' ? (
                                <Choice label="Tempo" options={['low', 'medium', 'high'] as const} value={tactics.phases?.attacking?.tempo as Level | undefined} disabled={!isStaff} onChange={(v) => setPhaseValue('tempo', v)} />
                            ) : (
                                <Choice label="Aggression" options={['low', 'medium', 'high'] as const} value={tactics.phases?.defensive?.aggression as Level | undefined} disabled={!isStaff} onChange={(v) => setPhaseValue('aggression', v)} />
                            )}
                        </div>
                        {isStaff && (
                            <button type="button" onClick={saveTactics} disabled={busy} className="btn btn-primary mt-6 w-full sm:w-auto">
                                <Icon name="check" className="w-5 h-5" /> {busy ? 'Saving…' : 'Save tactics'}
                            </button>
                        )}
                    </section>
                </div>
            )}

            {sessionForm && (
                <Modal title="Plan a session" onClose={closeSessionForm}>
                    <form onSubmit={createSession} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="session-date" className="label">Date</label>
                                <input id="session-date" type="date" required value={sessionForm.date} onChange={(e) => setSessionForm({ ...sessionForm, date: e.target.value })} className="field" />
                            </div>
                            <div>
                                <label htmlFor="session-time" className="label">Time</label>
                                <input id="session-time" type="time" value={sessionForm.time} onChange={(e) => setSessionForm({ ...sessionForm, time: e.target.value })} className="field" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="session-focus" className="label">Focus</label>
                            <input id="session-focus" required maxLength={80} value={sessionForm.focus} onChange={(e) => setSessionForm({ ...sessionForm, focus: e.target.value })} placeholder="e.g. Passing and moving" className="field" />
                        </div>
                        <div>
                            <label htmlFor="session-team" className="label">Team (optional)</label>
                            <input id="session-team" maxLength={60} value={sessionForm.team} onChange={(e) => setSessionForm({ ...sessionForm, team: e.target.value })} placeholder="e.g. U12s" className="field" />
                        </div>
                        <div>
                            <label htmlFor="session-location" className="label">Where (optional)</label>
                            <input id="session-location" maxLength={120} value={sessionForm.location} onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })} placeholder="e.g. Back pitch" className="field" />
                        </div>
                        {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={closeSessionForm} className="btn btn-secondary flex-1">Cancel</button>
                            <button type="submit" disabled={busy} className="btn btn-primary flex-1">{busy ? 'Saving…' : 'Save session'}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {drillForm && (
                <Modal title="Add a drill" onClose={closeDrillForm}>
                    <form onSubmit={createDrill} className="space-y-4">
                        <div>
                            <label htmlFor="drill-name" className="label">Name</label>
                            <input id="drill-name" required maxLength={80} value={drillForm.name} onChange={(e) => setDrillForm({ ...drillForm, name: e.target.value })} placeholder="e.g. Triangle passing" className="field" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="drill-category" className="label">Type</label>
                                <select id="drill-category" value={drillForm.category} onChange={(e) => setDrillForm({ ...drillForm, category: e.target.value })} className="field">
                                    {DRILL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="drill-duration" className="label">Minutes</label>
                                <input id="drill-duration" type="number" min={1} max={180} required value={drillForm.duration} onChange={(e) => setDrillForm({ ...drillForm, duration: e.target.value })} className="field" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="drill-difficulty" className="label">Level</label>
                            <select id="drill-difficulty" value={drillForm.difficulty} onChange={(e) => setDrillForm({ ...drillForm, difficulty: e.target.value })} className="field">
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="drill-description" className="label">How it runs</label>
                            <textarea id="drill-description" required maxLength={600} rows={4} value={drillForm.description} onChange={(e) => setDrillForm({ ...drillForm, description: e.target.value })} placeholder="Set-up, what players do and what to look for" className="field" />
                        </div>
                        {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={closeDrillForm} className="btn btn-secondary flex-1">Cancel</button>
                            <button type="submit" disabled={busy} className="btn btn-primary flex-1">{busy ? 'Saving…' : 'Add drill'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}
