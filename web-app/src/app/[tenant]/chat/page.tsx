'use client';

import { use } from 'react';
import { TeamChat } from '@/components/TeamChat';
import { MembersOnlyPage } from '@/components/ui/Page';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function ChatPage({ params }: PageProps) {
    const { tenant } = use(params);

    return (
        <MembersOnlyPage tenant={tenant} what="Club chats" title="Chat" subtitle="Talk to your team, coaches and other parents.">
            <div className="container py-8 md:py-12">
                <TeamChat tenant={tenant} />
            </div>
        </MembersOnlyPage>
    );
}
