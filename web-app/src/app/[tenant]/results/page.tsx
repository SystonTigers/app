'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PublicSeasonTabs } from '@/components/PublicSeasonTabs';

export default function ResultsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const [tenant, setTenant] = useState('');
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => setTenant(p.tenant));
  }, [params]);

  useEffect(() => {
    if (!tenant) return;
    loadResults();
  }, [tenant, seasonId]);

  async function loadResults() {
    try {
      setLoading(true);
      const query = seasonId ? `?seasonId=${seasonId}` : '';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/public/${tenant}/fixtures?status=results${query}`);
      const data = await res.json();
      if (data.success && data.data) {
        setResults(data.data);
      }
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  }


  // Navigation for discussions
  const router = useRouter();

  // Sort results by date (newest first)
  const sortedResults = [...results].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  function startDiscussion(result: any) {
    const discussionData = {
      title: `Match Analysis: ${result.homeTeam} vs ${result.awayTeam}`,
      category: 'match-analysis',
      related_entity_type: 'match',
      related_entity_id: result.id
    };

    // We'll create the discussion via API or redirect to a creation page. 
    // To match current patterns, we can create it immediately or redirect.
    // Given TrainingTools pattern, we create it.
    // However, ResultsPage doesn't have create logic yet.
    // Simpler approach: Redirect to discussions page with query params to start one?
    // OR just use same API pattern as TrainingTools. 

    // Let's implement creating it directly here for consistency.
    createDiscussion(discussionData);
  }

  async function createDiscussion(data: any) {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/v1/discussions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/${tenant}/team/discussions/${json.data.id}`);
      } else {
        console.error('Failed to create discussion:', json.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

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
        {tenant && (
          <PublicSeasonTabs
            tenant={tenant}
            onSeasonChange={setSeasonId}
            currentSeasonId={seasonId}
          />
        )}

        {loading ? (
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6">
            {sortedResults.map((result: any) => {
              const isWin = (result.homeTeam === 'Syston Tigers' && result.homeScore > result.awayScore) ||
                (result.awayTeam === 'Syston Tigers' && result.awayScore > result.homeScore);
              const isDraw = result.homeScore === result.awayScore;

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
                    <div className="flex items-center justify-center p-4 md:p-8 bg-gray-50 dark:bg-gray-900/30 gap-2">
                      <button className="w-full md:w-auto px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Report
                      </button>
                      <button
                        onClick={() => startDiscussion(result)}
                        className="w-full md:w-auto px-6 py-2 bg-brand text-white border border-transparent rounded-lg text-sm font-bold hover:bg-brand-dark transition-colors flex items-center gap-1"
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
