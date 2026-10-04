'use client';

import { use } from 'react';
import { TrainingTools } from '@/components/TrainingTools';
import { MembersOnlyPage } from '@/components/ui/Page';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function TrainingPage({ params }: PageProps) {
    const { tenant } = use(params);

    return (
        <MembersOnlyPage tenant={tenant} what="Training plans, drills and tactics" title="Training" subtitle="Sessions, drills and how we play.">
            <div className="container py-8 md:py-12">
                <TrainingTools tenant={tenant} />
            </div>
        </MembersOnlyPage>
    );
}
