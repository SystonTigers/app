'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientSDK } from '@/lib/sdk';

export default function ShopSuccessPage({ params }: { params: { tenant: string } }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const processedRef = useRef(false);

    useEffect(() => {
        if (!sessionId || !orderId || processedRef.current) return;

        const confirmOrder = async () => {
            processedRef.current = true;
            try {
                const sdk = createClientSDK(params.tenant);
                await sdk.confirmShopOrder(orderId, sessionId);
                setStatus('success');
                // Clear cart
                localStorage.removeItem(`cart_${params.tenant}`);
            } catch (err) {
                console.error(err);
                setStatus('error');
            }
        };

        confirmOrder();
    }, [sessionId, orderId, params.tenant]);

    if (!sessionId || !orderId) {
        return <div className="p-10 text-center">Invalid order details.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                {status === 'loading' && (
                    <div className="animate-pulse">
                        <div className="text-6xl mb-4">⚙️</div>
                        <h1 className="text-2xl font-bold mb-2">Finalizing Order...</h1>
                        <p className="text-gray-500">Please wait while we confirm your payment and start production.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="animate-bounce-in">
                        <div className="text-6xl mb-4">🎉</div>
                        <h1 className="text-2xl font-bold mb-2 text-green-600">Order Confirmed!</h1>
                        <p className="text-gray-500 mb-6">Your custom gear is being created. You will receive an email confirmation shortly.</p>
                        <button
                            onClick={() => router.push(`/${params.tenant}/shop`)}
                            className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition"
                        >
                            Back to Shop
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <div className="text-6xl mb-4">⚠️</div>
                        <h1 className="text-2xl font-bold mb-2 text-red-600">Something went wrong</h1>
                        <p className="text-gray-500 mb-6">We received your payment but couldn't finalize the order details. Please contact support.</p>
                        <p className="text-sm text-gray-400 mb-4">Order ID: {orderId}</p>
                        <button
                            onClick={() => router.push(`/${params.tenant}/shop`)}
                            className="text-blue-500 hover:underline"
                        >
                            Return to Shop
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
