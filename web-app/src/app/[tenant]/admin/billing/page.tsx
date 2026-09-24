'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { API_BASE, errorMessage, getSessionToken } from '@/lib/session';

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

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

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
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent" />
            </div>
        );
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
            ? `Cancelled. You can use Boost Huddle until ${new Date(status.subscription.currentPeriodEnd * 1000).toLocaleDateString('en-GB')}.`
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

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-black uppercase italic text-gray-900 dark:text-white mb-6">Billing</h1>

            {search.get('success') && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-300 rounded-lg">
                    Thank you. Your payment went through; it can take a minute for your plan to show here.
                </div>
            )}
            {error && (
                <div role="alert" className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg">
                    {error}
                </div>
            )}

            <div className={`rounded-xl p-6 mb-8 border ${pastDue || (status?.trialEnded && status.paymentsEnabled) ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{headline}</h2>
                        <p className="text-gray-600 dark:text-gray-400">{detail}</p>
                    </div>
                    {status?.hasPaymentMethod && status.paymentsEnabled && (
                        <button onClick={manage} disabled={busy !== null}
                            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                            {busy === 'portal' ? 'Opening…' : 'Change card or cancel'}
                        </button>
                    )}
                </div>
            </div>

            {!paying && status && (
                <>
                    {!status.paymentsEnabled && (
                        <p className="mb-6 text-gray-600 dark:text-gray-400">
                            Online payments are being set up. Your free trial carries on in the meantime, so there's nothing you need to do yet.
                        </p>
                    )}
                    <div className="grid md:grid-cols-2 gap-6">
                        {status.plans.map((plan) => (
                            <div key={plan.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                                <p className="mt-2 mb-4">
                                    <span className="text-3xl font-black text-gray-900 dark:text-white">{pounds(plan.monthlyPence)}</span>
                                    <span className="text-gray-500"> / month</span>
                                </p>
                                <ul className="space-y-2 mb-6 text-sm text-gray-700 dark:text-gray-300 flex-1">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex gap-2">
                                            <span className="text-green-600" aria-hidden="true">✓</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => choosePlan(plan.id)} disabled={!plan.available || busy !== null}
                                    className="w-full py-3 rounded-lg font-bold bg-brand text-black hover:bg-gray-900 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
                                    {busy === plan.id ? 'Opening secure payment…' : plan.available ? `Choose ${plan.name}` : 'Coming soon'}
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="mt-6 text-center text-sm text-gray-500">Secure payment by Stripe. Cancel any time.</p>
                </>
            )}
        </div>
    );
}
