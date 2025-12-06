
import { getServerSDK } from '@/lib/sdk';
import Link from 'next/link';
import { Suspense } from 'react';

interface HomePageProps {
  params: Promise<{ tenant: string }>;
}

function HeroSection({ nextFixture, tenant }: { nextFixture: any, tenant: string }) {
  if (!nextFixture) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gray-900 text-white shadow-2xl mb-8 p-12 text-center">
        <h1 className="text-4xl font-black uppercase italic mb-2">Welcome to {tenant}</h1>
        <p className="text-gray-400">The official home of your favorite team.</p>
      </div>
    );
  }

  // Check if live
  const isLive = nextFixture.status === 'live' || nextFixture.status === 'halftime';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-black text-white shadow-2xl mb-8 group">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 bg-[url('/assets/hero-bg.jpg')] bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />

      <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="text-center md:text-left">
          {isLive ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full" /> Live Match
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand text-brand-foreground rounded-full text-xs font-bold uppercase tracking-wider mb-4">
              Next Match
            </div>
          )}

          <h2 className="text-3xl md:text-5xl font-black uppercase italic leading-none mb-1">
            {nextFixture.homeTeam}
          </h2>
          <div className="text-xl md:text-3xl font-light text-gray-400 mb-1">vs</div>
          <h2 className="text-3xl md:text-5xl font-black uppercase italic leading-none mb-6">
            {nextFixture.awayTeam}
          </h2>

          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            {isLive ? (
              <Link href={`/${tenant}/live`} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Watch Live
              </Link>
            ) : (
              <Link href={`/${tenant}/fixtures`} className="px-6 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded-xl transition-colors">
                Match Details
              </Link>
            )}
            <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl backdrop-blur-sm transition-colors border border-white/10">
              Buy Tickets
            </button>
          </div>
        </div>

        {/* Countdown / Score / Time */}
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 min-w-[200px] text-center">
          {isLive ? (
            <div>
              <div className="text-4xl font-black text-white mb-1">
                {nextFixture.score?.home ?? 0} - {nextFixture.score?.away ?? 0}
              </div>
              <div className="text-red-500 font-bold animate-pulse">{nextFixture.minute}'</div>
            </div>
          ) : (
            <div>
              <div className="text-sm uppercase tracking-widest text-gray-400 mb-2">{new Date(nextFixture.date).toLocaleDateString()}</div>
              <div className="text-3xl font-black text-white">{nextFixture.time || '15:00'}</div>
              <div className="text-xs text-gray-500 mt-2">{nextFixture.venue}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickStats({ table }: { table: any[] }) {
  if (table.length === 0) return null;

  // Find our team (example logic)
  const myTeam = table.find((r: any) => r.team.includes('Syston')) || table[0];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">League Pos</span>
        <span className="text-3xl font-black text-brand">{myTeam.position}</span>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Points</span>
        <span className="text-3xl font-black text-gray-900 dark:text-white">{myTeam.points}</span>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Won</span>
        <span className="text-3xl font-black text-green-500">{myTeam.won}</span>
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Goal Diff</span>
        <span className="text-3xl font-black text-gray-900 dark:text-white">{myTeam.goalDifference > 0 ? '+' : ''}{myTeam.goalDifference}</span>
      </div>
    </div>
  );
}

function NewsFeed({ posts }: { posts: any[] }) {
  if (posts.length === 0) return (
    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
      <p className="text-gray-500">No news yet.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post: any) => (
        <div key={post.id} className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700 flex flex-col h-full">
          {post.image && (
            <div className="h-48 overflow-hidden">
              <img src={post.image} alt="News" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          )}
          <div className="p-6 flex-1 flex flex-col">
            <div className="text-xs font-bold text-brand uppercase tracking-wider mb-2">
              {new Date(post.timestamp).toLocaleDateString()}
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white leading-tight group-hover:text-brand transition-colors line-clamp-2">
              {/* Mock title if missing in feed */}
              {post.title || "Club Statement: Latest Updates from the Board"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 mb-4 flex-1">
              {post.content}
            </p>
            <a href="#" className="font-bold text-sm text-gray-900 dark:text-white hover:text-brand transition-colors inline-flex items-center gap-1">
              Read more <span className="text-brand">&rarr;</span>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function TenantHomePage({ params }: HomePageProps) {
  const { tenant } = await params;
  const sdk = getServerSDK(tenant);

  // Parallel data fetching
  const [nextFixtureRes, fixturesRes, postsRes, tableRes] = await Promise.allSettled([
    sdk.getNextFixture().catch(() => null),
    sdk.listFixtures().catch(() => []),
    sdk.listFeed(1, 6).catch(() => []),
    sdk.getLeagueTable().catch(() => []),
  ]);

  const nextFixture = nextFixtureRes.status === 'fulfilled' ? nextFixtureRes.value : null;
  const fixtures = fixturesRes.status === 'fulfilled' ? fixturesRes.value : [];
  const posts = postsRes.status === 'fulfilled' ? postsRes.value : [];
  const table = tableRes.status === 'fulfilled' ? tableRes.value : [];

  // Mock posts if empty for demo visual
  const displayPosts = posts.length > 0 ? posts : [
    { id: '1', timestamp: Date.now(), content: "We are delighted to announce our new partnership with local businesses to support grassroots football.", title: "New Sponsorship Deal Announced" },
    { id: '2', timestamp: Date.now() - 86400000, content: "A hard fought victory this weekend sees the first team climb to 2nd in the table.", title: "Match Report: Tigers 3 - 1 Nomads" },
    { id: '3', timestamp: Date.now() - 172800000, content: "Training schedules have been updated for the winter period. Please check the training page.", title: "Winter Training Schedule" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      <div className="container px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Official Dashboard</p>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic">
              {tenant}
            </h1>
          </div>
          <div className="hidden md:flex gap-3">
            <Link href={`/${tenant}/shop`} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Store
            </Link>
            <Link href={`/${tenant}/sponsors`} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Partners
            </Link>
          </div>
        </div>

        {/* Hero */}
        <HeroSection nextFixture={nextFixture || fixtures[0]} tenant={tenant} />

        {/* Quick Stats Row */}
        <QuickStats table={table} />

        {/* content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Col: News */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">Latest News</h2>
              <a href="#" className="text-sm font-bold text-brand hover:underline">View All</a>
            </div>
            <NewsFeed posts={displayPosts} />
          </div>

          {/* Right Col: Sidebar */}
          <div className="space-y-8">
            {/* Mini League Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-black uppercase tracking-tight mb-4">League Standings</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left pb-2">Pos</th>
                    <th className="text-left pb-2">Team</th>
                    <th className="text-center pb-2">Pl</th>
                    <th className="text-center pb-2">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {table.slice(0, 5).map((row: any) => (
                    <tr key={row.position}>
                      <td className="py-2 font-medium">{row.position}</td>
                      <td className="py-2 font-bold">{row.team}</td>
                      <td className="py-2 text-center text-gray-500">{row.played}</td>
                      <td className="py-2 text-center font-black">{row.points}</td>
                    </tr>
                  ))}
                  {table.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-500">No table data</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="mt-4 text-center">
                <Link href={`/${tenant}/table`} className="text-sm font-bold text-brand hover:underline">Full Table &rarr;</Link>
              </div>
            </div>

            {/* Upcoming */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-black uppercase tracking-tight mb-4">Upcoming Matches</h3>
              <div className="space-y-4">
                {fixtures.slice(0, 3).map((f: any) => (
                  <Link href={`/${tenant}/fixtures`} key={f.id} className="block group">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500 font-bold text-xs uppercase">{new Date(f.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <span className="text-gray-400 text-xs">{f.competition}</span>
                    </div>
                    <div className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-brand transition-colors">
                      {f.homeTeam} vs {f.awayTeam}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
