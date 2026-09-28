'use client';

import { Suspense, use } from 'react';
import Link from 'next/link';
import { SocialSettings } from '@/components/SocialSettings';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

/**
 * Club settings hub: FA Full-Time snippets (league table, fixtures, results), how players appear
 * publicly, the Facebook/Instagram connection and automatic posting.
 */
export default function SettingsPage({ params }: PageProps) {
    const { tenant } = use(params);

    const sections = [
        {
            href: `/${tenant}/admin/settings/fa-sync`,
            icon: '📅',
            title: 'League Table & Fixtures (FA Full-Time)',
            description: 'Paste your FA Full-Time code snippets to show the league table, fixtures and results on your club pages.',
        },
    ];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-6 rounded-lg">
                <h2 className="text-2xl font-bold">Settings</h2>
                <p className="text-sm opacity-90">League table, privacy and automatic posts for your club</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {sections.map((section) => (
                    <Link
                        key={section.href}
                        href={section.href}
                        className="block bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-md transition-shadow no-underline"
                    >
                        <div className="text-3xl mb-2">{section.icon}</div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{section.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{section.description}</p>
                    </Link>
                ))}
                <Suspense fallback={null}>
                    <SocialSettings />
                </Suspense>
            </div>
        </div>
    );
}
