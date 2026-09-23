'use client';

import type { Sponsor } from '@/components/SponsorOverlay';

export default function SponsorsPage() {
    // There is no sponsors API yet, so no club has sponsors to list.
    // When one exists, load the club's sponsors here; the tier sections below render them.
    const sponsors: Sponsor[] = [];

    // Group by tier
    const titleSponsors = sponsors.filter(s => s.tier === 'title');
    const goldSponsors = sponsors.filter(s => s.tier === 'gold');
    const silverSponsors = sponsors.filter(s => s.tier === 'silver');
    const bronzeSponsors = sponsors.filter(s => s.tier === 'bronze');

    return (
        <div className="container py-12">
            <div className="text-center mb-16">
                <h1 className="text-5xl font-black mb-4 uppercase tracking-tighter">Our Partners</h1>
                <p className="text-xl text-muted max-w-2xl mx-auto">
                    {sponsors.length > 0
                        ? 'We are proud to be supported by these amazing local businesses. Their contribution keeps our club running and our community growing.'
                        : "This club hasn't added any sponsors yet."}
                </p>
            </div>

            {/* TITLE SPONSORS */}
            {titleSponsors.length > 0 && (
                <div className="mb-20">
                    <h2 className="text-center text-2xl font-bold uppercase tracking-widest text-brand mb-8 flex items-center justify-center gap-4">
                        <span className="h-px w-20 bg-brand/50"></span>
                        Title Partners
                        <span className="h-px w-20 bg-brand/50"></span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8 max-w-4xl mx-auto">
                        {titleSponsors.map(sponsor => (
                            <SponsorCard key={sponsor.id} sponsor={sponsor} size="lg" />
                        ))}
                    </div>
                </div>
            )}

            {/* GOLD SPONSORS */}
            {goldSponsors.length > 0 && (
                <div className="mb-16">
                    <h2 className="text-center text-xl font-bold uppercase tracking-widest text-yellow-500 mb-8">Gold Partners</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {goldSponsors.map(sponsor => (
                            <SponsorCard key={sponsor.id} sponsor={sponsor} size="md" />
                        ))}
                    </div>
                </div>
            )}

            {/* SILVER & BRONZE GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                {silverSponsors.length > 0 && (
                    <div>
                        <h2 className="text-center text-lg font-bold uppercase tracking-widest text-gray-400 mb-6">Silver Partners</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {silverSponsors.map(sponsor => (
                                <SponsorCard key={sponsor.id} sponsor={sponsor} size="sm" />
                            ))}
                        </div>
                    </div>
                )}

                {bronzeSponsors.length > 0 && (
                    <div>
                        <h2 className="text-center text-lg font-bold uppercase tracking-widest text-amber-700 mb-6">Bronze Partners</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {bronzeSponsors.map(sponsor => (
                                <SponsorCard key={sponsor.id} sponsor={sponsor} size="sm" />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* CTA */}
            <div className="mt-20 text-center bg-surface p-12 rounded-2xl border border-border">
                <h3 className="text-3xl font-bold mb-4">Become a Partner</h3>
                <p className="text-muted max-w-lg mx-auto">
                    Join our winning team! Sponsorship offers incredible exposure for your business while supporting grassroots sport. Speak to a club official to find out more.
                </p>
            </div>
        </div>
    );
}

function SponsorCard({ sponsor, size }: { sponsor: Sponsor, size: 'lg' | 'md' | 'sm' }) {
    const sizeClasses = {
        lg: 'h-64 text-2xl',
        md: 'h-48 text-xl',
        sm: 'h-32 text-lg'
    };

    return (
        <div className={`card flex flex-col items-center justify-center p-6 text-center hover:border-brand transition-colors group bg-white dark:bg-gray-800 ${sizeClasses[size]}`}>
            <div className={`w-full flex items-center justify-center flex-1 mb-4 opacity-80 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0`}>
                {/* Image Placeholder */}
                <div className="bg-gray-200 dark:bg-gray-700 w-24 h-24 rounded-full flex items-center justify-center font-bold text-4xl text-gray-400">
                    {sponsor.name[0]}
                </div>
            </div>
            <h3 className="font-bold text-foreground">{sponsor.name}</h3>
        </div>
    );
}
