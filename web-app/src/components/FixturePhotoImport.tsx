'use client';

import { useRef, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/session';
import { Icon } from '@/components/ui/Icon';
import { Notice, Pill } from '@/components/admin/AdminUi';

/** A fixture read from the picture (POST /api/v1/club/fixtures/from-image) */
interface PhotoFixture {
    date: string;
    time: string | null;
    home: string;
    away: string;
    venue: string | null;
    competition: string | null;
    status: 'scheduled' | 'postponed' | 'cancelled';
    us: 'home' | 'away' | null;
    opponent: string | null;
}

const MAX_SIDE = 1600;

/** Shrinks a picture to at most 1600px as a JPEG, so uploads stay small and quick. */
async function shrink(file: File): Promise<Blob> {
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        return blob ?? file;
    } catch {
        return file;
    }
}

function when(f: PhotoFixture): string {
    const d = new Date(`${f.date}T12:00:00Z`);
    const day = Number.isNaN(d.getTime()) ? f.date : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    return f.time ? `${day}, ${f.time}` : day;
}

/**
 * Upload a photo or screenshot of a fixture list (an FA email, Full-Time or a
 * poster); the fixtures are read for checking and only added once ticked.
 * The picture itself is never stored.
 */
export function FixturePhotoImport({ onAdded }: { onAdded: () => void }) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState<'reading' | 'adding' | null>(null);
    const [error, setError] = useState('');
    const [done, setDone] = useState('');
    const [found, setFound] = useState<PhotoFixture[]>([]);
    const [ticked, setTicked] = useState<boolean[]>([]);

    async function read(file: File | undefined) {
        if (!file) return;
        setError('');
        setDone('');
        setFound([]);
        setBusy('reading');
        try {
            const image = await shrink(file);
            const res = await apiFetch('/api/v1/club/fixtures/from-image', {
                method: 'POST',
                headers: { 'Content-Type': image.type || 'image/jpeg' },
                body: image,
            });
            if (!res.ok) {
                setError(await errorMessage(res, "We couldn't read that picture. Please try again."));
                return;
            }
            const list = ((await res.json())?.data?.fixtures ?? []) as PhotoFixture[];
            if (!list.length) {
                setError("We couldn't find a fixture in that picture. Try a clearer photo, or a screenshot of the fixture.");
                return;
            }
            setFound(list);
            setTicked(list.map((f) => f.us !== null && f.status !== 'cancelled'));
        } catch {
            setError("We couldn't read that picture. Check your connection and try again.");
        } finally {
            setBusy(null);
            if (input.current) input.current.value = '';
        }
    }

    function chooseSide(i: number, us: 'home' | 'away') {
        setFound((list) => list.map((f, j) => (j === i ? { ...f, us, opponent: us === 'home' ? f.away : f.home } : f)));
        setTicked((t) => t.map((v, j) => (j === i ? true : v)));
    }

    async function add() {
        const chosen = found.filter((f, i) => ticked[i] && f.us);
        if (!chosen.length) return;
        setBusy('adding');
        setError('');
        try {
            const res = await apiFetch('/api/v1/club/fixtures/from-image/apply', {
                method: 'POST',
                body: JSON.stringify({ fixtures: chosen }),
            });
            if (!res.ok) {
                setError(await errorMessage(res, "Those fixtures didn't save. Please try again."));
                return;
            }
            const { added = 0, updated = 0, unchanged = 0 } = (await res.json())?.data ?? {};
            const parts = [added ? `${added} added` : '', updated ? `${updated} updated` : '', unchanged ? `${unchanged} already there` : ''].filter(Boolean);
            setDone(parts.length ? `Fixtures from the photo: ${parts.join(', ')}.` : 'Those fixtures were already there.');
            setFound([]);
            onAdded();
        } catch {
            setError("Those fixtures didn't save. Check your connection and try again.");
        } finally {
            setBusy(null);
        }
    }

    const count = found.filter((f, i) => ticked[i] && f.us).length;

    return (
        <section className="card space-y-4" aria-labelledby="photo-import-title">
            <div>
                <h2 id="photo-import-title" className="text-2xl flex items-center gap-2">
                    <Icon name="image" className="w-5 h-5 text-brand" /> Add fixtures from a photo
                </h2>
                <p className="text-sm text-muted mt-1">
                    Upload a photo or screenshot of a fixture list (an FA email, Full-Time or a poster) and we&apos;ll read it for you. Nothing is added until you tick it, and the picture isn&apos;t kept.
                </p>
            </div>
            <p className="text-xs text-muted border-l-2 border-amber-500/60 pl-3">
                Works best with a clear, straight-on photo in good light, or a screenshot. Always check the details before adding.
            </p>
            {error && <Notice tone="error">{error}</Notice>}
            {done && <Notice tone="success">{done}</Notice>}

            {!found.length && (
                <label className={`btn btn-primary w-full sm:w-auto ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Icon name="upload" className="w-4 h-4" />
                    {busy === 'reading' ? 'Reading the picture…' : 'Choose a photo or screenshot'}
                    <input ref={input} type="file" accept="image/jpeg,image/png,image/*" className="sr-only" disabled={!!busy} onChange={(e) => read(e.target.files?.[0])} />
                </label>
            )}

            {found.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm text-muted">We found {found.length} {found.length === 1 ? 'fixture' : 'fixtures'}. Check them and untick any you don&apos;t want.</p>
                    <ul className="divide-y divide-border border-y border-border">
                        {found.map((f, i) => (
                            <li key={`${f.date}-${f.home}-${f.away}-${i}`} className="py-3 space-y-2">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-5 h-5 accent-[rgb(var(--brand-rgb))]"
                                        checked={!!(ticked[i] && f.us)}
                                        disabled={!f.us}
                                        onChange={() => setTicked((t) => t.map((v, j) => (j === i ? !v : v)))}
                                    />
                                    <span className="min-w-0">
                                        <span className="font-semibold">{f.home} v {f.away}</span>
                                        <span className="block text-xs text-muted">
                                            {when(f)}{f.venue ? ` · ${f.venue}` : ''}{f.competition ? ` · ${f.competition}` : ''}
                                        </span>
                                        {f.status !== 'scheduled' && <span className="inline-block mt-1"><Pill tone="warning">{f.status}</Pill></span>}
                                    </span>
                                </label>
                                {!f.us && (
                                    <div className="flex flex-wrap items-center gap-2 ml-8 text-sm">
                                        <span className="text-muted">Which team are you?</span>
                                        <button type="button" onClick={() => chooseSide(i, 'home')} className="btn btn-sm btn-outline">{f.home}</button>
                                        <button type="button" onClick={() => chooseSide(i, 'away')} className="btn btn-sm btn-outline">{f.away}</button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button type="button" onClick={() => setFound([])} disabled={!!busy} className="btn btn-ghost">Cancel</button>
                        <button type="button" onClick={add} disabled={!count || !!busy} className="btn btn-primary">
                            {busy === 'adding' ? 'Adding…' : `Add ${count} ${count === 1 ? 'fixture' : 'fixtures'}`}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
