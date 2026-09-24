'use client';

import { use } from 'react';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

/**
 * Club settings hub. Each card links to a settings page backed by a working
 * backend route; fixture import is configured on the FA Full-Time page.
 */
export default function SettingsPage({ params }: PageProps) {
    const { tenant } = use(params);

    const sections = [
        {
            href: `/${tenant}/admin/settings/fa-sync`,
            icon: '📅',
            title: 'Fixture Import (FA Full-Time)',
            description: 'Connect your FA Full-Time team page and pull fixtures in with one click.',
        },
    ];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-6 rounded-lg">
                <h2 className="text-2xl font-bold">Settings</h2>
                <p className="text-sm opacity-90">Manage how fixtures get into your club dashboard</p>
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
            </div>
        </div>
    );
}
