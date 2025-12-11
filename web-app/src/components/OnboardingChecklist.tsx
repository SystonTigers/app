'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CheckItem {
    id: string;
    label: string;
    completed: boolean;
    link: string;
    cta: string;
}

export default function OnboardingChecklist({ tenantSlug }: { tenantSlug: string }) {
    const [items, setItems] = useState<CheckItem[]>([
        { id: 'players', label: 'Add your first player', completed: false, link: `/${tenantSlug}/admin/squad`, cta: 'Add Player' },
        { id: 'fixtures', label: 'Schedule a match', completed: false, link: `/${tenantSlug}/admin/fixtures`, cta: 'Add Fixture' },
        { id: 'share', label: 'Share with your team', completed: false, link: `/${tenantSlug}`, cta: 'View Team Site' },
    ]);
    const [loading, setLoading] = useState(true);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if dismissed
        if (localStorage.getItem(`checklist_dismissed_${tenantSlug}`)) {
            setDismissed(true);
            return;
        }

        // Mock check for completed items (In real app, fetch stats)
        // For now, checks localStorage markers or just defaults to false
        // We can verify "share" by checking if not empty?
        setLoading(false);
    }, [tenantSlug]);

    const dismiss = () => {
        localStorage.setItem(`checklist_dismissed_${tenantSlug}`, 'true');
        setDismissed(true);
    };

    if (dismissed) return null;

    const progress = Math.round((items.filter(i => i.completed).length / items.length) * 100);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Get Started</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Complete these steps to set up your team.</p>
                </div>
                <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="space-y-4">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
                        <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                {item.completed && (
                                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <span className={`font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                {item.label}
                            </span>
                        </div>
                        {!item.completed && (
                            <Link href={item.link} className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                                {item.cta} &rarr;
                            </Link>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
