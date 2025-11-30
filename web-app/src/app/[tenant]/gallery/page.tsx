'use client';

import { use } from 'react';
import { PhotoGallery } from '@/components/PhotoGallery';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function GalleryPage({ params }: PageProps) {
    const { tenant } = use(params);

    return (
        <div className="container mx-auto h-[calc(100vh-200px)]">
            <PhotoGallery tenant={tenant} />
        </div>
    );
}
