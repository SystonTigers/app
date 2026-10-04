'use client';

import { use } from 'react';
import { VideoEditor } from '@/components/VideoEditor';
import { MembersOnlyPage } from '@/components/ui/Page';
import { canAccessAdmin, useUserRole } from '@/hooks/useUserRole';

export default function VideosPage({ params }: { params: Promise<{ tenant: string }> }) {
    const { tenant } = use(params);
    const { role } = useUserRole();

    return (
        <MembersOnlyPage tenant={tenant} what="Match videos" title="Videos" subtitle="Match videos and their best moments.">
            {/* Staff upload and mark clips; everyone else watches */}
            <VideoEditor tenant={tenant} canEdit={canAccessAdmin(role)} />
        </MembersOnlyPage>
    );
}
