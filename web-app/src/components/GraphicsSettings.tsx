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

/** A preview drawn by the server with the club's own name, colours, badge and sponsor. */
function Preview({ pack, sample, label, version }: { pack: string; sample: string; label: string; version: string }) {
    const [src, setSrc] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let url: string | null = null;
        let live = true;
        setSrc(null);
        setFailed(false);
        const token = getSessionToken();
        fetch(`${API_BASE}/api/v1/social/graphics/preview/${pack}/${sample}.jpg?v=${encodeURIComponent(version)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
            .then((blob) => {
                url = URL.createObjectURL(blob);
                if (live) setSrc(url);
            })
            .catch(() => live && setFailed(true));
        return () => {
            live = false;
            if (url) URL.revokeObjectURL(url);
        };
    }, [pack, sample, version]);
    return (
        <figure className="shrink-0 w-36">
            <div className="aspect-[4/5] rounded-md overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={`${label} graphic in this style`} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{failed ? 'No preview' : 'Drawing…'}</span>
                )}
            </div>
            <figcaption className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</figcaption>
        </figure>
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
    const [open, setOpen] = useState(graphics.pack);
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

    const card = 'bg-white dark:bg-gray-800 rounded-lg p-6 shadow';
    const heading = 'font-semibold text-lg text-gray-900 dark:text-white';
    const help = 'text-sm text-gray-500 dark:text-gray-400 mt-1';
    const lockedChoice = graphics.pack !== graphics.activePack;

    return (
        <section className={card} aria-labelledby="graphics-title">
            <h3 id="graphics-title" className={heading}>Graphics style</h3>
            <p className={help}>Every post gets a graphic in your club&apos;s colours with both teams&apos; badges. Previews use your own club details.</p>
            {lockedChoice && (
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">Your chosen premium style is locked, so posts use {graphics.packs.find((p) => p.id === graphics.activePack)?.name} for now.</p>
            )}
            <div className="mt-4 space-y-3">
                {graphics.packs.map((pack) => {
                    const current = graphics.pack === pack.id;
                    return (
                        <div key={pack.id} className={`rounded-lg border ${current ? 'border-brand' : 'border-gray-200 dark:border-gray-600'}`}>
                            <div className="flex flex-wrap items-center gap-3 p-4">
                                <div className="flex-1 min-w-[12rem]">
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                        {pack.name}
                                        {pack.premium && <span className="ml-2 text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Premium</span>}
                                        {current && <span className="ml-2 text-xs font-bold uppercase tracking-wide text-green-700 dark:text-green-400">In use</span>}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{pack.description}</p>
                                </div>
                                <button type="button" onClick={() => setOpen(open === pack.id ? '' : pack.id)} aria-expanded={open === pack.id}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-900 dark:text-white">
                                    {open === pack.id ? 'Hide examples' : 'See examples'}
                                </button>
                                {!current && (pack.unlocked ? (
                                    <button type="button" disabled={busy} onClick={() => onSave({ pack: pack.id }, `${pack.name} is now your graphics style.`)}
                                        className="px-3 py-2 bg-brand text-black rounded-lg text-sm font-bold disabled:opacity-50">
                                        Use this style
                                    </button>
                                ) : (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">One-off purchase. Contact Boost Huddle to unlock it for your club.</span>
                                ))}
                            </div>
                            {open === pack.id && (
                                <div className="flex gap-3 overflow-x-auto px-4 pb-4">
                                    {SAMPLES.map(([sample, label]) => <Preview key={sample} pack={pack.id} sample={sample} label={label} version={version} />)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <h4 className="mt-6 font-semibold text-gray-900 dark:text-white">Sponsor</h4>
            <p className={help}>Shown at the bottom of every graphic. A logo looks best; without one we show the sponsor&apos;s name.</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="flex-1 min-w-[14rem] text-sm text-gray-900 dark:text-white">
                    Sponsor&apos;s name
                    <input id="sponsor-name" type="text" maxLength={60} value={sponsor} onChange={(e) => setSponsor(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2" placeholder="e.g. Cherry Tree Nursery" />
                </label>
                <button type="button" disabled={busy || sponsor.trim() === (graphics.sponsorName ?? '')}
                    onClick={() => onSave({ sponsorName: sponsor.trim() || null }, sponsor.trim() ? 'Sponsor saved.' : 'Sponsor removed.')}
                    className="px-4 py-2 bg-brand text-black rounded-lg text-sm font-bold disabled:opacity-50">
                    Save sponsor
                </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
                {logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="Sponsor logo" className="h-12 max-w-[10rem] object-contain bg-white rounded p-1 border border-gray-200" />
                )}
                <label className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-900 dark:text-white cursor-pointer">
                    {uploading ? 'Uploading…' : logo ? 'Change logo' : 'Upload logo (PNG or JPG)'}
                    <input id="sponsor-logo" type="file" accept="image/png,image/jpeg" className="sr-only" disabled={uploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); e.target.value = ''; }} />
                </label>
                {logo && (
                    <button type="button" onClick={removeLogo} className="text-sm font-semibold text-red-600">Remove logo</button>
                )}
            </div>

            <h4 className="mt-6 font-semibold text-gray-900 dark:text-white">Opponents&apos; badges</h4>
            <p className={help}>
                Every team you play is listed on the Opponents page. Upload each badge once (PNG or JPG) and it&apos;s used on every graphic; until then we show their initials.
            </p>
            <a href={`/${params.tenant as string}/admin/opponents`} className="inline-block mt-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-900 dark:text-white">
                Manage opponents&apos; badges
            </a>
        </section>
    );
}
