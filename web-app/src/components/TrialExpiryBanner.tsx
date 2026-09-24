'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API_BASE, getSessionToken } from '@/lib/session';

interface TrialBannerProps {
    className?: string;
}

export function TrialExpiryBanner({ className = '' }: TrialBannerProps) {
    const params = useParams();
    const tenant = params?.tenant as string;
    const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const token = getSessionToken();
                if (!token) return;
                const res = await fetch(`${API_BASE}/api/v1/billing/status`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                // No point nudging clubs to pay before online payments are switched on
                if (data.success && data.data.paymentsEnabled) {
                    setTrialDaysRemaining(data.data.trialDaysRemaining);
                    setIsActive(data.data.subscriptionStatus === 'active' || data.data.comped);
                }
            } catch {
                // Silently fail
            }
        };
        checkStatus();
    }, []);

    // Don't show if dismissed, active subscriber, or more than 7 days left
    if (dismissed || isActive || trialDaysRemaining === null || trialDaysRemaining > 7) {
        return null;
    }

    const urgency = trialDaysRemaining <= 1 ? 'critical' : trialDaysRemaining <= 3 ? 'warning' : 'info';

    const bgColor = {
        critical: 'bg-red-600',
        warning: 'bg-amber-500',
        info: 'bg-blue-600',
    }[urgency];

    return (
        <div className={`${bgColor} text-white py-2 px-4 ${className}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-lg">
                        {urgency === 'critical' ? '⚠️' : urgency === 'warning' ? '⏰' : '🎁'}
                    </span>
                    <span className="font-medium">
                        {trialDaysRemaining === 0
                            ? 'Your trial ends today!'
                            : trialDaysRemaining === 1
                                ? 'Your trial ends tomorrow!'
                                : `${trialDaysRemaining} days left in your trial`}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`/${tenant}/admin/billing`}
                        className="bg-white text-gray-900 px-4 py-1.5 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
                    >
                        Choose a plan
                    </Link>
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-white/80 hover:text-white"
                        aria-label="Dismiss"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
