import { getServerSDK } from '@/lib/sdk';
import { AnimatedCounter } from '@/components/ui';
import { FunStatsCard } from '@/components/FunStatsCard';

export default async function StatsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const sdk = getServerSDK(tenant);

  const [teamStatsRes, topScorersRes] = await Promise.allSettled([
    sdk.getTeamStats().catch(() => null),
    sdk.getTopScorers(10).catch(() => []),
  ]);

  const rawStats = teamStatsRes.status === 'fulfilled' ? teamStatsRes.value : null;
  const rawScorers = topScorersRes.status === 'fulfilled' ? topScorersRes.value : [];

  const num = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : Number(v) || 0);
  const stats = rawStats && typeof rawStats === 'object'
    ? {
      played: num((rawStats as any).played),
      won: num((rawStats as any).won),
      drawn: num((rawStats as any).drawn),
      lost: num((rawStats as any).lost),
      goalsFor: num((rawStats as any).goalsFor),
      goalsAgainst: num((rawStats as any).goalsAgainst),
      cleanSheets: num((rawStats as any).cleanSheets),
    }
    : null;
  const hasTeamStats = !!stats && stats.played > 0;

  const scorers = (Array.isArray(rawScorers) ? rawScorers : [])
    .filter((player: any) => player && player.name && num(player.stats?.goals) > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-12 px-6">
        <div className="container">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Team Statistics</h1>
          <p className="text-gray-500">Comprehensive performance data and player rankings.</p>
        </div>
      </div>

      <div className="container px-6 py-12 space-y-8">
        {/* Fun Stats Card */}
        <FunStatsCard tenant={tenant} />

        {/* Team Overview Card - Full Width */}
        <section className="bg-white dark:bg-gray-800 chamfer-lg shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-8 text-brand">Season Overview</h2>

          {hasTeamStats ? (
            <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 chamfer-sm text-center">
                <div className="text-3xl font-black text-gray-900 dark:text-white">
                  <AnimatedCounter value={stats!.played} />
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Matches</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 chamfer-sm text-center">
                <div className="text-3xl font-black text-green-500">
                  <AnimatedCounter value={stats!.won} />
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Wins</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 chamfer-sm text-center">
                <div className="text-3xl font-black text-gray-900 dark:text-white">
                  <AnimatedCounter value={stats!.goalsFor} />
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Goals Scored</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 chamfer-sm text-center">
                <div className="text-3xl font-black text-blue-500">
                  <AnimatedCounter value={stats!.cleanSheets} />
                </div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Clean Sheets</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
                <span className="font-medium text-gray-600 dark:text-gray-300">Draws</span>
                <span className="font-bold">{stats!.drawn}</span>
              </div>
              <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
                <span className="font-medium text-gray-600 dark:text-gray-300">Losses</span>
                <span className="font-bold">{stats!.lost}</span>
              </div>
              <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
                <span className="font-medium text-gray-600 dark:text-gray-300">Goals Conceded</span>
                <span className="font-bold">{stats!.goalsAgainst}</span>
              </div>
              <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
                <span className="font-medium text-gray-600 dark:text-gray-300">Win Rate</span>
                <span className="font-bold">{Math.round((stats!.won / stats!.played) * 100)}%</span>
              </div>
            </div>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 font-medium">Stats will appear once results are added.</p>
          )}
        </section>

        {/* Player Statistics */}
        {scorers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {/* Top Scorers */}
            <StatCard title="Top Scorers ⚽" icon="⚽">
              {scorers.map((player: any, index: number) => (
                <PlayerStatRow
                  key={player.id ?? player.name}
                  rank={index + 1}
                  name={player.name}
                  stat={num(player.stats?.goals)}
                  isTop={index === 0}
                />
              ))}
            </StatCard>
          </div>
        ) : (
          <section className="bg-white dark:bg-gray-800 chamfer-lg shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-4 text-brand">Player Rankings</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Player rankings aren't available yet.</p>
          </section>
        )}
      </div>
    </div>
  );
}

// Reusable StatCard Component
function StatCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 chamfer-lg shadow-sm border border-gray-100 dark:border-gray-700 p-8">
      <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
        <span className="text-brand">{title.replace(/[⚽🅰️👕⏱️🟨🟥🎯]/g, '').trim()}</span>
        <span className="text-2xl">{icon}</span>
      </h2>
      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

// Reusable PlayerStatRow Component
function PlayerStatRow({
  rank,
  name,
  stat,
  suffix = '',
  isTop = false,
}: {
  rank: number;
  name: string;
  stat: number;
  suffix?: string;
  isTop?: boolean;
}) {
  return (
    <div
      className={`
        flex items-center gap-4 p-4 chamfer-sm transition-all
        ${isTop
          ? 'bg-brand text-brand-foreground shadow-lg transform scale-105'
          : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
        }
      `}
    >
      <div className={`
        w-10 h-10 rotate-45 flex items-center justify-center font-black text-lg
        ${isTop ? 'bg-white text-brand' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}
      `}>
        <span className="-rotate-45">{rank}</span>
      </div>

      <div className="flex-1 font-bold text-lg">
        {name}
      </div>

      <div className="font-black text-2xl">
        {stat}{suffix}
      </div>
    </div>
  );
}
