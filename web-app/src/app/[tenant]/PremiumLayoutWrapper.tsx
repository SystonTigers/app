'use client';

import type { ReactNode } from 'react';
import { CommandPalette, PremiumNav } from '@/components/ui';
import { BoostHuddleMark } from '@/components/ui/Brand';

interface PremiumLayoutWrapperProps {
    children: ReactNode;
    tenant: string;
    tenantName: string;
    badgeUrl: string | null;
}

/**
 * Every club page: the club nav (header, and a bottom bar plus menu on phones
 * and tablets), the page, a footer and the quick search (Ctrl+K).
 */
export function PremiumLayoutWrapper({ children, tenant, tenantName, badgeUrl }: PremiumLayoutWrapperProps) {
    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <PremiumNav tenant={tenant} teamName={tenantName} badgeUrl={badgeUrl} />

            {/* The footer leaves room for the bottom bar on phones and tablets */}
            <main className="flex-1">
                {children}
            </main>

            <footer className="border-t border-border bg-surface mb-[calc(4rem+env(safe-area-inset-bottom))] lg:mb-0">
                <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted">
                    <p>&copy; {new Date().getFullYear()} {tenantName}</p>
                    <div className="flex items-center gap-2">
                        <BoostHuddleMark compact />
                        <span>Powered by <a href="/" className="font-bold text-foreground hover:text-brand">Boost Huddle</a></span>
                    </div>
                </div>
            </footer>

            <CommandPalette tenant={tenant} />
        </div>
    );
}
