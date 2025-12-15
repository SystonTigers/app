'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface BillingStatus {
    plan: string;
    status: string;
    subscriptionStatus: string;
    billingTier: string;
    trialEndsAt: number | null;
    trialDaysRemaining: number;
    hasPaymentMethod: boolean;
    subscription: {
        status: string;
        currentPeriodEnd: number;
        cancelAtPeriodEnd: boolean;
    } | null;
}

const PLAN_FEATURES: Record<string, string[]> = {
    essentials: ['1 team', 'Squad management', 'Fixtures & results', 'Match reports', 'Team chat'],
    team: ['1 team', 'All Essentials features', 'Stats & leaderboards', 'Social media automation', 'Video highlights'],
    club: ['Up to 5 teams', 'All Team features', 'Shared club branding', 'Priority support'],
    club_pro: ['Unlimited teams', 'All Club features', 'AI Coaching assistant', 'Merchandise shop', 'Dedicated support'],
};

const PLAN_PRICES: Record<string, { monthly: number; annual: number; duesFee: string }> = {
    essentials: { monthly: 5.99, annual: 57.50, duesFee: '3.0% + 20p' },
    team: { monthly: 12.99, annual: 124.70, duesFee: '2.9% + 20p' },
    club: { monthly: 39.99, annual: 383.90, duesFee: '2.5% + 20p' },
    club_pro: { monthly: 79.99, annual: 767.90, duesFee: '2.0% + 18p' },
};

const PLAN_NAMES: Record<string, string> = {
    essentials: 'Essentials',
    team: 'Team',
    club: 'Club',
    club_pro: 'Club Pro',
};

export default function BillingPage() {
    const params = useParams();
    const tenant = params?.tenant as string;
    const [status, setStatus] = useState<BillingStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
    const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

    useEffect(() => {
        fetchBillingStatus();
    }, []);

    const fetchBillingStatus = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/billing/status`, {
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success) {
                setStatus(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch billing status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckout = async (plan: string) => {
        setCheckoutLoading(plan);
        try {
            const res = await fetch(`${API_BASE}/api/v1/billing/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    plan,
                    interval: billingInterval,
                    successUrl: `${window.location.origin}/${tenant}/admin/billing?success=true`,
                    cancelUrl: `${window.location.origin}/${tenant}/admin/billing?canceled=true`,
                }),
            });
            const data = await res.json();
            if (data.success && data.data.url) {
                window.location.href = data.data.url;
            } else {
                alert(data.error?.message || 'Failed to start checkout');
            }
        } catch (error) {
            console.error('Checkout error:', error);
        } finally {
            setCheckoutLoading(null);
        }
    };

    const handleManageSubscription = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/billing/portal`, {
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success && data.data.url) {
                window.location.href = data.data.url;
            }
        } catch (error) {
            console.error('Portal error:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
        );
    }

    const isTrialing = status?.subscriptionStatus === 'trialing';
    const isActive = status?.subscriptionStatus === 'active';
    const isPastDue = status?.subscriptionStatus === 'past_due';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Billing & Subscription
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    Manage your subscription and payment methods
                </p>

                {/* Current Status Banner */}
                <div className={`rounded-xl p-6 mb-8 ${isActive ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                    isPastDue ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                        'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    }`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {isActive ? '✅ Active Subscription' :
                                    isPastDue ? '⚠️ Payment Required' :
                                        `🎁 Trial - ${status?.trialDaysRemaining || 0} days left`}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Current plan: <span className="font-semibold capitalize">{status?.plan}</span>
                                {status?.billingTier === 'lifetime' && ' (Lifetime)'}
                            </p>
                        </div>
                        {isActive && (
                            <button
                                onClick={handleManageSubscription}
                                className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Manage Subscription
                            </button>
                        )}
                    </div>
                </div>

                {/* Billing Interval Toggle */}
                {!isActive && (
                    <div className="flex justify-center mb-8">
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-full p-1 flex">
                            <button
                                onClick={() => setBillingInterval('monthly')}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${billingInterval === 'monthly'
                                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                                    : 'text-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingInterval('annual')}
                                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${billingInterval === 'annual'
                                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                                    : 'text-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                Annual <span className="text-green-600 dark:text-green-400">(Save 20%)</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Pricing Cards */}
                {!isActive && (
                    <div className="grid md:grid-cols-4 gap-4 mb-8">
                        {(['essentials', 'team', 'club', 'club_pro'] as const).map((plan) => {
                            const isCurrentPlan = status?.plan === plan;
                            const price = billingInterval === 'monthly'
                                ? PLAN_PRICES[plan].monthly
                                : PLAN_PRICES[plan].annual;

                            return (
                                <div
                                    key={plan}
                                    className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden ${plan === 'club' ? 'ring-2 ring-blue-500' : ''
                                        }`}
                                >
                                    {plan === 'club' && (
                                        <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white text-center py-1 text-sm font-medium">
                                            Most Popular
                                        </div>
                                    )}
                                    <div className={`p-4 ${plan === 'club' ? 'pt-10' : ''}`}>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                            {PLAN_NAMES[plan]}
                                        </h3>
                                        <div className="mb-4">
                                            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                                £{price.toFixed(2)}
                                            </span>
                                            <span className="text-gray-500 dark:text-gray-400 text-sm">
                                                /{billingInterval === 'monthly' ? 'mo' : 'year'}
                                            </span>
                                        </div>
                                        <ul className="space-y-2 mb-4 text-sm">
                                            {PLAN_FEATURES[plan].map((feature) => (
                                                <li key={feature} className="flex items-center text-gray-600 dark:text-gray-300">
                                                    <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="text-xs text-gray-500 mb-3">Payment fees: {PLAN_PRICES[plan].duesFee}</p>
                                        <button
                                            onClick={() => handleCheckout(plan)}
                                            disabled={checkoutLoading !== null || isCurrentPlan}
                                            className={`w-full py-2.5 px-4 rounded-lg font-semibold transition-all text-sm ${isCurrentPlan
                                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                                                : plan === 'club'
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                                                }`}
                                        >
                                            {checkoutLoading === plan ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Loading...
                                                </span>
                                            ) : isCurrentPlan ? (
                                                'Current Plan'
                                            ) : (
                                                'Subscribe'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Payment Methods Info */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Secure payment powered by Stripe
                    </p>
                    <div className="flex items-center justify-center gap-4 opacity-60">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-8" />
                        <span className="text-2xl">💳</span>
                        <span className="font-semibold"> Apple Pay</span>
                        <span className="font-semibold">G Pay</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
