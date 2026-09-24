'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientSDK } from '@/lib/sdk';
import { clubAppLink } from '@/lib/app-link';

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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Get started</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Three quick steps to get your club going.</p>
                </div>
                <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div className="bg-brand h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                {item.completed && (
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <span className={`font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                {item.label}
                            </span>
                        </div>
                        {item.id === 'share' ? (
                            <button onClick={copyLink} className="text-sm font-semibold text-brand hover:underline whitespace-nowrap">
                                {item.cta}
                            </button>
                        ) : !item.completed && item.link ? (
                            <Link href={item.link} className="text-sm font-semibold text-brand hover:underline whitespace-nowrap">
                                {item.cta} &rarr;
                            </Link>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
