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

  let stats = teamStatsRes.status === 'fulfilled' ? teamStatsRes.value : null;
  let scorers = topScorersRes.status === 'fulfilled' ? topScorersRes.value : [];

  // Mock data if empty
  if (!stats) {
    stats = { played: 12, won: 9, drawn: 2, lost: 1, goalsFor: 28, goalsAgainst: 12, cleanSheets: 5 };
  }
  if (scorers.length === 0) {
    scorers = [
      { id: '1', name: 'James Smith', stats: { goals: 14 } },
      { id: '2', name: 'Alex Johnson', stats: { goals: 8 } },
      { id: '3', name: 'Ben Wilson', stats: { goals: 5 } },
      { id: '4', name: 'David Jones', stats: { goals: 3 } },
      { id: '5', name: 'Chris Brown', stats: { goals: 2 } },
    ];
  }

  // Mock data for new stats
  const topAssisters = [
    { id: '1', name: 'Alex Johnson', assists: 11 },
    { id: '2', name: 'Michael Taylor', assists: 7 },
    { id: '3', name: 'James Smith', assists: 5 },
    { id: '4', name: 'Tom Williams', assists: 4 },
    { id: '5', name: 'Ben Wilson', assists: 3 },
  ];

  const mostAppearances = [
    { id: '1', name: 'David Jones', appearances: 12 },
    { id: '2', name: 'James Smith', appearances: 12 },
    { id: '3', name: 'Alex Johnson', appearances: 11 },
    { id: '4', name: 'Ben Wilson', appearances: 10 },
    { id: '5', name: 'Chris Brown', appearances: 9 },
  ];

  const mostMinutes = [
    { id: '1', name: 'David Jones', minutes: 1080 },
    { id: '2', name: 'James Smith', minutes: 1035 },
    { id: '3', name: 'Alex Johnson', minutes: 945 },
    { id: '4', name: 'Ben Wilson', minutes: 870 },
    { id: '5', name: 'Tom Williams', minutes: 810 },
  ];

  const disciplineRecords = [
    { id: '1', name: 'Chris Brown', yellowCards: 5, redCards: 0 },
    { id: '2', name: 'David Jones', yellowCards: 3, redCards: 1 },
    { id: '3', name: 'Tom Williams', yellowCards: 3, redCards: 0 },
    { id: '4', name: 'Ben Wilson', yellowCards: 2, redCards: 0 },
    { id: '5', name: 'Michael Taylor', yellowCards: 2, redCards: 0 },
  ];

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
        {/* Team Overview Card - Full Width */}
        <section className="bg-white dark:bg-gray-800 chamfer-lg shadow-sm border border-gray-100 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-8 text-brand">Season Overview</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 chamfer-sm text-center">
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                <AnimatedCounter value={(stats as any).played} />
              </div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Matches</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 chamfer-sm text-center">
              <div className="text-3xl font-black text-green-500">
                <AnimatedCounter value={(stats as any).won} />
              </div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Wins</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 chamfer-sm text-center">
              <div className="text-3xl font-black text-gray-900 dark:text-white">
                <AnimatedCounter value={(stats as any).goalsFor} />
              </div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Goals Scored</div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 chamfer-sm text-center">
              <div className="text-3xl font-black text-blue-500">
                <AnimatedCounter value={(stats as any).cleanSheets} />
              </div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Clean Sheets</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
              <span className="font-medium text-gray-600 dark:text-gray-300">Draws</span>
              <span className="font-bold">{(stats as any).drawn}</span>
            </div>
            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
              <span className="font-medium text-gray-600 dark:text-gray-300">Losses</span>
              <span className="font-bold">{(stats as any).lost}</span>
            </div>
            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
              <span className="font-medium text-gray-600 dark:text-gray-300">Goals Conceded</span>
              <span className="font-bold">{(stats as any).goalsAgainst}</span>
            </div>
            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
              <span className="font-medium text-gray-600 dark:text-gray-300">Win Rate</span>
              <span className="font-bold">{Math.round(((stats as any).won / (stats as any).played) * 100)}%</span>
            </div>
          </div>
        </section>

        {/* Player Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {/* Top Scorers */}
          <StatCard title="Top Scorers ⚽" icon="⚽">
            {scorers.map((player: any, index: number) => (
              <PlayerStatRow
                key={player.id}
                rank={index + 1}
                name={player.name}
                stat={player.stats?.goals || 0}
                isTop={index === 0}
              />
            ))}
          </StatCard>

          {/* Top Assisters */}
          <StatCard title="Top Assisters 🅰️" icon="🎯">
            {topAssisters.map((player, index) => (
              <PlayerStatRow
                key={player.id}
                rank={index + 1}
                name={player.name}
                stat={player.assists}
                isTop={index === 0}
              />
            ))}
          </StatCard>

          {/* Most Appearances */}
          <StatCard title="Most Appearances 👕" icon="👕">
            {mostAppearances.map((player, index) => (
              <PlayerStatRow
                key={player.id}
                rank={index + 1}
                name={player.name}
                stat={player.appearances}
                isTop={index === 0}
              />
            ))}
          </StatCard>

          {/* Most Minutes */}
          <StatCard title="Most Minutes ⏱️" icon="⏱️">
            {mostMinutes.map((player, index) => (
              <PlayerStatRow
                key={player.id}
                rank={index + 1}
                name={player.name}
                stat={player.minutes}
                suffix="'"
                isTop={index === 0}
              />
            ))}
          </StatCard>

          {/* Discipline Records - Spans Full Width on Large Screens */}
          <div className="lg:col-span-2">
            <section className="bg-white dark:bg-gray-800 chamfer-lg shadow-sm border border-gray-100 dark:border-gray-700 p-8">
              <h2 className="text-2xl font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                <span className="text-brand">Discipline Records</span>
                <span className="text-2xl">🟨🟥</span>
              </h2>

              <div className="space-y-3">
                {disciplineRecords.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-4 p-4 chamfer-sm bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-10 h-10 rotate-45 flex items-center justify-center font-black text-lg bg-gray-200 dark:bg-gray-700 text-gray-500">
                      <span className="-rotate-45">{index + 1}</span>
                    </div>

                    <div className="flex-1 font-bold text-lg">
                      {player.name}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🟨</span>
                        <span className="font-black text-xl">{player.yellowCards}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🟥</span>
                        <span className="font-black text-xl text-red-500">{player.redCards}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
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
