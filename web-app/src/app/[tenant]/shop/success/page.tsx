'use client';

import { Suspense, use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClientSDK } from '@/lib/sdk';
import { writeCartId } from '@/components/shop/types';
import { EmptyNote } from '@/components/ui/Page';

/** Stripe sends buyers here with the order and payment ids; we confirm the order once. */
function OrderConfirmation({ tenant }: { tenant: string }) {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const processedRef = useRef(false);

    useEffect(() => {
        if (!sessionId || !orderId || processedRef.current) return;
        processedRef.current = true;
        (async () => {
            try {
                await createClientSDK(tenant).confirmShopOrder(orderId, sessionId);
                writeCartId(tenant, null);
                setStatus('success');
            } catch (err) {
                console.error('Order confirmation failed', err);
                setStatus('error');
            }
        })();
    }, [sessionId, orderId, tenant]);

    const backToShop = <Link href={`/${tenant}/shop`} className="btn btn-primary">Back to the shop</Link>;

    if (!sessionId || !orderId) {
        return (
            <EmptyNote icon="bag" title="No order to show" action={backToShop}>
                This page is for orders coming back from payment. Your basket is still in the shop.
            </EmptyNote>
        );
    }

    if (status === 'loading') {
        return (
            <div aria-busy="true">
                <EmptyNote icon="refresh" title="Confirming your order">Just a moment while we check your payment.</EmptyNote>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <EmptyNote icon="alert" title="We couldn't confirm your order" action={backToShop}>
                <p role="alert">
                    Your payment may have gone through, but we couldn&apos;t finish the order. Please get in touch with the club and quote order {orderId}.
                </p>
            </EmptyNote>
        );
    }

    return (
        <EmptyNote icon="check" title="Order confirmed" action={backToShop}>
            Thanks for supporting the club. Your gear is being made and we&apos;ll email you a confirmation.
        </EmptyNote>
    );
}

export default function ShopSuccessPage({ params }: { params: Promise<{ tenant: string }> }) {
    const { tenant } = use(params);
    return (
        <div className="container py-12 max-w-2xl">
            <Suspense fallback={<div className="min-h-[40vh]" aria-busy="true" />}>
                <OrderConfirmation tenant={tenant} />
            </Suspense>
        </div>
    );
}
