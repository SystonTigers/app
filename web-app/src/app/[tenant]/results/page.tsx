
import { getServerSDK } from '@/lib/sdk';

export default async function ResultsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const sdk = getServerSDK(tenant);

  let results: any[] = [];
  try {
    results = await sdk.listResults().catch(() => []);
  } catch (e) {
    console.error("Failed to fetch results");
  }

  if (results.length === 0) {
    // Mock data
    results = [
      { id: '1', homeTeam: 'Syston Tigers', awayTeam: 'Anstey Nomads', homeScore: 2, awayScore: 1, date: new Date().toISOString(), competition: 'League Cup', scorers: ['Smith 12\'', 'Jones 88\''] },
      { id: '2', homeTeam: 'Melton Town', awayTeam: 'Syston Tigers', homeScore: 0, awayScore: 3, date: new Date(Date.now() - 86400000 * 7).toISOString(), competition: 'League', scorers: ['Wilson 10\'', 'Smith 45\'', 'Smith 67\''] },
    ];
  }

  // Sort by date desc
  results.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-12 px-6">
        <div className="container">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Match Results</h1>
          <p className="text-gray-500">Latest scores and reports from the season.</p>
        </div>
      </div>

      <div className="container px-6 py-12">
        <div className="grid gap-6">
          {results.map((result: any) => {
            const isWin = (result.homeTeam === 'Syston Tigers' && result.homeScore > result.awayScore) ||
              (result.awayTeam === 'Syston Tigers' && result.awayScore > result.homeScore);
            const isDraw = result.homeScore === result.awayScore;

            // Simple outcome indicator color
            // In a real multi-tenant app we'd need to know the 'current team' to know W/L/D clearly
            // For now we just style the score board

            return (
              <div key={result.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row">
                  {/* Date & Competition Sidebar */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-6 flex flex-row md:flex-col items-center justify-between md:justify-center w-full md:w-48 text-center border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700">
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{result.competition}</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {new Date(result.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  {/* Score Section */}
                  <div className="flex-1 p-8">
                    <div className="flex items-center justify-between mb-6">
                      {/* Home */}
                      <div className="flex-1 flex flex-col items-center md:items-end text-center md:text-right">
                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-gray-100">
                          {result.homeTeam}
                        </h3>
                      </div>

                      {/* Score */}
                      <div className="px-8 flex flex-col items-center">
                        <div className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-6 py-2 rounded-xl tracking-widest">
                          {result.homeScore}-{result.awayScore}
                        </div>
                        <div className="mt-2 text-xs font-bold text-gray-400 uppercase">
                          Full Time
                        </div>
                      </div>

                      {/* Away */}
                      <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-gray-100">
                          {result.awayTeam}
                        </h3>
                      </div>
                    </div>

                    {/* Scorers / Details */}
                    {result.scorers && result.scorers.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-center">
                        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                          {result.scorers.map((scorer: string, idx: number) => (
                            <span key={idx} className="flex items-center">
                              <span className="mr-1">⚽</span> {scorer}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-center p-4 md:p-8 bg-gray-50 dark:bg-gray-900/30">
                    <button className="w-full md:w-auto px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      Report
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
