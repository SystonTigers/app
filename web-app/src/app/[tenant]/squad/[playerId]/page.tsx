
import { getServerSDK } from '@/lib/sdk';
import Link from 'next/link';

export default async function PlayerBioPage({ params }: { params: Promise<{ tenant: string; playerId: string }> }) {
    const { tenant, playerId } = await params;
    const sdk = getServerSDK(tenant);

    let player = null;
    try {
        player = await sdk.getPlayer(playerId);
        console.log(`[PlayerBio] Fetched player ${playerId}:`, player ? 'Found' : 'Not Found');
    } catch (e) {
        console.error(`[PlayerBio] Failed to fetch player ${playerId}`, e);
    }

    // Fallback/Mock Data if API returns null or fails
    if (!player) {
        const mockSquad = [
            { id: '1', name: 'James Smith', number: 9, position: 'Forward', stats: { appearances: 12, goals: 8, assists: 3 } },
            { id: '2', name: 'David Jones', number: 4, position: 'Defender', stats: { appearances: 11, goals: 1, assists: 0 } },
            { id: '3', name: 'Alex Johnson', number: 10, position: 'Midfielder', stats: { appearances: 12, goals: 4, assists: 7 } },
            { id: '4', name: 'Ben Wilson', number: 1, position: 'Goalkeeper', stats: { appearances: 12, goals: 0, assists: 1 } },
        ];
        player = mockSquad.find(p => p.id === playerId) || null;
    }

    // Mock data for rich display if specific fields aren't in the basic squad list
    const p = player as any;
    const augmentedPlayer: any = {
        ...p,
        name: p?.name || "Player Name",
        number: p?.number || "99",
        position: p?.position || "Unknown",
        stats: {
            apps: p?.stats?.appearances || Math.floor(Math.random() * 30),
            goals: p?.stats?.goals || Math.floor(Math.random() * 10),
            assists: p?.stats?.assists || Math.floor(Math.random() * 8),
            mom: Math.floor(Math.random() * 5), // Man of the match
            cleanSheets: Math.floor(Math.random() * 5),
        },
        details: {
            nationality: "United Kingdom",
            age: 24,
            height: "1.85m",
            weight: "80kg",
            joined: "2023",
            prevClubs: ["Academy FC", "United Reserves"],
        },
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
            {/* Hero Section */}
            <div className="relative bg-gray-900 border-b-4 border-brand h-[60vh] md:h-[500px] overflow-hidden flex items-end">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('/assets/pattern.png')] opacity-20 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10" />

                {/* Giant Number Background */}
                <div className="absolute top-0 right-10 text-[300px] font-black text-white/5 opacity-50 z-0 leading-none select-none">
                    {augmentedPlayer.number}
                </div>

                <div className="container relative z-20 pb-12 md:pb-16 flex flex-col md:flex-row items-end gap-8">
                    {/* Player Image Placeholder (Circle/Cutout) */}
                    <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-t from-gray-200 to-gray-400 dark:from-gray-700 dark:to-gray-600 shadow-2xl border-4 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden shrink-0 mb-4 md:mb-0">
                        {/* Replace with actual Image component when URLs available */}
                        <div className="text-6xl font-black text-gray-500/50">
                            {augmentedPlayer.name.charAt(0)}
                        </div>
                    </div>

                    <div className="flex-1 pb-4">
                        <div className="flex items-center gap-4 mb-2">
                            <span className="bg-brand text-brand-foreground px-4 py-1 rounded-full text-sm font-black uppercase tracking-wider shadow-lg">
                                {augmentedPlayer.position}
                            </span>
                            <span className="text-gray-400 font-bold text-lg">#{augmentedPlayer.number}</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-2 leading-none">
                            {augmentedPlayer.name}
                        </h1>
                    </div>

                    {/* Quick Action */}
                    <div className="pb-6 hidden md:block">
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
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center group hover:scale-[1.02] transition-transform">
                                    <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">{augmentedPlayer.stats.apps}</div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Appearances</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center group hover:scale-[1.02] transition-transform">
                                    <div className="text-4xl font-black text-brand mb-1">{augmentedPlayer.stats.goals}</div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Goals</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center group hover:scale-[1.02] transition-transform">
                                    <div className="text-4xl font-black text-gray-900 dark:text-white mb-1">{augmentedPlayer.stats.assists}</div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Assists</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center group hover:scale-[1.02] transition-transform">
                                    <div className="text-4xl font-black text-yellow-500 mb-1">{augmentedPlayer.stats.mom}</div>
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">MOM Awards</div>
                                </div>
                            </div>
                        </section>

                        {/* Recent Matches Table (Mock) */}
                        <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                <h3 className="text-xl font-black uppercase tracking-tight">Recent Form</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase font-bold text-gray-500">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Opponent</th>
                                            <th className="px-6 py-4">Result</th>
                                            <th className="px-6 py-4 text-center">Mins</th>
                                            <th className="px-6 py-4 text-center">Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {[1, 2, 3, 4, 5].map((_, i) => (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">Oct {20 - i}</td>
                                                <td className="px-6 py-4">vs Rovers FC</td>
                                                <td className="px-6 py-4 font-bold text-green-600">W 2-1</td>
                                                <td className="px-6 py-4 text-center">90'</td>
                                                <td className="px-6 py-4 text-center font-bold text-brand">{(7 + Math.random() * 2).toFixed(1)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Bio & Extras */}
                    <div className="space-y-6">
                        {/* Personal Details Card */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-black uppercase tracking-tight mb-6">Player Profile</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <span className="text-gray-500 font-medium text-sm">Nationality</span>
                                    <span className="font-bold flex items-center gap-2">
                                        🇬🇧 {augmentedPlayer.details.nationality}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <span className="text-gray-500 font-medium text-sm">Age</span>
                                    <span className="font-bold">{augmentedPlayer.details.age} years</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <span className="text-gray-500 font-medium text-sm">Height</span>
                                    <span className="font-bold">{augmentedPlayer.details.height}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <span className="text-gray-500 font-medium text-sm">Joined Club</span>
                                    <span className="font-bold">{augmentedPlayer.details.joined}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Physical Attributes (New) */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-3xl shadow-lg border border-gray-700">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-2xl">⚡</span>
                            <h3 className="text-lg font-black uppercase tracking-tight">Physical Attributes</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between text-sm font-bold mb-2">
                                    <span className="text-gray-400">Pace (40m Sprint)</span>
                                    <span>4.5s</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand w-[85%] rounded-full" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm font-bold mb-2">
                                    <span className="text-gray-400">Stamina (Bleep Test)</span>
                                    <span>Lvl 12.4</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[75%] rounded-full" />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm font-bold mb-2">
                                    <span className="text-gray-400">Agility</span>
                                    <span>High</span>
                                </div>
                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 w-[90%] rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile CTA */}
                    <div className="block md:hidden">
                        <button className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg">
                            Sponsor Player
                        </button>
                    </div>

                    {/* Shop Item Mini Teaser */}
                    <div className="bg-gray-900 text-white p-6 rounded-3xl relative overflow-hidden group cursor-pointer">
                        <div className="absolute inset-0 bg-brand/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <h3 className="text-xl font-black uppercase italic mb-2 relative z-10">Get the Kit</h3>
                        <p className="text-gray-300 text-sm mb-4 relative z-10">Support {augmentedPlayer.name} with the official home jersey.</p>
                        <div className="inline-block bg-white text-black px-4 py-2 font-bold uppercase text-xs rounded-lg relative z-10">
                            Shop Now &rarr;
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
