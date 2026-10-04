'use client';

import { use } from 'react';
import { VideoEditor } from '@/components/VideoEditor';
import { PageHeader } from '@/components/ui/Page';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function VideosAdminPage({ params }: PageProps) {
    const { tenant } = use(params);

    return (
        <div className="container py-8 md:py-10">
            <PageHeader eyebrow="Club admin" title="Match videos" subtitle="Upload match videos and mark the moments worth watching again." />
            <div className="card">
                <VideoEditor tenant={tenant} canEdit />
            </div>
        </div>
    );
}
