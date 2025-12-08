'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationCenter } from './NotificationCenter';
import { ThemeToggle } from './ThemeProvider';
import { SoundToggle } from './SoundEffects';
import { CommandPaletteTrigger } from './CommandPalette';

interface NavItem {
    label: string;
    href: string;
    icon: string;
}

interface PremiumNavProps {
    tenant: string;
    teamName?: string;
}

export function PremiumNav({ tenant, teamName }: PremiumNavProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const pathname = usePathname();

    const mainNav: NavItem[] = [
        { label: 'Home', href: `/${tenant}`, icon: '🏠' },
        { label: 'Fixtures', href: `/${tenant}/fixtures`, icon: '📅' },
        { label: 'Results', href: `/${tenant}/results`, icon: '🏆' },
        { label: 'Table', href: `/${tenant}/table`, icon: '📊' },
        { label: 'Squad', href: `/${tenant}/squad`, icon: '👥' },
        { label: 'Stats', href: `/${tenant}/stats`, icon: '📈' },
        { label: 'Training', href: `/${tenant}/training`, icon: '⚽' },
        { label: 'Team', href: `/${tenant}/team`, icon: '💬' },
    ];

    const secondaryNav: NavItem[] = [
        { label: 'Videos', href: `/${tenant}/videos`, icon: '🎬' },
        { label: 'Chat', href: `/${tenant}/chat`, icon: '💬' },
        { label: 'Shop', href: `/${tenant}/shop`, icon: '🛒' },
        { label: 'Calendar', href: `/${tenant}/calendar`, icon: '📆' },
        { label: 'Gallery', href: `/${tenant}/gallery`, icon: '🖼️' },
    ];

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (href: string) => {
        if (href === `/${tenant}`) {
            return pathname === `/${tenant}`;
        }
        return pathname.startsWith(href);
    };

    return (
        <>
            <header className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled
                ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-lg'
                : 'bg-white dark:bg-gray-900'
                } border-b border-gray-200 dark:border-gray-800`}>
                <div className="container">
                    {/* Main Nav Row */}
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href={`/${tenant}`} className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white font-black text-lg group-hover:scale-110 transition-transform">
                                {(teamName || tenant)?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-xl font-black uppercase tracking-tight hidden sm:block">
                                {teamName || tenant.replace(/-/g, ' ')}
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {mainNav.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${isActive(item.href)
                                        ? 'bg-brand text-white shadow-md'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    {item.label}
                                </Link>
                            ))}

                            {/* More Dropdown */}
                            <div className="relative group">
                                <button className="px-4 py-2 rounded-xl font-medium text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center gap-1">
                                    More
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <div className="absolute top-full right-0 mt-1 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2">
                                    {secondaryNav.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive(item.href)
                                                ? 'bg-brand/10 text-brand'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <span className="text-lg">{item.icon}</span>
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </nav>

                        {/* Right Side Actions */}
                        <div className="flex items-center gap-2">
                            <div className="hidden md:block">
                                <CommandPaletteTrigger />
                            </div>
                            <div className="hidden sm:flex items-center gap-1">
                                <SoundToggle />
                                <ThemeToggle />
                            </div>
                            <NotificationCenter />

                            {/* Admin Link */}
                            <Link
                                href={`/${tenant}/admin`}
                                className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm font-bold transition-colors"
                            >
                                <span>⚙️</span>
                                <span className="hidden lg:inline">Admin</span>
                            </Link>

                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {isMobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-lg font-black uppercase">Menu</span>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-2 mb-8">
                                {[...mainNav, ...secondaryNav].map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${isActive(item.href)
                                            ? 'bg-brand text-white'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <span className="text-xl">{item.icon}</span>
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                ))}
                            </div>

                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
                                <Link
                                    href={`/${tenant}/admin`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-4 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-medium"
                                >
                                    <span>⚙️</span>
                                    Admin Dashboard
                                </Link>

                                <div className="flex items-center justify-center gap-4">
                                    <SoundToggle />
                                    <ThemeToggle />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
