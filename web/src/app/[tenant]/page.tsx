import { getServerSDK } from '@/lib/sdk';
import type { FeedPost, Fixture } from '@team-platform/sdk';

interface HomePageProps {
  params: { tenant: string };
}

export default async function TenantHomePage({ params }: HomePageProps) {
  const { tenant } = params;
  const sdk = getServerSDK(tenant);

  const [fixtures, posts, table, brand] = await Promise.allSettled([
    sdk.listFixtures().catch(() => []),
    sdk.listFeed(1, 5).catch(() => []),
    sdk.getLeagueTable().catch(() => []),
    sdk.getBrand().catch(() => null),
  ]);

  const nextFixtures = (fixtures.status === 'fulfilled' ? fixtures.value : []).slice(0, 3);
  const latestPosts = posts.status === 'fulfilled' ? posts.value : [];
  const leagueTable = (table.status === 'fulfilled' ? table.value : []).slice(0, 5);
  const brandKit = brand.status === 'fulfilled' ? brand.value : null;

  const clubName =
    brandKit?.clubName ??
    brandKit?.clubShortName ??
    humaniseTenant(tenant);

  return (
    <div className="page-shell stack" data-gap="xl">
      <header className="stack" data-gap="sm">
        <span className="eyebrow">Club overview</span>
        <h1 className="display-heading">{clubName}</h1>
        <p className="lede">
          Stay across fixtures, standings, and news without leaving the control room.
        </p>
      </header>

      <div className="grid-panels">
        <section className="surface stack" data-gap="sm">
          <div className="stack" data-gap="2xs">
            <span className="tag">Fixtures</span>
            <h2 className="section-title">Next up</h2>
            <p className="section-subtitle">Plan travel, squads, and comms ahead of time.</p>
          </div>

          {nextFixtures.length > 0 ? (
            <div className="list-stack">
              {nextFixtures.map((fixture) => (
                <article key={fixture.id} className="tile">
                  <div className="headline">
                    {fixture.homeTeam} vs {fixture.awayTeam}
                  </div>
                  <div className="lede">
                    {formatFixtureDate(fixture)}
                    {fixture.venue ? ` • ${fixture.venue}` : ''}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No upcoming fixtures</p>
          )}
        </section>

        <section className="surface stack" data-gap="sm">
          <div className="stack" data-gap="2xs">
            <span className="tag">League</span>
            <h2 className="section-title">Standings snapshot</h2>
            <p className="section-subtitle">Track the top of the table at a glance.</p>
          </div>

          {leagueTable.length > 0 ? (
            <div className="tile">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Pos</th>
                    <th scope="col">Team</th>
                    <th scope="col">P</th>
                    <th scope="col">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueTable.map((row) => (
                    <tr key={row.position}>
                      <td>{row.position}</td>
                      <td>{row.team}</td>
                      <td>{row.played}</td>
                      <td style={{ fontWeight: 600 }}>{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">No table data available</p>
          )}
        </section>

        <section className="surface stack grid-span-2" data-gap="sm">
          <div className="stack" data-gap="2xs">
            <span className="tag">Club news</span>
            <h2 className="section-title">Latest updates</h2>
            <p className="section-subtitle">
              Share quick wins, community announcements, and media drops here.
            </p>
          </div>

          {latestPosts.length > 0 ? (
            <div className="list-stack">
              {latestPosts.map((post) => (
                <article key={post.id} className="tile tile--brand">
                  <p className="lede">{post.content}</p>
                  <div className="section-subtitle">
                    {formatPostTimestamp(post)}
                    {post.author ? ` • ${post.author}` : ''}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No news posts yet</p>
          )}
        </section>
      </div>
    </div>
  );
}

function formatFixtureDate(fixture: Fixture) {
  const date = new Date(fixture.date);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: fixture.time ? 'short' : undefined,
  });
}

function formatPostTimestamp(post: FeedPost) {
  const date = new Date(post.timestamp);
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function humaniseTenant(value: string) {
  return value
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
