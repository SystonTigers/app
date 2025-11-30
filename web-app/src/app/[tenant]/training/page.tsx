'use client';

import { use } from 'react';
import { TrainingTools } from '@/components/TrainingTools';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function TrainingPage({ params }: PageProps) {
    const { tenant } = use(params);

    return (
        <div className="container mx-auto h-[calc(100vh-200px)]">
            <TrainingTools tenant={tenant} />
        </div>
    );
}
