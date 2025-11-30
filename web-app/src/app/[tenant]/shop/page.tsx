'use client';

import { use } from 'react';
import { TeamShop } from '@/components/TeamShop';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function ShopPage({ params }: PageProps) {
    const { tenant } = use(params);

    return (
        <div className="container mx-auto h-[calc(100vh-200px)]">
            <TeamShop tenant={tenant} />
        </div>
    );
}
