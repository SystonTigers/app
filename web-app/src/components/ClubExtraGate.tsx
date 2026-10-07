'use client';

/**
 * Wraps the page of a club extra (Subs and fees, Signing on, Shop). When the
 * club hasn't switched it on, people who open the page directly get a calm
 * note instead of a page full of errors; club admins also get a link to
 * Settings, where they can switch it on.
 */
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useClubModules } from '@/lib/clubModules';
import { isClubAdmin } from '@/lib/session';
import type { ClubModule } from '@/lib/club';
import { EmptyNote } from '@/components/ui/Page';
import type { IconName } from '@/components/ui/Icon';

const EXTRAS: Record<ClubModule, { name: string; icon: IconName; off: string }> = {
    subs: { name: 'Subs and fees', icon: 'money', off: "This club doesn't collect subs and fees through its website or app." },
    signingOn: { name: 'Signing on', icon: 'clipboard', off: "This club doesn't do signing on through its website or app." },
    shop: { name: 'The club shop', icon: 'shirt', off: "This club doesn't have a shop on its website or app." },
};

export function ClubExtraGate({ module, children }: { module: ClubModule; children: ReactNode }) {
    const params = useParams<{ tenant: string }>();
    const tenant = params?.tenant ?? '';
    const modules = useClubModules(tenant);
    const [admin, setAdmin] = useState(false);

    useEffect(() => {
        setAdmin(isClubAdmin());
    }, []);

    if (!modules) return <div className="container py-10 min-h-[50vh]" aria-busy="true" />;
    if (modules[module]) return <>{children}</>;

    const { name, icon, off } = EXTRAS[module];
    return (
        <div className="container py-8 md:py-10 max-w-3xl">
            <EmptyNote
                icon={icon}
                title={`${name} isn't switched on`}
                action={admin
                    ? <Link href={`/${tenant}/admin/settings#club-extras`} className="btn btn-primary">Go to Settings</Link>
                    : <Link href={`/${tenant}`} className="btn btn-secondary">Back to the club</Link>}
            >
                {off} {admin ? 'You can switch it on in Settings, under Club extras.' : 'If you need anything, ask someone at the club.'}
            </EmptyNote>
        </div>
    );
}
