'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { API_BASE, errorMessage, getSessionToken } from '@/lib/session';
import { formatDate, formatMoney } from '@/lib/format';
import { PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';
import { LoadingBlock, Notice } from '@/components/admin/AdminUi';

interface Plan {
    id: string;
    name: string;
    monthlyPence: number;
    features: string[];
    available: boolean;
}

interface BillingStatus {
    plan: string;
    subscriptionStatus: string;
    comped: boolean;
    trialDaysRemaining: number;
    trialEnded: boolean;
    paymentsEnabled: boolean;
    hasPaymentMethod: boolean;
    subscription: { status: string; currentPeriodEnd: number | null; cancelAtPeriodEnd: boolean } | null;
    plans: Plan[];
}

export default function BillingPage() {
    const params = useParams();
    const search = useSearchParams();
    const tenant = params?.tenant as string;
    const [status, setStatus] = useState<BillingStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState('');

    const authHeaders = (): Record<string, string> => {
        const token = getSessionToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const load = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/billing/status`, { headers: authHeaders() });
            if (!res.ok) {
                setError(await errorMessage(res, "We couldn't load your billing details."));
                return;
            }
            setStatus((await res.json()).data);
        } catch {
            setError("We couldn't reach the server. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const choosePlan = async (plan: string) => {
        setBusy(plan);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/v1/billing/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ plan, interval: 'monthly' }),
            });
            if (!res.ok) {
                setError(await errorMessage(res, "We couldn't start the payment. Please try again."));
                return;
            }
            window.location.href = (await res.json()).data.url;
        } catch {
            setError("We couldn't reach the server. Check your connection and try again.");
        } finally {
            setBusy(null);
        }
    };

    const manage = async () => {
        setBusy('portal');
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/v1/billing/portal`, { method: 'POST', headers: authHeaders() });
            if (!res.ok) {
                setError(await errorMessage(res, "We couldn't open billing. Please try again."));
                return;
            }
            window.location.href = (await res.json()).data.url;
        } catch {
            setError("We couldn't reach the server. Check your connection and try again.");
        } finally {
            setBusy(null);
        }
    };

    if (loading) {
        return <div className="container py-8 md:py-10 max-w-5xl"><LoadingBlock label="Loading billing" /></div>;
    }

    const paying = status?.subscriptionStatus === 'active' || status?.comped;
    const pastDue = status?.subscriptionStatus === 'past_due';

    let headline = '';
    let detail = '';
    if (status?.comped) {
        headline = 'Free account';
        detail = "Your club doesn't pay for Boost Huddle.";
    } else if (paying) {
        headline = `${status?.plans.find((p) => p.id === status.plan)?.name ?? 'Paid'} plan`;
        detail = status?.subscription?.cancelAtPeriodEnd && status.subscription.currentPeriodEnd
            ? `Cancelled. You can use Boost Huddle until ${formatDate(status.subscription.currentPeriodEnd * 1000)}.`
            : 'Thanks for supporting Boost Huddle.';
    } else if (pastDue) {
        headline = 'Payment needed';
        detail = 'Your last payment didn\'t go through. Update your card to keep your club running smoothly.';
    } else if (status?.trialEnded) {
        headline = 'Your free trial has ended';
        detail = status.paymentsEnabled
            ? 'Choose a plan to keep your club app and website running.'
            : "There's nothing to do yet: everything keeps working while we finish setting up payments.";
    } else {
        headline = `Free trial: ${status?.trialDaysRemaining ?? 0} day${status?.trialDaysRemaining === 1 ? '' : 's'} left`;
        detail = 'Choose a plan any time. You won\'t be charged until your trial ends.';
    }

    const urgent = pastDue || (status?.trialEnded && status.paymentsEnabled);

    return (
        <div className="container py-8 md:py-10 max-w-5xl">
            <PageHeader eyebrow="Club admin" title="Billing" subtitle="Your Boost Huddle plan and payments." />

            <div className="space-y-4 mb-6">
                {search.get('success') && <Notice tone="success">Thank you. Your payment went through; it can take a minute for your plan to show here.</Notice>}
                {error && (
                    <div className="space-y-3">
                        <Notice tone="error">{error}</Notice>
                        {!status && <button type="button" onClick={() => { setError(''); setLoading(true); load(); }} className="btn btn-secondary"><Icon name="refresh" className="w-4 h-4" /> Try again</button>}
                    </div>
                )}
            </div>

            {status && (
                <div className={`card mb-8 ${urgent ? 'border-red-500/50' : 'border-brand/40'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-start gap-4">
                            <span className={`w-12 h-12 hexagon flex items-center justify-center shrink-0 ${urgent ? 'bg-red-500/15 text-red-300' : 'bg-brand/15 text-brand'}`}>
                                <Icon name={urgent ? 'alert' : 'card'} className="w-6 h-6" />
                            </span>
                            <div>
                                <h2 className="text-3xl">{headline}</h2>
                                <p className="text-muted mt-1">{detail}</p>
                            </div>
                        </div>
                        {status.hasPaymentMethod && status.paymentsEnabled && (
                            <button type="button" onClick={manage} disabled={busy !== null} className="btn btn-secondary">
                                {busy === 'portal' ? 'Opening…' : 'Change card or cancel'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {!paying && status && (
                <>
                    {!status.paymentsEnabled && (
                        <p className="mb-6 text-muted">
                            Online payments are being set up. Your free trial carries on in the meantime, so there&apos;s nothing you need to do yet.
                        </p>
                    )}
                    <div className="grid md:grid-cols-2 gap-6">
                        {status.plans.map((plan) => (
                            <div key={plan.id} className="card flex flex-col">
                                <h3 className="text-3xl">{plan.name}</h3>
                                <p className="mt-2 mb-5">
                                    <span className="font-display text-5xl font-extrabold text-brand">{formatMoney(plan.monthlyPence)}</span>
                                    <span className="text-muted"> a month</span>
                                </p>
                                <ul className="space-y-2 mb-6 text-sm flex-1">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex gap-2">
                                            <Icon name="check" className="w-4 h-4 text-brand mt-0.5" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <button type="button" onClick={() => choosePlan(plan.id)} disabled={!plan.available || busy !== null} className="btn btn-primary w-full">
                                    {busy === plan.id ? 'Opening secure payment…' : plan.available ? `Choose ${plan.name}` : 'Coming soon'}
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="mt-6 text-center text-sm text-muted">Secure payment by Stripe. Cancel any time.</p>
                </>
            )}
        </div>
    );
}
