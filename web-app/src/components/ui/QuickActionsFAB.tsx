'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface QuickAction {
    id: string;
    label: string;
    icon: string;
    color: string;
    path: string;
}

interface QuickActionsFABProps {
    tenant: string;
}

export function QuickActionsFAB({ tenant }: QuickActionsFABProps) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const actions: QuickAction[] = [
        { id: 'training', label: 'Log Training', icon: '⚽', color: 'bg-green-500', path: `/${tenant}/training?action=new` },
        { id: 'video', label: 'Upload Video', icon: '🎬', color: 'bg-purple-500', path: `/${tenant}/videos?action=upload` },
        { id: 'fixture', label: 'Add Fixture', icon: '📅', color: 'bg-blue-500', path: `/${tenant}/admin/fixtures/new` },
        { id: 'announcement', label: 'New Post', icon: '📢', color: 'bg-orange-500', path: `/${tenant}/admin/feed/new` },
    ];

    const handleAction = (path: string) => {
        router.push(path);
        setIsOpen(false);
    };

    return (
        <div className="fixed bottom-6 right-6 z-40">
            {/* Action Buttons */}
            <div className={`flex flex-col-reverse gap-3 mb-3 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                {actions.map((action, index) => (
                    <button
                        key={action.id}
                        onClick={() => handleAction(action.path)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${action.color} text-white shadow-lg hover:scale-105 transition-all`}
                        style={{
                            transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                            transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)',
                        }}
                    >
                        <span className="text-xl">{action.icon}</span>
                        <span className="font-bold text-sm whitespace-nowrap">{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Main FAB Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-2xl bg-brand text-white shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-110 hover:shadow-xl ${isOpen ? 'rotate-45 bg-gray-800' : ''}`}
            >
                ➕
            </button>
        </div>
    );
}
