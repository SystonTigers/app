'use client';

import { motion } from 'framer-motion';

export default function RevenuePage() {
    return (
        <div className="space-y-6 animate-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Revenue</h1>
                <p className="text-gray-500 mt-1">Track income and subscription metrics</p>
            </div>

            {/* Integration Banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 text-center border-dashed border-2 border-primary-500/30"
            >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                    </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Connect Stripe</h2>
                <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    Connect your Stripe account to view real-time revenue data,
                    manage subscriptions, and process refunds.
                </p>
                <button className="btn-primary">
                    Configure Stripe Integration
                </button>
            </motion.div>

            {/* Placeholder Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-6">
                    <div className="text-sm text-gray-500">Monthly Recurring Revenue</div>
                    <div className="text-3xl font-bold text-white mt-1">—</div>
                    <div className="text-sm text-gray-600 mt-1">Connect Stripe to view</div>
                </div>
                <div className="glass-card p-6">
                    <div className="text-sm text-gray-500">Annual Run Rate</div>
                    <div className="text-3xl font-bold text-white mt-1">—</div>
                    <div className="text-sm text-gray-600 mt-1">Connect Stripe to view</div>
                </div>
                <div className="glass-card p-6">
                    <div className="text-sm text-gray-500">Churn Rate</div>
                    <div className="text-3xl font-bold text-white mt-1">—</div>
                    <div className="text-sm text-gray-600 mt-1">Connect Stripe to view</div>
                </div>
            </div>
        </div>
    );
}
