'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API_BASE, getSessionToken } from '@/lib/session';
import { Icon } from '@/components/ui/Icon';

interface TrialBannerProps {
    className?: string;
}

interface BillingSnapshot {
    trialDaysRemaining: number;
    trialEnded: boolean;
    paying: boolean;
    paymentsEnabled: boolean;
    pastDue: boolean;
}

/**
 * Club dashboard banner about the free trial and payments.
 * Nothing in the product is locked: this only tells owners where they stand.
 * - Last 7 days of trial (payments on): countdown with "Choose a plan".
 * - Trial ended, payments on: ask them to choose a plan.
 * - Trial ended, payments not switched on yet: reassure them nothing changes.
 * - Payment failed: ask them to update their card.
 * Dismissing hides it for this browser session only, so it comes back next visit.
 */
export function TrialExpiryBanner({ className = '' }: TrialBannerProps) {
    const params = useParams();
    const tenant = params?.tenant as string;
    const [billing, setBilling] = useState<BillingSnapshot | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const dismissKey = `trial_banner_dismissed_${tenant}`;

    useEffect(() => {
        try {
            if (sessionStorage.getItem(dismissKey)) setDismissed(true);
        } catch {
            // Storage blocked: show the banner
        }
        const token = getSessionToken();
        if (!token) return;
        fetch(`${API_BASE}/api/v1/billing/status`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => res.json())
            .then((data) => {
                if (!data?.success) return;
                const d = data.data;
                setBilling({
                    trialDaysRemaining: d.trialDaysRemaining ?? 0,
                    trialEnded: !!d.trialEnded,
                    paying: d.subscriptionStatus === 'active' || !!d.comped,
                    paymentsEnabled: !!d.paymentsEnabled,
                    pastDue: d.subscriptionStatus === 'past_due',
                });
            })
            .catch(() => undefined);
    }, [dismissKey]);

    if (!billing || dismissed || billing.paying) return null;

    let tone: 'info' | 'warning' | 'critical' = 'info';
    let message = '';
    let action: string | null = 'Choose a plan';

    if (billing.pastDue) {
        tone = 'critical';
        message = "Your last payment didn't go through. Please update your card.";
        action = 'Update card';
    } else if (billing.trialEnded && billing.paymentsEnabled) {
        tone = 'critical';
        message = 'Your free trial has ended. Choose a plan to keep your club app and website running.';
    } else if (billing.trialEnded) {
        message = "Your free trial has ended, but there's nothing to do yet: everything keeps working while we finish setting up payments.";
        action = null;
    } else if (billing.paymentsEnabled && billing.trialDaysRemaining <= 7) {
        tone = billing.trialDaysRemaining <= 1 ? 'critical' : billing.trialDaysRemaining <= 3 ? 'warning' : 'info';
        message = billing.trialDaysRemaining === 0
            ? 'Your free trial ends today.'
            : billing.trialDaysRemaining === 1
                ? 'Your free trial ends tomorrow.'
                : `${billing.trialDaysRemaining} days left in your free trial.`;
    } else {
        return null;
    }

    const toneStyle = {
        critical: 'bg-red-500/15 border-red-500/50 text-red-100',
        warning: 'bg-amber-500/15 border-amber-500/50 text-amber-100',
        info: 'bg-brand/10 border-brand/40 text-foreground',
    }[tone];

    const dismiss = () => {
        setDismissed(true);
        try {
            sessionStorage.setItem(dismissKey, '1');
        } catch {
            // Storage blocked: hidden until the page reloads
        }
    };

    return (
        <div className={`border-b ${toneStyle} ${className}`} role="status">
            <div className="container flex items-center justify-between gap-3 py-2.5 flex-wrap">
                <span className="flex items-center gap-2 text-sm font-semibold">
                    <Icon name={tone === 'info' ? 'info' : 'alert'} className="w-5 h-5" />
                    {message}
                </span>
                <div className="flex items-center gap-2">
                    {action && (
                        <Link href={`/${tenant}/admin/billing`} className="btn btn-sm btn-primary">
                            {action}
                        </Link>
                    )}
                    <button type="button" onClick={dismiss} className="p-2 opacity-80 hover:opacity-100" aria-label="Hide this message">
                        <Icon name="close" className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
