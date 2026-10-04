import Link from 'next/link';
import { getClubInfo } from '@/lib/club';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import { PageHeader } from '@/components/ui/Page';
import { Icon, type IconName } from '@/components/ui/Icon';

interface DashboardPageProps {
    params: Promise<{ tenant: string }>;
}

interface Tile {
    href: string;
    icon: IconName;
    title: string;
    text: string;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
    const { tenant } = await params;
    const club = await getClubInfo(tenant);
    const a = `/${tenant}/admin`;

    const tiles: Tile[] = [
        { href: `${a}/fixtures`, icon: 'calendar', title: 'Fixtures', text: 'Add matches, read them from a photo and write match reports.' },
        { href: `${a}/results`, icon: 'trophy', title: 'Results', text: 'Add scores and pick who scored. The table updates itself.' },
        { href: `${a}/squad`, icon: 'users', title: 'Squad', text: 'Sign players, edit names and numbers, and share login codes.' },
        { href: `${a}/feed`, icon: 'news', title: 'News', text: 'Post club news to the website and the app.' },
        { href: `${a}/table`, icon: 'table', title: 'League table', text: 'Check the table or work it out again from your results.' },
        { href: `${a}/settings`, icon: 'settings', title: 'Settings', text: 'Club badge, league table, automatic posts and live video.' },
    ];

    return (
        <div className="container py-8 md:py-10">
            <PageHeader
                eyebrow="Manager dashboard"
                title={club.name}
                subtitle="Everything you need to run the club's website and app, in one place."
            />

            <OnboardingChecklist tenantSlug={tenant} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tiles.map((tile) => (
                    <Link key={tile.href} href={tile.href} className="card group block transition-colors hover:border-brand/60">
                        <div className="flex items-start gap-4">
                            <span className="w-12 h-12 hexagon bg-brand/15 text-brand flex items-center justify-center shrink-0 transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                                <Icon name={tile.icon} className="w-6 h-6" />
                            </span>
                            <span className="min-w-0">
                                <span className="flex items-center gap-1 font-display text-2xl font-extrabold uppercase tracking-wide text-foreground">
                                    {tile.title}
                                    <Icon name="chevronRight" className="w-5 h-5 text-brand transition-transform group-hover:translate-x-1" />
                                </span>
                                <span className="block text-sm text-muted mt-1">{tile.text}</span>
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
