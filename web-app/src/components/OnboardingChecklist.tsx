'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientSDK } from '@/lib/sdk';
import { clubAppLink } from '@/lib/app-link';
import { Icon } from '@/components/ui/Icon';

interface CheckItem {
    id: 'players' | 'fixtures' | 'share';
    label: string;
    completed: boolean;
    link?: string;
    cta: string;
}

const sharedKey = (slug: string) => `app_link_shared_${slug}`;

/**
 * First-steps checklist on the club dashboard. Ticks come from the club's real
 * data (players, fixtures) and from copying the app link on this device.
 */
export default function OnboardingChecklist({ tenantSlug }: { tenantSlug: string }) {
    const [hasPlayers, setHasPlayers] = useState(false);
    const [hasFixtures, setHasFixtures] = useState(false);
    const [shared, setShared] = useState(false);
    const [copied, setCopied] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const appLink = clubAppLink(tenantSlug);

    useEffect(() => {
        try {
            if (localStorage.getItem(`checklist_dismissed_${tenantSlug}`)) setDismissed(true);
            setShared(!!localStorage.getItem(sharedKey(tenantSlug)));
        } catch {
            // Storage blocked: show the checklist
        }
        const sdk = createClientSDK(tenantSlug);
        sdk.getSquad().then((squad) => setHasPlayers(Array.isArray(squad) && squad.length > 0)).catch(() => undefined);
        sdk.listFixtures().then((fixtures) => setHasFixtures(Array.isArray(fixtures) && fixtures.length > 0)).catch(() => undefined);
    }, [tenantSlug]);

    const copyLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(appLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            window.prompt('Copy this link and send it to your players and parents:', appLink);
        }
        setShared(true);
        try {
            localStorage.setItem(sharedKey(tenantSlug), '1');
        } catch {
            // Storage blocked: tick for this visit only
        }
    }, [appLink, tenantSlug]);

    const dismiss = () => {
        try {
            localStorage.setItem(`checklist_dismissed_${tenantSlug}`, 'true');
        } catch {
            // Storage blocked: hidden for this visit only
        }
        setDismissed(true);
    };

    const items: CheckItem[] = [
        { id: 'players', label: 'Add your first player', completed: hasPlayers, link: `/${tenantSlug}/admin/squad`, cta: 'Add player' },
        { id: 'fixtures', label: 'Add a fixture', completed: hasFixtures, link: `/${tenantSlug}/admin/fixtures`, cta: 'Add fixture' },
        { id: 'share', label: 'Send the app link to your players and parents', completed: shared, cta: copied ? 'Copied!' : 'Copy app link' },
    ];

    if (dismissed || items.every((i) => i.completed)) return null;

    const progress = Math.round((items.filter((i) => i.completed).length / items.length) * 100);

    return (
        <section className="card mb-8 border-brand/40" aria-labelledby="get-started-title">
            <div className="flex justify-between items-start gap-3 mb-4">
                <div>
                    <p className="eyebrow mb-1">Get started</p>
                    <h2 id="get-started-title" className="text-2xl">Three quick steps to get your club going</h2>
                </div>
                <button type="button" onClick={dismiss} className="p-2 -mr-2 text-muted hover:text-foreground" aria-label="Hide these steps">
                    <Icon name="close" className="w-5 h-5" />
                </button>
            </div>

            <div className="w-full bg-surface-raised h-1.5 mb-5" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Steps done">
                <div className="bg-brand h-1.5 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>

            <ol className="space-y-2">
                {items.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface-raised border border-border chamfer-sm">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-7 h-7 hexagon flex items-center justify-center shrink-0 ${item.completed ? 'bg-brand text-brand-foreground' : 'bg-background text-muted'}`}>
                                {item.completed ? <Icon name="check" className="w-4 h-4" strokeWidth={2.5} /> : null}
                            </span>
                            <span className={`font-semibold ${item.completed ? 'text-muted line-through' : 'text-foreground'}`}>
                                {item.label}
                            </span>
                        </div>
                        {item.id === 'share' ? (
                            <button type="button" onClick={copyLink} className="btn btn-sm btn-outline">
                                <Icon name={copied ? 'check' : 'copy'} className="w-4 h-4" />
                                {item.cta}
                            </button>
                        ) : !item.completed && item.link ? (
                            <Link href={item.link} className="btn btn-sm btn-outline">
                                {item.cta}
                                <Icon name="arrowRight" className="w-4 h-4" />
                            </Link>
                        ) : null}
                    </li>
                ))}
            </ol>
        </section>
    );
}
