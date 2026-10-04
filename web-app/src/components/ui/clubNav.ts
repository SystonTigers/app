/**
 * The club site's pages, shared by the nav (PremiumNav) and the quick search
 * (CommandPalette). Visitors only get pages that work without logging in.
 */
import type { IconName } from './Icon';

export interface NavItem {
    label: string;
    href: string;
    icon: IconName;
}

export function clubNav(tenant: string, signedIn: boolean): { main: NavItem[]; more: NavItem[] } {
    const t = `/${tenant}`;
    const main: NavItem[] = [
        { label: 'Home', href: t, icon: 'home' },
        { label: 'Fixtures', href: `${t}/fixtures`, icon: 'calendar' },
        { label: 'Results', href: `${t}/results`, icon: 'trophy' },
        { label: 'Table', href: `${t}/table`, icon: 'table' },
        { label: 'Squad', href: `${t}/squad`, icon: 'users' },
        { label: 'Stats', href: `${t}/stats`, icon: 'chart' },
    ];
    const more: NavItem[] = signedIn
        ? [
            { label: 'Gallery', href: `${t}/gallery`, icon: 'image' },
            { label: 'Videos', href: `${t}/videos`, icon: 'video' },
            { label: 'Training', href: `${t}/training`, icon: 'clipboard' },
            { label: 'Team talk', href: `${t}/team`, icon: 'chat' },
            { label: 'Calendar', href: `${t}/calendar`, icon: 'calendar' },
            { label: 'Season history', href: `${t}/history`, icon: 'history' },
            { label: 'Sponsors', href: `${t}/sponsors`, icon: 'handshake' },
        ]
        : [{ label: 'Sponsors', href: `${t}/sponsors`, icon: 'handshake' }];
    return { main, more };
}
