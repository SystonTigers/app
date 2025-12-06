
import { getServerSDK } from '@/lib/sdk';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import { WeatherWidget } from '@/components/ui/WeatherWidget';

function FixtureCard({ fixture, isNext }: { fixture: any, isNext?: boolean }) {
  const dateObj = new Date(fixture.date);
  const dateStr = dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = fixture.time || '15:00';

  // Combine date and time for countdown
  const [hours, minutes] = timeStr.split(':');
  const kickoffDate = new Date(dateObj);
  kickoffDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  if (isNext) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gray-900 text-white shadow-2xl mb-16 border border-gray-800">
        <div className="absolute inset-0 bg-[url('/assets/pitch-bg.jpg')] bg-cover bg-center opacity-30 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand/20 to-black/80" />

        <div className="relative z-10 p-8 md:p-12">
          {/* Top row: Competition badge & Weather */}
          <div className="flex items-center justify-between mb-6">
            <div className="inline-block px-4 py-1 bg-brand text-brand-foreground font-bold uppercase tracking-wider text-sm rounded-full">
              Next Match • {fixture.competition || 'League'}
            </div>
            <WeatherWidget className="text-white" />
          </div>

          {/* Main content */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            {/* Left: Date & Venue */}
            <div className="md:w-1/4">
              <h2 className="text-4xl md:text-5xl font-black uppercase italic leading-none mb-2">
                Matchday
              </h2>
              <p className="text-xl text-gray-300 font-mono">
                {dateStr} • {timeStr}
              </p>
              <p className="mt-4 text-gray-400 flex items-center justify-center md:justify-start gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {fixture.venue || 'Home Ground'}
              </p>
            </div>

            {/* Center: VS */}
            <div className="flex-1 flex items-center justify-center gap-8 w-full">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-800 rounded-full flex items-center justify-center border-4 border-gray-700 shadow-xl mb-4 text-4xl font-bold">
                  {fixture.homeTeam?.[0] || 'H'}
                </div>
                <span className="font-bold text-lg md:text-2xl uppercase tracking-tighter">{fixture.homeTeam}</span>
              </div>
              <div className="text-4xl md:text-6xl font-black text-gray-700 italic">VS</div>
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-white text-black rounded-full flex items-center justify-center border-4 border-gray-300 shadow-xl mb-4 text-4xl font-bold">
                  {fixture.awayTeam?.[0] || 'A'}
                </div>
                <span className="font-bold text-lg md:text-2xl uppercase tracking-tighter">{fixture.awayTeam}</span>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="md:w-1/4 flex justify-center md:justify-end">
              <button className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all transform hover:scale-105 rounded-xl shadow-lg">
                Get Tickets
              </button>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="mt-8 pt-6 border-t border-gray-700 flex flex-col items-center">
            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Kick-Off In</div>
            <CountdownTimer targetDate={kickoffDate} />
          </div>
        </div>
      </div>
    );
  }

  // Standard list item
  return (
    <div className="group flex flex-col md:flex-row items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
      {/* Date Box */}
      <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg p-3 w-full md:w-24 text-center mb-4 md:mb-0 md:mr-6">
        <span className="text-xs uppercase font-bold text-gray-500">{dateObj.toLocaleDateString('en-GB', { month: 'short' })}</span>
        <span className="text-2xl font-black text-gray-900 dark:text-white">{dateObj.getDate()}</span>
        <span className="text-xs font-bold text-gray-400">{dateObj.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
      </div>

      {/* Match Info */}
      <div className="flex-1 text-center md:text-left">
        <div className="text-xs font-bold text-brand uppercase tracking-wider mb-1">{fixture.competition}</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-brand transition-colors">
          {fixture.homeTeam} <span className="text-gray-400 mx-2">vs</span> {fixture.awayTeam}
        </h3>
        <div className="text-sm text-gray-500 flex items-center justify-center md:justify-start gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {timeStr}
          <span className="mx-1">•</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {fixture.venue}
        </div>
      </div>

      {/* Action */}
      <div className="mt-4 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          Details
        </button>
      </div>
    </div>
  );
}

export default async function FixturesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const sdk = getServerSDK(tenant);
  let fixtures: any[] = [];
  try {
    fixtures = await sdk.listFixtures().catch(() => []);
  } catch (e) {
    console.error("Failed to fetch fixtures");
  }

  // Mock if empty
  if (fixtures.length === 0) {
    fixtures = [
      { id: '1', homeTeam: 'Syston Tigers', awayTeam: 'Anstey Nomads', date: new Date().toISOString(), time: '15:00', competition: 'League Cup', venue: 'Memorial Park' },
      { id: '2', homeTeam: 'Melton Town', awayTeam: 'Syston Tigers', date: new Date(Date.now() + 86400000 * 7).toISOString(), time: '19:45', competition: 'League', venue: 'Melton Sports Village' },
      { id: '3', homeTeam: 'Syston Tigers', awayTeam: 'Kirby Muxloe', date: new Date(Date.now() + 86400000 * 14).toISOString(), time: '15:00', competition: 'League', venue: 'Memorial Park' },
    ];
  }

  // Sort by date
  fixtures.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const nextMatch = fixtures[0];
  const upcoming = fixtures.slice(1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      <div className="container px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Fixtures</h1>
            <p className="text-gray-500">Don't miss a moment of the action.</p>
          </div>
          <button className="hidden md:block px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg font-bold text-sm hover:bg-gray-300 transition-colors">
            Sync to Calendar
          </button>
        </div>

        {nextMatch ? (
          <>
            <FixtureCard fixture={nextMatch} isNext={true} />

            {upcoming.length > 0 && (
              <div className="space-y-4 max-w-4xl mx-auto">
                <h3 className="text-xl font-bold uppercase tracking-wider text-gray-400 mb-4 pl-2">Upcoming</h3>
                {upcoming.map((f: any) => (
                  <FixtureCard key={f.id} fixture={f} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-2xl font-bold mb-2">No Fixtures Scheduled</h3>
            <p className="text-gray-500 mb-6">Check back soon for the new season schedule.</p>
          </div>
        )}
      </div>
    </div>
  );
}
