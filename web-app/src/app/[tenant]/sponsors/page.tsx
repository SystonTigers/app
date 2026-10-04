import { getClubInfo } from '@/lib/club';
import { EmptyNote, PageHeader } from '@/components/ui/Page';
import { Icon } from '@/components/ui/Icon';

/**
 * The club's sponsors. Clubs can't list sponsors on the website yet (there is
 * no sponsors API), so this says so and invites local businesses to get in touch.
 */
export default async function SponsorsPage({ params }: { params: Promise<{ tenant: string }> }) {
    const { tenant } = await params;
    const club = await getClubInfo(tenant);

    return (
        <div className="container py-8 md:py-12">
            <PageHeader eyebrow="Supporters" title="Sponsors" subtitle={`The local businesses that help keep ${club.name} playing.`} />

            <EmptyNote icon="handshake" title="No sponsors listed yet">
                {club.name}&apos;s sponsors will show here once the club adds them.
            </EmptyNote>

            <section className="card hex-grid mt-8 flex flex-col md:flex-row md:items-center gap-6">
                <div className="w-14 h-14 shrink-0 hexagon bg-brand text-brand-foreground flex items-center justify-center">
                    <Icon name="star" className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-3xl italic mb-2">Sponsor the club</h2>
                    <p className="text-muted max-w-2xl">
                        Grassroots football runs on local support. Sponsorship helps pay for kit, pitches and training,
                        and puts your business in front of families every week. Have a word with any of the club&apos;s
                        coaches or committee to find out more.
                    </p>
                </div>
            </section>
        </div>
    );
}
