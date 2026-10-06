import Link from 'next/link';
import { getServerSDK } from '@/lib/sdk';
import { getClubInfo, getLatestMotm } from '@/lib/club';
import { MotmWinnerCard } from '@/components/MotmWinnerCard';
import { LiveScoreCard } from '@/components/LiveScoreCard';
import { clubAppLink } from '@/lib/app-link';
import { isClubTeam } from '@/lib/slug';
import { HomeComingUp, HomeNextMatch } from '@/components/HomeFixtures';
import { formatDate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';
import { EmptyNote } from '@/components/ui/Page';

interface HomePageProps {
  params: Promise<{ tenant: string }>;
}

interface TableRow {
  position: number;
  team: string;
  played: number;
  won: number;
  points: number;
  goalDifference: number;
}

interface FeedPost {
  id: string;
  content?: string;
  title?: string;
  timestamp?: string;
  media?: string[];
}

function QuickStats({ row }: { row: TableRow }) {
  const stats = [
    { label: 'League position', value: String(row.position), accent: true },
    { label: 'Points', value: String(row.points) },
    { label: 'Won', value: String(row.won) },
    { label: 'Goal difference', value: `${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}` },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      {stats.map((s) => (
        <div key={s.label} className="card p-4 text-center">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">{s.label}</p>
          <p className={`font-display text-4xl font-extrabold ${s.accent ? 'text-brand' : 'text-foreground'}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

/** The post's own title, or its first line when the feed has none. */
function postTitle(post: FeedPost): string {
  if (post.title) return post.title;
  return String(post.content ?? '').split('\n').find((line) => line.trim())?.trim() ?? '';
}

function NewsFeed({ posts, tenant }: { posts: FeedPost[]; tenant: string }) {
  if (posts.length === 0) {
    return (
      <EmptyNote
        icon="news"
        title="No news yet"
        action={<a href={clubAppLink(tenant)} className="btn btn-secondary">Get the club app</a>}
      >
        Match reports, team news and club updates will appear here once the club starts posting.
      </EmptyNote>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {posts.map((post) => {
        const title = postTitle(post);
        const image = post.media?.[0];
        return (
          <article key={post.id} className="card p-0 overflow-hidden flex flex-col">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-48 w-full object-cover" />
            )}
            <div className="p-6 flex-1 flex flex-col">
              {post.timestamp && <p className="eyebrow text-xs mb-2">{formatDate(post.timestamp)}</p>}
              {title && <h3 className="text-xl leading-tight mb-3 line-clamp-2">{title}</h3>}
              <p className="text-muted text-sm line-clamp-6 whitespace-pre-line">{post.content}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MiniTable({ table, tenant }: { table: TableRow[]; tenant: string }) {
  return (
    <section className="card">
      <h3 className="text-xl mb-4">League table</h3>
      {table.length === 0 ? (
        <p className="text-muted text-sm">The table will show here once the league season starts.</p>
      ) : (
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted uppercase border-b border-border">
                <th scope="col" className="text-left pb-2 w-8">#</th>
                <th scope="col" className="text-left pb-2">Team</th>
                <th scope="col" className="text-center pb-2 w-10">P</th>
                <th scope="col" className="text-center pb-2 w-10">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {table.slice(0, 5).map((row) => {
                const ours = isClubTeam(row.team, tenant);
                return (
                  <tr key={`${row.position}-${row.team}`} className={ours ? 'text-brand' : ''}>
                    <td className="py-2.5 font-bold">{row.position}</td>
                    <td className="py-2.5 font-bold">{row.team}</td>
                    <td className="py-2.5 text-center text-muted">{row.played}</td>
                    <td className="py-2.5 text-center font-extrabold">{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Link href={`/${tenant}/table`} className="mt-4 inline-flex items-center gap-1 min-h-[40px] text-sm font-bold text-brand hover:underline">
        Full table <Icon name="arrowRight" className="w-4 h-4" />
      </Link>
    </section>
  );
}


/** The API's list, or an empty one if it sent something else. */
function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export default async function TenantHomePage({ params }: HomePageProps) {
  const { tenant } = await params;
  const sdk = getServerSDK(tenant);
  const [club, motm, posts, table] = await Promise.all([
    getClubInfo(tenant),
    getLatestMotm(tenant),
    sdk.listFeed(1, 6).then((r) => asList<FeedPost>(r)).catch(() => [] as FeedPost[]),
    sdk.getLeagueTable().then((r) => asList<TableRow>(r)).catch(() => [] as TableRow[]),
  ]);

  const ourRow = table.find((r) => isClubTeam(r.team, tenant));

  return (
    <div className="container py-8 md:py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Official club page</p>
          <h1 className="page-title break-words">{club.name}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={clubAppLink(tenant)} className="btn btn-primary btn-sm min-h-[40px]">
            <Icon name="phone" className="w-4 h-4" /> Get the app
          </a>
        </div>
      </header>

      <LiveScoreCard tenant={tenant} clubName={club.name} />

      <HomeNextMatch tenant={tenant} clubName={club.name} />

      {ourRow && <QuickStats row={ourRow} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 min-w-0">
          <h2 className="text-3xl italic mb-6">Latest news</h2>
          <NewsFeed posts={posts} tenant={tenant} />
        </div>

        <aside className="space-y-6 min-w-0">
          {motm && <MotmWinnerCard motm={motm} />}
          <MiniTable table={table} tenant={tenant} />
          <HomeComingUp tenant={tenant} />
        </aside>
      </div>
    </div>
  );
}
