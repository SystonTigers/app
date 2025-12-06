
import { getServerSDK } from '@/lib/sdk';

export default async function TablePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const sdk = getServerSDK(tenant);
  let table: any[] = [];
  try {
    table = await sdk.getLeagueTable().catch(() => []);
  } catch (e) {
    console.error("Failed to fetch table");
  }

  // Mock data
  if (table.length === 0) {
    table = [
      { position: 1, team: 'Melton Town', played: 12, won: 10, drawn: 1, lost: 1, goalsFor: 30, goalsAgainst: 10, goalDifference: 20, points: 31 },
      { position: 2, team: 'Syston Tigers', played: 12, won: 9, drawn: 2, lost: 1, goalsFor: 28, goalsAgainst: 12, goalDifference: 16, points: 29 },
      { position: 3, team: 'Anstey Nomads', played: 12, won: 8, drawn: 3, lost: 1, goalsFor: 25, goalsAgainst: 15, goalDifference: 10, points: 27 },
      { position: 4, team: 'Kirby Muxloe', played: 12, won: 6, drawn: 2, lost: 4, goalsFor: 20, goalsAgainst: 18, goalDifference: 2, points: 20 },
      { position: 5, team: 'Loughborough', played: 11, won: 5, drawn: 3, lost: 3, goalsFor: 18, goalsAgainst: 18, goalDifference: 0, points: 18 },
    ];
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-12 px-6">
        <div className="container flex flex-col md:flex-row items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">League Table</h1>
            <p className="text-gray-500">Current standings for the 2024/25 Season.</p>
          </div>
          <a href="#" className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-lg text-sm transition-colors">
            View Official Site &rarr;
          </a>
        </div>
      </div>

      <div className="container px-6 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="py-4 px-4 font-bold text-gray-500 uppercase tracking-wider text-left w-16">Pos</th>
                  <th className="py-4 px-4 font-bold text-gray-500 uppercase tracking-wider text-left">Team</th>
                  <th className="py-4 px-4 font-bold text-center text-gray-500 uppercase tracking-wider w-12">P</th>
                  <th className="py-4 px-4 font-bold text-center text-gray-500 uppercase tracking-wider w-12 hidden sm:table-cell">W</th>
                  <th className="py-4 px-4 font-bold text-center text-gray-500 uppercase tracking-wider w-12 hidden sm:table-cell">D</th>
                  <th className="py-4 px-4 font-bold text-center text-gray-500 uppercase tracking-wider w-12 hidden sm:table-cell">L</th>
                  <th className="py-4 px-4 font-bold text-center text-gray-500 uppercase tracking-wider w-12 hidden md:table-cell">GF</th>
                  <th className="py-4 px-4 font-bold text-center text-gray-500 uppercase tracking-wider w-12 hidden md:table-cell">GA</th>
                  <th className="py-4 px-4 font-bold text-center text-gray-500 uppercase tracking-wider w-12">GD</th>
                  <th className="py-4 px-4 font-bold text-center text-gray-900 dark:text-white uppercase tracking-wider w-16 bg-gray-50 dark:bg-gray-900">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {table.map((row: any, index: number) => {
                  const isPromo = index === 0; // Example
                  const isRel = index >= table.length - 2; // Example

                  // Highlight "our" team - in a real app check ID
                  const isMyTeam = row.team.includes('Syston');

                  return (
                    <tr
                      key={row.position}
                      className={`
                                                group transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50
                                                ${isMyTeam ? 'bg-brand/5 dark:bg-brand/10' : ''}
                                            `}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`
                                                        w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold
                                                        ${isPromo ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              isRel ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'text-gray-500'}
                                                    `}>
                            {row.position}
                          </span>
                          {isPromo && <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1" title="Promotion"></span>}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-gray-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          {isMyTeam && <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>}
                          {row.team}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-medium text-gray-600 dark:text-gray-400">{row.played}</td>
                      <td className="py-4 px-4 text-center text-gray-500 hidden sm:table-cell">{row.won}</td>
                      <td className="py-4 px-4 text-center text-gray-500 hidden sm:table-cell">{row.drawn}</td>
                      <td className="py-4 px-4 text-center text-gray-500 hidden sm:table-cell">{row.lost}</td>
                      <td className="py-4 px-4 text-center text-gray-500 hidden md:table-cell">{row.goalsFor}</td>
                      <td className="py-4 px-4 text-center text-gray-500 hidden md:table-cell">{row.goalsAgainst}</td>
                      <td className="py-4 px-4 text-center font-medium text-gray-600 dark:text-gray-400">
                        {row.goalDifference > 0 ? '+' : ''}{row.goalDifference}
                      </td>
                      <td className="py-4 px-4 text-center font-black text-lg text-brand bg-gray-50/50 dark:bg-gray-900/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-800 transition-colors">
                        {row.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key */}
        <div className="mt-6 flex gap-6 text-xs text-gray-500 uppercase font-bold tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span> Promotion
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span> Relegation
          </div>
        </div>
      </div>
    </div>
  );
}
