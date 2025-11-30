'use client';

import { use } from 'react';
import { TeamChat } from '@/components/TeamChat';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function ChatPage({ params }: PageProps) {
    const { tenant } = use(params);

    return (
        <div className="container mx-auto h-[calc(100vh-200px)]">
            <TeamChat tenant={tenant} />
        </div>
    );
}
