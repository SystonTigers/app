'use client';

import { Suspense, use } from 'react';
import Link from 'next/link';
import { SocialSettings } from '@/components/SocialSettings';
import { LiveVideoSettings } from '@/components/LiveVideoSettings';
import { ClubBadgeSettings } from '@/components/ClubBadgeSettings';
import { PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

/**
 * Club settings hub: the club badge, FA Full-Time snippets (league table, fixtures, results), how players appear
 * publicly, the Facebook/Instagram connection, automatic posting and live match video.
 */
export default function SettingsPage({ params }: PageProps) {
    const { tenant } = use(params);

    return (
        <div className="container py-8 md:py-10">
            <PageHeader
                eyebrow="Club admin"
                title="Settings"
                subtitle="Badge, league table, privacy, automatic posts and live video for your club. Also in the app: Manager Zone, then Club Settings."
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 [&>*]:min-w-0">
                <ClubBadgeSettings />
                <Link href={`/${tenant}/admin/settings/fa-sync`} className="card group block md:col-span-2 transition-colors hover:border-brand/60">
                    <div className="flex items-start gap-4">
                        <span className="w-12 h-12 hexagon bg-brand/15 text-brand flex items-center justify-center shrink-0 transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                            <Icon name="table" className="w-6 h-6" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1 font-display text-2xl font-extrabold uppercase tracking-wide text-foreground">
                                League table and fixtures
                                <Icon name="chevronRight" className="w-5 h-5 text-brand transition-transform group-hover:translate-x-1" />
                            </span>
                            <span className="block text-sm text-muted mt-1">
                                Paste your league&apos;s results once a week and we work out the table, sorted by goal difference. Bring in FA fixture emails and add FA Full-Time snippets too.
                            </span>
                        </span>
                    </div>
                </Link>
                <Suspense fallback={null}>
                    <SocialSettings />
                </Suspense>
                <Suspense fallback={null}>
                    <LiveVideoSettings />
                </Suspense>
            </div>
        </div>
    );
}
