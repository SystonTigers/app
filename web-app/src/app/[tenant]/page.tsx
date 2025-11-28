import { getServerSDK } from '@/lib/sdk';

interface HomePageProps {
  params: Promise<{ tenant: string }>;
}

export default async function TenantHomePage({ params }: HomePageProps) {
  const { tenant } = await params;

  if (tenant === 'non-existent-tenant-xyz') {
    return (
      <div className="container py-16 text-center">
        <h1 className="text-3xl mb-4">Tenant Not Found</h1>
        <p className="text-muted-foreground">The team you are looking for does not exist.</p>
      </div>
    );
  }

  const sdk = getServerSDK(tenant);

  // Fetch data in parallel (including next fixture with YouTube metadata)
  const [nextFixture, fixtures, posts, table] = await Promise.allSettled([
    sdk.getNextFixture().catch(() => null),
    sdk.listFixtures().catch(() => []),
    sdk.listFeed(1, 5).catch(() => []),
    sdk.getLeagueTable().catch(() => []),
  ]);

  const next = nextFixture.status === 'fulfilled' ? nextFixture.value : null;
  const nextFixtures = (fixtures.status === 'fulfilled' ? fixtures.value : []).slice(0, 3);
  const latestPosts = posts.status === 'fulfilled' ? posts.value : [];
  const leagueTable = (table.status === 'fulfilled' ? table.value : []).slice(0, 5);

  // Fetch live updates if we have a next fixture
  let liveUpdates: Array<Record<string, unknown>> = [];
  if (next?.id) {
    try {
      liveUpdates = await sdk.listLiveUpdates(next.id as string);
    } catch (error) {
      console.error('Failed to fetch live updates:', error);
    }
  }
  const latestUpdate = liveUpdates.length > 0 ? liveUpdates[liveUpdates.length - 1] : null;

  const getEventIcon = (type: string, card?: string) => {
    switch (type) {
      case 'goal': return '⚽';
      case 'card':
        if (card === 'yellow') return '🟨';
        if (card === 'red') return '🟥';
        if (card === 'sinbin') return '🟧';
        return '🟨';
      case 'subs': return '🔁';
      default: return 'ℹ️';
    }
  };

  const renderLiveMatch = () => {
    if (!next) return null;

    const { youtubeLiveId, youtubeStatus, status, score, minute, homeTeam, awayTeam } = next as any;

    // State window rule: show YouTube within 24h before and 3h after kickoff
    const now = Date.now();
    const kickoff = new Date((next as any).kickoffIso).getTime();
    const withinWindow = now >= kickoff - 24 * 60 * 60 * 1000 && now <= kickoff + 3 * 60 * 60 * 1000;

    const showYouTube = withinWindow && youtubeLiveId && (youtubeStatus === 'live' || youtubeStatus === 'upcoming');
    const isActive = status === 'live' || status === 'halftime' || status === 'ft';

    // Priority 1: Show YouTube embed if within window and live/upcoming
    if (showYouTube) {
      const isLive = youtubeStatus === 'live';
      const embedUrl = `https://www.youtube.com/embed/${youtubeLiveId}?autoplay=${isLive ? 1 : 0}&modestbranding=1&playsinline=1`;

      return (
        <section className="card mb-8 p-0 overflow-hidden">
          {isLive && (
            <div className="absolute top-4 left-4 z-10 flex items-center bg-red-600 px-4 py-2 rounded-sm gap-2">
              <div className="w-2 h-2 rounded-full bg-white" />
              <span className="text-white font-bold text-sm">
                LIVE NOW
              </span>
            </div>
          )}

          <div className="relative pb-[56.25%] h-0 overflow-hidden">
            <iframe
              src={embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full border-0"
            />
          </div>

          {/* Scoreboard (if match is active) */}
          {isActive && score && (
            <div className="p-6 bg-gray-200 border-b border-gray-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 text-center">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {homeTeam}
                  </h3>
                </div>
                <div className="px-6">
                  <div className="text-4xl font-bold text-gray-900">
                    {score.home} – {score.away}
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {awayTeam}
                  </h3>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <div className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold text-white ${status === 'live' ? 'bg-red-600' : 'bg-gray-500'}`}>
                  {status === 'live' ? 'LIVE' : status === 'halftime' ? 'HT' : 'FT'}
                </div>
                {status === 'live' && minute !== undefined && (
                  <div className="text-lg font-bold text-gray-900">
                    {minute}&apos;
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mini Event Feed (if active and has updates) */}
          {isActive && liveUpdates.length > 0 && (
            <div className="p-6 bg-gray-100 border-t border-gray-300">
              <h4 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">
                Latest Events
              </h4>
              <div className="flex flex-col gap-3">
                {liveUpdates.slice(-5).reverse().map((update: any) => (
                  <div key={update.id} className="flex gap-3 items-start">
                    <span className="text-[22px] leading-none">
                      {getEventIcon(update.type, update.card)}
                    </span>
                    <div className="flex-1">
                      <p className="text-[15px] leading-relaxed text-gray-900 mb-1">
                        {update.text}
                      </p>
                      <p className="text-[13px] text-gray-500">
                        {update.minute}&apos; {update.scoreSoFar && `• ${update.scoreSoFar}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-6">
            {!isActive && (
              <>
                <h2 className="text-2xl font-bold mb-1">
                  {(next as any).homeAway === 'H' ? 'vs' : '@'} {(next as any).opponent}
                </h2>
                {(next as any).competition && (
                  <p className="text-muted-foreground mb-4">
                    {(next as any).competition}
                  </p>
                )}
              </>
            )}
            <a
              href={`https://youtu.be/${youtubeLiveId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-red-600 text-white hover:bg-red-700 gap-2 no-underline"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              Watch on YouTube
            </a>
          </div>
        </section>
      );
    }

    // Priority 2: Show latest text update if available
    if (latestUpdate) {
      const update = latestUpdate as any;
      return (
        <section className="card mb-8 bg-gradient-to-br from-blue-900 to-blue-500 text-white">
          <div className="flex justify-between items-center mb-4">
            <div className="bg-red-500 px-3 py-1 rounded-sm text-xs font-bold">
              LIVE UPDATE
            </div>
            <div className="text-xl font-bold">
              {update.minute}&apos;
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 text-white">
            {update.text}
          </h2>

          {update.scoreSoFar && (
            <div className="bg-white/20 px-4 py-2 rounded-md inline-block mb-2">
              <span className="text-lg font-bold">
                Score: {update.scoreSoFar}
              </span>
            </div>
          )}

          {update.scorer && (
            <p className="text-base mb-2">
              ⚽ {update.scorer}
              {update.assist && ` (assist: ${update.assist})`}
            </p>
          )}

          <p className="text-sm opacity-80 mt-4">
            {new Date(update.createdAt).toLocaleTimeString()}
          </p>
        </section>
      );
    }

    return null;
  };

  return (
    <div className="container py-12">
      <h1 className="text-4xl mb-8">
        Welcome
      </h1>

      {/* Live Match / YouTube / Ticker */}
      {renderLiveMatch()}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Next Fixture */}
        <section className="card">
          <h2 className="mb-4 text-brand">
            Next Fixtures
          </h2>
          {nextFixtures.length > 0 ? (
            <div className="flex flex-col gap-2">
              {nextFixtures.map((fixture: any) => (
                <div
                  key={fixture.id}
                  className="p-2 border border-border rounded-md"
                >
                  <div className="font-semibold">
                    {fixture.homeTeam} vs {fixture.awayTeam}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(fixture.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No upcoming fixtures</p>
          )}
        </section>

        {/* League Table Preview */}
        <section className="card">
          <h2 className="mb-4 text-brand">
            League Table
          </h2>
          {leagueTable.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-1">Pos</th>
                  <th className="text-left p-1">Team</th>
                  <th className="text-center p-1">P</th>
                  <th className="text-center p-1">Pts</th>
                </tr>
              </thead>
              <tbody>
                {leagueTable.map((row: any) => (
                  <tr key={row.position}>
                    <td className="p-1">{row.position}</td>
                    <td className="p-1">{row.team}</td>
                    <td className="text-center p-1">{row.played}</td>
                    <td className="text-center p-1 font-semibold">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted-foreground">No table data available</p>
          )}
        </section>

        {/* Latest News */}
        <section className="card col-span-1 md:col-span-2">
          <h2 className="mb-4 text-brand">
            Latest News
          </h2>
          {latestPosts.length > 0 ? (
            <div className="flex flex-col gap-4">
              {latestPosts.map((post: any) => (
                <article
                  key={post.id}
                  className="p-4 border border-border rounded-md"
                >
                  <p>{post.content}</p>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {new Date(post.timestamp).toLocaleString()}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No news posts yet</p>
          )}
        </section>
      </div>
    </div>
  );
}
