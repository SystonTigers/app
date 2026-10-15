'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE, errorMessage, getSessionToken } from '@/lib/session';

export interface GraphicsPack {
    id: string;
    name: string;
    description: string;
    premium: boolean;
    unlocked: boolean;
}

export interface GraphicsInfo {
    pack: string;
    activePack: string;
    packs: GraphicsPack[];
    sponsorName: string | null;
    sponsorLogoUrl: string | null;
}

const SAMPLES: Array<[string, string]> = [
    ['goal', 'Goal'],
    ['fulltime', 'Full time'],
    ['matchday', 'Match day'],
    ['lineup', 'Line-up'],
    ['fixtures', 'Fixtures'],
    ['table', 'League table'],
    ['countdown', 'Countdown'],
    ['motm', 'Man of the Match'],
];

// Previews load three at a time so a page of styles doesn't ask the server to draw them all at once,
// and are kept for the visit so the full-size view doesn't draw them again
const cache = new Map<string, string>();
let busy = 0;
const queue: Array<() => void> = [];
function take(): Promise<() => void> {
    return new Promise((resolve) => {
        const grant = () => {
            busy += 1;
            let given = false;
            resolve(() => { if (given) return; given = true; busy -= 1; queue.shift()?.(); });
        };
        if (busy < 3) grant(); else queue.push(grant);
    });
}

