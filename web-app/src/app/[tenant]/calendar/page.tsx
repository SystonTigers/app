'use client';

import { use } from 'react';
import { TeamCalendar } from '@/components/TeamCalendar';
import { MembersOnlyPage } from '@/components/ui/Page';

export default function CalendarPage({ params }: { params: Promise<{ tenant: string }> }) {
    const { tenant } = use(params);

    return (
        <MembersOnlyPage tenant={tenant} what="The club calendar and events" title="Calendar" subtitle="Club events, socials and fixtures.">
            <div className="container py-8 md:py-12">
                <TeamCalendar />
            </div>
        </MembersOnlyPage>
    );
}
