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
import { ClubBadge } from '@/components/ui/Brand';

interface PremiumLayoutWrapperProps {
    children: ReactNode;
    tenant: string;
    tenantName: string;
    badgeUrl: string | null;
}

export function PremiumLayoutWrapper({ children, tenant, tenantName, badgeUrl }: PremiumLayoutWrapperProps) {
    return (
        <DarkModeProvider>
            <SoundProvider>
                <OnboardingProvider>
                    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
                        {/* Premium Navigation - Desktop */}
                        <div className="hidden md:block">
                            <PremiumNav tenant={tenant} teamName={tenantName} badgeUrl={badgeUrl} />
                        </div>

                        {/* Simple Mobile Header */}
                        <header className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
                            <div className="container py-3">
                                <Link
                                    href={`/${tenant}`}
                                    className="flex items-center gap-3 no-underline"
                                >
                                    <ClubBadge name={tenantName} badgeUrl={badgeUrl} size={34} />
                                    <span className="font-display text-xl uppercase tracking-wide text-foreground truncate">
                                        {tenantName}
                                    </span>
                                </Link>
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
                                    <p>&copy; {new Date().getFullYear()} {tenantName}. Powered by Boost Huddle</p>
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
