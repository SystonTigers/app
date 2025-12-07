'use client';

import { useState } from 'react';
import { SeasonTabs } from '@/components/SeasonTabs';

interface SeasonFilterWrapperProps {
    tenant: string;
    children: (seasonId: string | null) => React.ReactNode;
}

/**
 * Client-side wrapper to add season filtering to server-rendered pages.
 * Usage: Pass a function as children that receives the current seasonId.
 */
export function SeasonFilterWrapper({ tenant, children }: SeasonFilterWrapperProps) {
    const [seasonId, setSeasonId] = useState<string | null>(null);

    return (
        <>
            <div className="mb-6">
                <SeasonTabs
                    tenant={tenant}
                    currentSeasonId={seasonId || undefined}
                    onSeasonChange={setSeasonId}
                />
            </div>
            {children(seasonId)}
        </>
    );
}

/**
 * Simple static season tabs for pages that just need display
 * Shows the tabs but data filtering is handled elsewhere (e.g., query params)
 */
export function SeasonTabsWithSearch({ tenant }: { tenant: string }) {
    const [seasonId, setSeasonId] = useState<string | null>(null);

    const handleSeasonChange = (id: string | null) => {
        setSeasonId(id);
        // Update URL with season param
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (id) {
                url.searchParams.set('season', id);
            } else {
                url.searchParams.delete('season');
            }
            window.history.pushState({}, '', url.toString());
            // Reload to fetch new data with season filter
            window.location.reload();
        }
    };

    return (
        <SeasonTabs
            tenant={tenant}
            currentSeasonId={seasonId || undefined}
            onSeasonChange={handleSeasonChange}
        />
    );
}
