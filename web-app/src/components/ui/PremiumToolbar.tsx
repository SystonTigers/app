'use client';

import { ReactNode } from 'react';
import { CommandPalette } from './CommandPalette';
import { QuickActionsFAB } from './QuickActionsFAB';
import { NotificationCenter } from './NotificationCenter';
import { ThemeToggle } from './ThemeProvider';
import { SoundToggle } from './SoundEffects';
import { CommandPaletteTrigger } from './CommandPalette';

interface PremiumToolbarProps {
    tenant: string;
}

export function PremiumToolbar({ tenant }: PremiumToolbarProps) {
    return (
        <>
            {/* Command Palette (hidden until triggered) */}
            <CommandPalette tenant={tenant} />

            {/* Quick Actions FAB */}
            <QuickActionsFAB tenant={tenant} />
        </>
    );
}

// Header toolbar items that can be integrated into existing header
export function HeaderToolbarItems() {
    return (
        <div className="flex items-center gap-2">
            <CommandPaletteTrigger />
            <SoundToggle />
            <ThemeToggle />
            <NotificationCenter />
        </div>
    );
}