/** A graphic drawn by the server with the club's own name, colours, badge and sponsor. */
function usePreview(pack: string, sample: string, version: string) {
    const key = `${pack}/${sample}/${version}`;
    const [src, setSrc] = useState<string | null>(cache.get(key) ?? null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let live = true;
        setFailed(false);
        if (cache.has(key)) { setSrc(cache.get(key) ?? null); return; }
        setSrc(null);
        take().then((free) => {
            if (!live) { free(); return; }
            const token = getSessionToken();
            const load = () => fetch(`${API_BASE}/api/v1/social/graphics/preview/${pack}/${sample}.jpg?v=${encodeURIComponent(version)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
                .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))));
            // A busy server can drop one: try once more before giving up
            load().catch(() => new Promise<Blob>((resolve, reject) => setTimeout(() => load().then(resolve, reject), 1500)))
                .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    cache.set(key, url);
                    if (live) setSrc(url);
                })
                .catch(() => live && setFailed(true))
                .finally(free);
        });
        return () => { live = false; };
    }, [key, pack, sample, version]);
    return { src, failed };
}

function Preview({ pack, sample, label, version, onOpen, className = 'w-44' }: { pack: string; sample: string; label: string; version: string; onOpen?: () => void; className?: string }) {
    const { src, failed } = usePreview(pack, sample, version);
    const body = (
        <div className="aspect-[4/5] overflow-hidden bg-background border border-border flex items-center justify-center">
            {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={`${label} graphic in this style`} className="w-full h-full object-cover" />
            ) : (
                <span className="text-xs text-muted">{failed ? 'No preview' : 'Drawing…'}</span>
            )}
        </div>
    );
    return (
        <figure className={`shrink-0 ${className}`}>
            {onOpen ? (
                <button type="button" onClick={onOpen} className="block w-full hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" aria-label={`${label}: open it full size`}>
                    {body}
                </button>
            ) : body}
            <figcaption className="text-xs text-muted mt-1">{label}</figcaption>
        </figure>
    );
}

/** One style's graphics full size, one at a time. Escape or the backdrop closes it. */
function Viewer({ pack, index, version, onIndex, onClose, action }: {
    pack: GraphicsPack; index: number; version: string; onIndex: (i: number) => void; onClose: () => void; action: React.ReactNode;
}) {
    const [sample, label] = SAMPLES[index];
    const step = (by: number) => onIndex((index + by + SAMPLES.length) % SAMPLES.length);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') step(-1);
            if (e.key === 'ArrowRight') step(1);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    });
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`${pack.name} graphics`}>
            <button type="button" aria-label="Close" className="absolute inset-0 bg-black/80" onClick={onClose} />
            <div className="relative card w-full max-w-md max-h-full overflow-y-auto">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-2xl">{pack.name}</h4>
                    <button type="button" onClick={onClose} className="btn btn-sm btn-ghost" aria-label="Close">Close</button>
                </div>
                <Preview key={`${pack.id}-${sample}`} pack={pack.id} sample={sample} label={label} version={version} className="w-full" />
                <div className="flex items-center justify-between mt-2">
                    <button type="button" onClick={() => step(-1)} className="btn btn-sm btn-secondary" aria-label="Previous graphic">‹</button>
                    <span className="text-sm text-muted tabular-nums" aria-live="polite">{label} · {index + 1} of {SAMPLES.length}</span>
                    <button type="button" onClick={() => step(1)} className="btn btn-sm btn-secondary" aria-label="Next graphic">›</button>
                </div>
                <div className="mt-4 text-center">{action}</div>
            </div>
        </div>
    );
}

/**
 * Graphics style, sponsor and opponent badges for automatic posts. Styles are
 * previewed with the club's own details; premium styles are unlocked per club.
 */
export function GraphicsSettings({ graphics, busy, onSave, onMessage }: {
    graphics: GraphicsInfo;
    busy: boolean;
    onSave: (body: { pack?: string; sponsorName?: string | null }, done: string) => Promise<void>;
    onMessage: (text: string, error: boolean) => void;
}) {
    const params = useParams();
    const [sponsor, setSponsor] = useState(graphics.sponsorName ?? '');
    const [logo, setLogo] = useState(graphics.sponsorLogoUrl);
    const [uploading, setUploading] = useState(false);
    // The style and graphic open full size
    const [viewing, setViewing] = useState<{ pack: string; index: number } | null>(null);
    // Previews change when the sponsor changes
    const version = `${graphics.sponsorName ?? ''}|${logo ?? ''}`;

    const uploadLogo = async (file: File) => {
        if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 2 * 1024 * 1024) {
            onMessage('Please choose a PNG or JPG logo under 2 MB.', true);
            return;
        }
        setUploading(true);
        try {
            const token = getSessionToken();
            const res = await fetch(`${API_BASE}/api/v1/social/sponsor-logo`, {
                method: 'POST',
                headers: { 'Content-Type': file.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: await file.arrayBuffer(),
            });
            if (!res.ok) {
                onMessage(await errorMessage(res, "We couldn't upload that logo."), true);
                return;
            }
            setLogo((await res.json()).data.sponsorLogoUrl);
            onMessage('Sponsor logo saved. It appears on every graphic.', false);
        } catch {
            onMessage("We couldn't reach the server. Check your connection and try again.", true);
        } finally {
            setUploading(false);
        }
    };

    const removeLogo = async () => {
        const token = getSessionToken();
        const res = await fetch(`${API_BASE}/api/v1/social/sponsor-logo`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (res.ok) {
            setLogo(null);
            onMessage('Sponsor logo removed.', false);
        } else {
            onMessage(await errorMessage(res, "We couldn't remove the logo."), true);
        }
    };

    const card = 'card';
    const heading = 'text-2xl';
    const help = 'text-sm text-muted mt-1';
    const lockedChoice = graphics.pack !== graphics.activePack;
    const viewed = viewing ? graphics.packs.find((p) => p.id === viewing.pack) ?? null : null;

    /** Use this style / in use / why it can't be chosen: on each style and in the full-size view */
    const choice = (pack: GraphicsPack) => {
        if (graphics.pack === pack.id) return <span className="text-sm font-bold uppercase tracking-wide text-green-400">In use for your posts</span>;
        if (!pack.unlocked) return <span className="text-sm text-muted">Premium style. Contact Boost Huddle to unlock it for your club.</span>;
        return (
            <button type="button" disabled={busy} onClick={() => onSave({ pack: pack.id }, `${pack.name} is now your graphics style.`)} className="btn btn-primary">
                Use this style
            </button>
        );
    };

    return (
        <section className={card} aria-labelledby="graphics-title">
            <h3 id="graphics-title" className={heading}>Graphics style</h3>
            <p className={help}>Every post gets a graphic like these, with your badge, colours and sponsor. Click one to see it full size.</p>
            {lockedChoice && (
                <p className="mt-2 text-sm text-amber-300">Your chosen premium style is locked, so posts use {graphics.packs.find((p) => p.id === graphics.activePack)?.name} for now.</p>
            )}
            <div className="mt-4 space-y-3">
                {graphics.packs.map((pack) => {
                    const current = graphics.pack === pack.id;
                    return (
                        <div key={pack.id} className={`border chamfer-sm p-4 ${current ? 'border-brand border-2 bg-brand/5' : 'border-border bg-surface-raised'}`}>
                            <p className="font-display text-xl font-bold uppercase tracking-wide text-foreground">
                                {pack.name}
                                {pack.premium && <span className="ml-2 align-middle text-xs font-bold uppercase tracking-wide px-2 py-0.5 border border-amber-500/40 bg-amber-500/10 text-amber-300">Premium</span>}
                            </p>
                            <div className="mt-3 flex gap-3 overflow-x-auto pb-1" aria-label={`${pack.name} graphics`}>
                                {SAMPLES.map(([sample, label], index) => (
                                    <Preview key={sample} pack={pack.id} sample={sample} label={label} version={version} onOpen={() => setViewing({ pack: pack.id, index })} />
                                ))}
                            </div>
                            <div className="mt-3">{choice(pack)}</div>
                        </div>
                    );
                })}
            </div>
            {viewed && viewing && (
                <Viewer pack={viewed} index={viewing.index} version={version} onIndex={(index) => setViewing({ pack: viewed.id, index })} onClose={() => setViewing(null)} action={choice(viewed)} />
            )}

            <h4 className="mt-8 text-xl">Sponsor</h4>
            <p className={help}>Shown at the bottom of every graphic. A logo looks best; without one we show the sponsor&apos;s name.</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="flex-1 min-w-[14rem] label mb-0">
                    Sponsor&apos;s name
                    <input id="sponsor-name" type="text" maxLength={60} value={sponsor} onChange={(e) => setSponsor(e.target.value)}
                        className="field mt-2" placeholder="e.g. Cherry Tree Nursery" />
                </label>
                <button type="button" disabled={busy || sponsor.trim() === (graphics.sponsorName ?? '')}
                    onClick={() => onSave({ sponsorName: sponsor.trim() || null }, sponsor.trim() ? 'Sponsor saved.' : 'Sponsor removed.')}
                    className="btn btn-primary">
                    Save sponsor
                </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
                {logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="Sponsor logo" className="h-12 max-w-[10rem] object-contain bg-white p-1 border border-border" />
                )}
                <label className="btn btn-secondary">
                    {uploading ? 'Uploading…' : logo ? 'Change logo' : 'Upload logo (PNG or JPG)'}
                    <input id="sponsor-logo" type="file" accept="image/png,image/jpeg" className="sr-only" disabled={uploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); e.target.value = ''; }} />
                </label>
                {logo && (
                    <button type="button" onClick={removeLogo} className="btn btn-sm btn-danger">Remove logo</button>
                )}
            </div>

            <h4 className="mt-8 text-xl">Opponents&apos; badges</h4>
            <p className={help}>
                Every team you play is listed on the Opponents page. Upload each badge once (PNG or JPG) and it&apos;s used on every graphic; until then we show their initials.
            </p>
            <a href={`/${params.tenant as string}/admin/opponents`} className="btn btn-secondary mt-3">
                Manage opponents&apos; badges
            </a>
        </section>
    );
}
