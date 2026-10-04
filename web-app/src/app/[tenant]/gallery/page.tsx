'use client';

import { use } from 'react';
import { PhotoGallery } from '@/components/PhotoGallery';
import { MembersOnlyPage } from '@/components/ui/Page';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function GalleryPage({ params }: PageProps) {
    const { tenant } = use(params);

    return (
        <MembersOnlyPage tenant={tenant} what="Club photos" title="Gallery" subtitle="Photos from matches, training and days out.">
            <div className="container py-8 md:py-12">
                <PhotoGallery tenant={tenant} />
            </div>
        </MembersOnlyPage>
    );
}
