import { getServerSDK } from '@/lib/sdk';
import type { Fixture, FeedPost, LeagueTableRow } from '@team-platform/sdk';

interface HomePageProps {
  params: { tenant: string };
}

export default async function TenantHomePage({ params }: HomePageProps) {
  const { tenant } = params;
  const sdk = getServerSDK(tenant);

  // Fetch data in parallel
  const [fixtures, posts, table] = await Promise.allSettled([
    sdk.listFixtures().catch(() => []),
    sdk.listFeed(1, 5).catch(() => []),
    sdk.getLeagueTable().catch(() => []),
  ]);

  const nextFixtures = (fixtures.status === 'fulfilled' ? fixtures.value : []).slice(0, 3);
  const latestPosts = posts.status === 'fulfilled' ? posts.value : [];
  const leagueTable = (table.status === 'fulfilled' ? table.value : []).slice(0, 5);

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-xl)' }}>
        Welcome
      </h1>

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
