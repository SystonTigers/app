
import { getServerSDK } from '@/lib/sdk';

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-12 px-6">
        <div className="container">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Team Statistics</h1>
          <p className="text-gray-500">Performance data breakdown.</p>
        </div>
      </div>

      <div className="container px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Team Overview Card */}
          <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-8 text-brand">Season Overview</h2>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-center">
                <div className="text-3xl font-black text-gray-900 dark:text-white">{(stats as any).played}</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Matches</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-center">
                <div className="text-3xl font-black text-green-500">{(stats as any).won}</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Wins</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-center">
                <div className="text-3xl font-black text-gray-900 dark:text-white">{(stats as any).goalsFor}</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Goals Scored</div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl text-center">
                <div className="text-3xl font-black text-blue-500">{(stats as any).cleanSheets}</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Clean Sheets</div>
              </div>
            </div>

            <div className="space-y-4">
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

          {/* Top Scorers Card */}
          <section className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-black uppercase tracking-tight mb-8 text-brand">Top Scorers</h2>

            {scorers.length > 0 ? (
              <div className="space-y-3">
                {scorers.map((player: any, index: number) => (
                  <div
                    key={player.id}
                    className={`
                        flex items-center gap-4 p-4 rounded-xl transition-colors
                        ${index === 0 ? 'bg-brand text-brand-foreground shadow-lg transform scale-105' : 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200'}
                    `}
                  >
                    <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-black text-lg
                        ${index === 0 ? 'bg-white text-brand' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}
                    `}>
                      {index + 1}
                    </div>

                    <div className="flex-1 font-bold text-lg">
                      {player.name}
                    </div>

                    <div className="font-black text-2xl">
                      {player.stats?.goals || 0}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">No scoring data yet</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
