'use client';

import { Suspense, use } from 'react';
import { TeamShop } from '@/components/TeamShop';
import { ClubExtraGate } from '@/components/ClubExtraGate';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function ShopPage({ params }: PageProps) {
    const { tenant } = use(params);

    return (
        <ClubExtraGate module="shop">
            <div className="container py-8 md:py-12">
                <Suspense fallback={<div className="min-h-[50vh]" aria-busy="true" />}>
                    <TeamShop tenant={tenant} />
                </Suspense>
            </div>
        </ClubExtraGate>
    );
}
