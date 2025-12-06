'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import {
    ThemeProvider as DarkModeProvider,
    SoundProvider,
    OnboardingProvider,
    PremiumNav,
    CommandPalette,
    QuickActionsFAB,
    MobileBottomNav,
} from '@/components/ui';

interface PremiumLayoutWrapperProps {
    children: ReactNode;
    tenant: string;
    tenantName: string;
}

export function PremiumLayoutWrapper({ children, tenant, tenantName }: PremiumLayoutWrapperProps) {
    return (
        <DarkModeProvider>
            <SoundProvider>
                <OnboardingProvider>
                    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
                        {/* Premium Navigation - Desktop */}
                        <div className="hidden md:block">
                            <PremiumNav tenant={tenant} teamName={tenantName} />
                        </div>

                        {/* Simple Mobile Header */}
                        <header className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
                            <div className="container py-3">
                                <div className="flex items-center justify-between">
                                    <Link
                                        href={`/${tenant}`}
                                        className="text-xl font-black text-brand no-underline"
                                    >
                                        {tenantName}
                                    </Link>
                                    <div className="text-2xl">⚽</div>
                                </div>
                            </div>
                        </header>

                        {/* Main Content */}
                        <main className="flex-1 pb-20 md:pb-0">
                            {children}
                        </main>

                        {/* Footer - Hidden on Mobile */}
                        <footer className="hidden md:block bg-surface border-t border-border py-8 mt-12">
                            <div className="container flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="text-muted-foreground">
                                    <p>&copy; {new Date().getFullYear()} {tenantName}. Powered by Team Platform</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <a href="#" className="text-muted-foreground hover:text-brand transition-colors flex items-center gap-2">
                                        <span className="text-lg">𝕏</span>
                                        <span className="hidden lg:inline">Twitter</span>
                                    </a>
                                    <a href="#" className="text-muted-foreground hover:text-brand transition-colors flex items-center gap-2">
                                        <span className="text-lg">📷</span>
                                        <span className="hidden lg:inline">Instagram</span>
                                    </a>
                                    <a href="#" className="text-muted-foreground hover:text-brand transition-colors flex items-center gap-2">
                                        <span className="text-lg">📘</span>
                                        <span className="hidden lg:inline">Facebook</span>
                                    </a>
                                </div>
                            </div>
                        </footer>

                        {/* Command Palette - Global (⌘K / Ctrl+K) */}
                        <CommandPalette tenant={tenant} />

                        {/* Quick Actions FAB - Desktop Only */}
                        <div className="hidden md:block">
                            <QuickActionsFAB tenant={tenant} />
                        </div>

                        {/* Mobile Bottom Navigation */}
                        <MobileBottomNav tenant={tenant} />
                    </div>
                </OnboardingProvider>
            </SoundProvider>
        </DarkModeProvider>
    );
}
