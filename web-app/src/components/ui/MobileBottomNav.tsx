'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileNavProps {
    tenant: string;
}

export function MobileBottomNav({ tenant }: MobileNavProps) {
    const pathname = usePathname();

    const navItems = [
        { label: 'Home', href: `/${tenant}`, icon: '🏠' },
        { label: 'Fixtures', href: `/${tenant}/fixtures`, icon: '📅' },
        { label: 'Results', href: `/${tenant}/results`, icon: '🏆' },
        { label: 'Squad', href: `/${tenant}/squad`, icon: '👥' },
        { label: 'More', href: `/${tenant}/training`, icon: '⚡' },
    ];

    const isActive = (href: string) => {
        if (href === `/${tenant}`) {
            return pathname === `/${tenant}`;
        }
        return pathname.startsWith(href);
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all ${isActive(item.href)
                                ? 'text-brand scale-110'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <span className={`text-xl mb-0.5 ${isActive(item.href) ? 'transform scale-110' : ''}`}>
                            {item.icon}
                        </span>
                        <span className={`text-[10px] font-bold ${isActive(item.href) ? 'text-brand' : ''}`}>
                            {item.label}
                        </span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}
