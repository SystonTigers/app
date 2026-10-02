'use client';

import { useRef, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/session';

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
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div>
                <h2 className="text-xl font-semibold">Add fixtures from a photo</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Upload a photo or screenshot of a fixture or fixture list (an FA email, Full-Time or a poster) and we&apos;ll read it for you. Nothing is added until you tick it, and the picture isn&apos;t kept.
                </p>
            </div>
            <p className="text-sm rounded p-3 bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                Works best with a clear, straight-on photo in good light, or a screenshot. Blurry, dark or angled pictures may be read wrongly, so always check the details before adding.
            </p>
            {error && <div role="alert" className="p-3 rounded text-sm bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200">{error}</div>}
            {done && <p role="status" className="text-sm font-semibold text-green-700 dark:text-green-400">{done}</p>}

            {!found.length && (
                <label className={`inline-block px-5 py-2 bg-brand text-white font-bold rounded cursor-pointer ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
                    {busy === 'reading' ? 'Reading the picture…' : 'Choose a photo or screenshot'}
                    <input ref={input} type="file" accept="image/jpeg,image/png,image/*" className="hidden" disabled={!!busy} onChange={(e) => read(e.target.files?.[0])} />
                </label>
            )}

            {found.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">We found {found.length} {found.length === 1 ? 'fixture' : 'fixtures'}. Check them and untick any you don&apos;t want.</p>
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {found.map((f, i) => (
                            <li key={`${f.date}-${f.home}-${f.away}-${i}`} className="py-2 space-y-1">
                                <label className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        className="mt-1"
                                        checked={!!(ticked[i] && f.us)}
                                        disabled={!f.us}
                                        onChange={() => setTicked((t) => t.map((v, j) => (j === i ? !v : v)))}
                                    />
                                    <span>
                                        <span className="font-medium">{f.home} v {f.away}</span>
                                        <span className="block text-xs text-gray-500">
                                            {when(f)}{f.venue ? ` · ${f.venue}` : ''}{f.competition ? ` · ${f.competition}` : ''}
                                            {f.status !== 'scheduled' && <span className="ml-2 font-bold uppercase text-amber-600">{f.status}</span>}
                                        </span>
                                    </span>
                                </label>
                                {!f.us && (
                                    <div className="flex flex-wrap items-center gap-2 ml-7 text-xs">
                                        <span className="text-gray-500">Which team are you?</span>
                                        <button type="button" onClick={() => chooseSide(i, 'home')} className="px-2 py-1 rounded-full border border-brand text-brand">{f.home}</button>
                                        <button type="button" onClick={() => chooseSide(i, 'away')} className="px-2 py-1 rounded-full border border-brand text-brand">{f.away}</button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                    <div className="flex flex-wrap justify-end gap-3">
                        <button type="button" onClick={() => setFound([])} disabled={!!busy} className="px-4 py-2 rounded border">Cancel</button>
                        <button type="button" onClick={add} disabled={!count || !!busy} className="px-5 py-2 bg-brand text-white font-bold rounded disabled:opacity-50">
                            {busy === 'adding' ? 'Adding…' : `Add ${count} ${count === 1 ? 'fixture' : 'fixtures'}`}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
