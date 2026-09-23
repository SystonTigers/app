
import { getServerSDK } from '@/lib/sdk';
import { notFound } from 'next/navigation';
import { PlayerDiscussButton } from '@/components/PlayerDiscussButton';
import { CareerHistory } from '@/components/CareerHistory';

export default async function PlayerBioPage({ params }: { params: Promise<{ tenant: string; playerId: string }> }) {
    const { tenant, playerId } = await params;
    const sdk = getServerSDK(tenant);

    let player = null;
    let playerGoals: any = null;

    try {
        [player, playerGoals] = await Promise.all([
            sdk.getPlayer(playerId),
            fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/players/${playerId}/goals`, {
                headers: { Authorization: `Bearer ${process.env.API_TOKEN || ''}` }
            }).then(r => r.json()).then(d => d.success ? d.data : null).catch(() => null)
        ]);
        console.log(`[PlayerBio] Fetched player ${playerId}:`, player ? 'Found' : 'Not Found');
    } catch (e) {
        console.error(`[PlayerBio] Failed to fetch player ${playerId}`, e);
    }

    if (!player) {
        notFound();
    }

    const p = player as any;
    const statValue = (key: string): number | null => {
        const v = p.stats?.[key];
        return typeof v === 'number' && !Number.isNaN(v) ? v : null;
    };
    const hasNumber = p.number !== undefined && p.number !== null && p.number !== '';
    const joinedYear = p.joined_date ? new Date(p.joined_date).getFullYear() : null;

    const statTiles = [
        { key: 'appearances', label: 'Appearances', color: 'text-gray-900 dark:text-white' },
        { key: 'goals', label: 'Goals', color: 'text-brand' },
        { key: 'assists', label: 'Assists', color: 'text-gray-900 dark:text-white' },
        { key: 'motm', label: 'MOM Awards', color: 'text-yellow-500' },
    ]
        .map((tile) => ({ ...tile, value: statValue(tile.key) }))
        .filter((tile): tile is { key: string; label: string; color: string; value: number } => tile.value !== null);

    const profileRows = [
        p.position ? { label: 'Position', value: String(p.position) } : null,
        hasNumber ? { label: 'Squad Number', value: `#${p.number}` } : null,
        joinedYear && !Number.isNaN(joinedYear) ? { label: 'Joined Club', value: String(joinedYear) } : null,
    ].filter((row): row is { label: string; value: string } => row !== null);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
            {/* Hero Section */}
            <div className="relative bg-gray-900 border-b-4 border-brand h-[60vh] md:h-[500px] overflow-hidden flex items-end">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('/assets/pattern.png')] opacity-20 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10" />

                {/* Giant Number Background */}
                {hasNumber && (
                    <div className="absolute top-0 right-10 text-[300px] font-black text-white/5 opacity-50 z-0 leading-none select-none">
                        {p.number}
                    </div>
                )}

                <div className="container relative z-20 pb-12 md:pb-16 flex flex-col md:flex-row items-end gap-8">
                    {/* Player Image Placeholder (Circle/Cutout) */}
                    <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-t from-gray-200 to-gray-400 dark:from-gray-700 dark:to-gray-600 shadow-2xl border-4 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden shrink-0 mb-4 md:mb-0">
                        {/* Replace with actual Image component when URLs available */}
                        <div className="text-6xl font-black text-gray-500/50">
                            {p.name.charAt(0)}
                        </div>
                    </div>

                    <div className="flex-1 pb-4">
                        <div className="flex items-center gap-4 mb-2">
                            {p.position && (
                                <span className="bg-brand text-brand-foreground px-4 py-1 rounded-full text-sm font-black uppercase tracking-wider shadow-lg">
                                    {p.position}
                                </span>
                            )}
                            {hasNumber && <span className="text-gray-400 font-bold text-lg">#{p.number}</span>}
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-2 leading-none">
                            {p.name}
                        </h1>
                    </div>

                    {/* Quick Actions */}
                    <div className="pb-6 hidden md:flex gap-3">
                        <PlayerDiscussButton
                            tenant={tenant}
                            playerId={playerId}
                            playerName={p.name}
                        />
                        <button className="bg-white text-gray-900 hover:bg-brand hover:text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest transition-all hover:scale-105 shadow-xl">
                            Sponsor Player
                        </button>
                    </div>
                </div>
            </div>

            <div className="container px-6 py-12 -mt-10 relative z-30">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Stats */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Primary Stats Grid */}
                        <section>
                            <h3 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-brand block"></span>
                                Season Statistics
                            </h3>
                            {statTiles.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {statTiles.map((tile) => (
                                        <div key={tile.key} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center group hover:scale-[1.02] transition-transform">
                                            <div className={`text-4xl font-black ${tile.color} mb-1`}>{tile.value}</div>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{tile.label}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">Stats will appear once results are added.</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Column: Bio & Extras */}
                    <div className="space-y-6">
                        {/* Personal Details Card */}
                        {profileRows.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-black uppercase tracking-tight mb-6">Player Profile</h3>
                                <div className="space-y-4">
                                    {profileRows.map((row) => (
                                        <div key={row.label} className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                                            <span className="text-gray-500 font-medium text-sm">{row.label}</span>
                                            <span className="font-bold">{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Career Goals Section */}
                        {playerGoals && (
                            <div className="bg-gradient-to-br from-brand to-brand/80 text-white p-6 rounded-3xl shadow-lg">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-3xl">⚽</span>
                                    <h3 className="text-lg font-black uppercase tracking-tight">Career Goals</h3>
                                </div>

                                <div className="text-7xl font-black mb-6 text-center py-4">
                                    {playerGoals.total}
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs font-bold uppercase tracking-wider opacity-75 mb-3">
                                        Season Breakdown
                                    </div>
                                    {playerGoals.bySeason.map((season: any) => (
                                        <div
                                            key={season.seasonId}
                                            className="flex justify-between items-center p-3 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors"
                                        >
                                            <span className="font-medium">{season.seasonName}</span>
                                            <span className="font-black text-xl">{season.goals}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Career History from Other Clubs */}
                        <CareerHistory playerId={playerId} playerName={p.name} />
                    </div>

                    {/* Mobile CTA */}
                    <div className="block md:hidden space-y-3">
                        <PlayerDiscussButton
                            tenant={tenant}
                            playerId={playerId}
                            playerName={p.name}
                        />
                        <button className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg">
                            Sponsor Player
                        </button>
                    </div>

                    {/* Shop Item Mini Teaser */}
                    <div className="bg-gray-900 text-white p-6 rounded-3xl relative overflow-hidden group cursor-pointer">
                        <div className="absolute inset-0 bg-brand/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h3 className="text-xl font-black uppercase italic mb-2 relative z-10">Get the Kit</h3>
                        <p className="text-gray-300 text-sm mb-4 relative z-10">Support {p.name} with the official home jersey.</p>
                        <div className="inline-block bg-white text-black px-4 py-2 font-bold uppercase text-xs rounded-lg relative z-10">
                            Shop Now &rarr;
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
