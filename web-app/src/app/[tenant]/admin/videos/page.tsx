'use client';

import { use } from 'react';
import { VideoEditor } from '@/components/VideoEditor';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function VideosAdminPage({ params }: PageProps) {
    const { tenant } = use(params);

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Video Manager & AI Coach</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                Upload match videos, create highlight clips, and use AI to analyze for coaching opportunities
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <VideoEditor tenant={tenant} />
            </div>
        </div>
    );
}
