import { getServerSDK } from '@/lib/sdk';
// Local type shims to avoid the external SDK
type Fixture = any;
type FeedPost = any;
type LeagueTableRow = any;
type NextFixture = any;
type LiveUpdate = any;


interface HomePageProps {
  params: { tenant: string };
}

export default async function TenantHomePage({ params }: HomePageProps) {
  const { tenant } = params;
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
  let liveUpdates: LiveUpdate[] = [];
  if (next?.id) {
    try {
      liveUpdates = await sdk.listLiveUpdates(next.id);
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

    const { youtubeLiveId, youtubeStatus, status, score, minute, homeTeam, awayTeam } = next;

    // State window rule: show YouTube within 24h before and 3h after kickoff
    const now = Date.now();
    const kickoff = new Date(next.kickoffIso).getTime();
    const withinWindow = now >= kickoff - 24*60*60*1000 && now <= kickoff + 3*60*60*1000;

    const showYouTube = withinWindow && youtubeLiveId && (youtubeStatus === 'live' || youtubeStatus === 'upcoming');
    const isActive = status === 'live' || status === 'halftime' || status === 'ft';

    // Priority 1: Show YouTube embed if within window and live/upcoming
    if (showYouTube) {
      const isLive = youtubeStatus === 'live';
      const embedUrl = `https://www.youtube.com/embed/${youtubeLiveId}?autoplay=${isLive ? 1 : 0}&modestbranding=1&playsinline=1`;

      return (
        <section className="card" style={{ marginBottom: 'var(--spacing-xl)', padding: 0, overflow: 'hidden' }}>
          {isLive && (
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FF0000',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              gap: '0.5rem',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
              }} />
              <span style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: '0.875rem' }}>
                LIVE NOW
              </span>
            </div>
          )}

          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
            <iframe
              src={embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
            />
          </div>

          {/* Scoreboard (if match is active) */}
          {isActive && score && (
            <div style={{
              padding: '24px',
              backgroundColor: '#E6E8EB',
              borderBottom: '1px solid #1E2128',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0F1419' }}>
                    {homeTeam}
                  </h3>
                </div>
                <div style={{ padding: '0 24px' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0F1419' }}>
                    {score.home} – {score.away}
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#0F1419' }}>
                    {awayTeam}
                  </h3>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <div style={{
                  backgroundColor: status === 'live' ? '#FF0000' : '#6B7280',
                  color: '#FFFFFF',
                  padding: '6px 14px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                }}>
                  {status === 'live' ? 'LIVE' : status === 'halftime' ? 'HT' : 'FT'}
                </div>
                {status === 'live' && minute !== undefined && (
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F1419' }}>
                    {minute}'
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mini Event Feed (if active and has updates) */}
          {isActive && liveUpdates.length > 0 && (
            <div style={{
              padding: '24px',
              backgroundColor: '#F5F5F5',
              borderTop: '1px solid #E0E0E0',
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#6B7280',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Latest Events
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {liveUpdates.slice(-5).reverse().map((update) => (
                  <div key={update.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '22px', lineHeight: 1 }}>
                      {getEventIcon(update.type, update.card)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: '15px',
                        lineHeight: '1.5',
                        color: '#0F1419',
                        marginBottom: '4px',
                      }}>
                        {update.text}
                      </p>
                      <p style={{
                        fontSize: '13px',
                        color: '#6B7280',
                      }}>
                        {update.minute}' {update.scoreSoFar && `• ${update.scoreSoFar}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: 'var(--spacing-lg)' }}>
            {!isActive && (
              <>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 'var(--spacing-xs)' }}>
                  {next.homeAway === 'H' ? 'vs' : '@'} {next.opponent}
                </h2>
                {next.competition && (
                  <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }}>
                    {next.competition}
                  </p>
                )}
              </>
            )}
            <a
              href={`https://youtu.be/${youtubeLiveId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
                backgroundColor: '#FF0000',
                color: '#FFFFFF',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              Watch on YouTube
            </a>
          </div>
        </section>
      );
    }

    // Priority 2: Show latest text update if available
    if (latestUpdate) {
      return (
        <section className="card" style={{
          marginBottom: 'var(--spacing-xl)',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          color: '#FFFFFF',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <div style={{
              backgroundColor: '#EF4444',
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 'bold',
            }}>
              LIVE UPDATE
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {latestUpdate.minute}'
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 'var(--spacing-md)', color: '#FFFFFF' }}>
            {latestUpdate.text}
          </h2>

          {latestUpdate.scoreSoFar && (
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              display: 'inline-block',
              marginBottom: 'var(--spacing-sm)',
            }}>
              <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                Score: {latestUpdate.scoreSoFar}
              </span>
            </div>
          )}

          {latestUpdate.scorer && (
            <p style={{ fontSize: '1rem', marginBottom: 'var(--spacing-sm)' }}>
              ⚽ {latestUpdate.scorer}
              {latestUpdate.assist && ` (assist: ${latestUpdate.assist})`}
            </p>
          )}

          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: 'var(--spacing-md)' }}>
            {new Date(latestUpdate.createdAt).toLocaleTimeString()}
          </p>
        </section>
      );
    }

    return null;
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-xl)' }}>
        Welcome
      </h1>

      {/* Live Match / YouTube / Ticker */}
      {renderLiveMatch()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
        {/* Next Fixture */}
        <section className="card">
          <h2 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--brand)' }}>
            Next Fixtures
          </h2>
          {nextFixtures.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {nextFixtures.map((fixture) => (
                <div
                  key={fixture.id}
                  style={{
                    padding: 'var(--spacing-sm)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ fontWeight: '600' }}>
                    {fixture.homeTeam} vs {fixture.awayTeam}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {new Date(fixture.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No upcoming fixtures</p>
          )}
        </section>

        {/* League Table Preview */}
        <section className="card">
          <h2 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--brand)' }}>
            League Table
          </h2>
          {leagueTable.length > 0 ? (
            <table style={{ width: '100%', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)' }}>Pos</th>
                  <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)' }}>Team</th>
                  <th style={{ textAlign: 'center', padding: 'var(--spacing-xs)' }}>P</th>
                  <th style={{ textAlign: 'center', padding: 'var(--spacing-xs)' }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {leagueTable.map((row) => (
                  <tr key={row.position}>
                    <td style={{ padding: 'var(--spacing-xs)' }}>{row.position}</td>
                    <td style={{ padding: 'var(--spacing-xs)' }}>{row.team}</td>
                    <td style={{ textAlign: 'center', padding: 'var(--spacing-xs)' }}>{row.played}</td>
                    <td style={{ textAlign: 'center', padding: 'var(--spacing-xs)', fontWeight: '600' }}>
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No table data available</p>
          )}
        </section>

        {/* Latest News */}
        <section className="card" style={{ gridColumn: 'span 2' }}>
          <h2 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--brand)' }}>
            Latest News
          </h2>
          {latestPosts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {latestPosts.map((post) => (
                <article
                  key={post.id}
                  style={{
                    padding: 'var(--spacing-md)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <p>{post.content}</p>
                  <div
                    style={{
                      marginTop: 'var(--spacing-sm)',
                      fontSize: '0.875rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {new Date(post.timestamp).toLocaleString()}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No news posts yet</p>
          )}
        </section>
      </div>
    </div>
  );
}
