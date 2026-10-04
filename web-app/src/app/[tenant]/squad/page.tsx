import Link from 'next/link';
import { getServerSDK } from '@/lib/sdk';
import { findClub } from '@/lib/club';
import { EmptyNote, PageHeader } from '@/components/ui/Page';

interface SquadPlayer {
  id: string;
  name: string;
  number?: number;
  position?: string;
  photo?: string | null;
  stats?: { appearances?: number; goals?: number; assists?: number };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function PlayerCard({ player, tenant, withAssists }: { player: SquadPlayer; tenant: string; withAssists: boolean }) {
  const stats = [
    { label: 'Apps', value: player.stats?.appearances ?? 0 },
    { label: 'Goals', value: player.stats?.goals ?? 0 },
    ...(withAssists ? [{ label: 'Assists', value: player.stats?.assists ?? 0 }] : []),
  ];
  return (
    <Link
      href={`/${tenant}/squad/${player.id}`}
      className="card p-5 flex flex-col items-center text-center group hover:border-brand/60 transition-colors"
    >
      <div className="relative mb-4">
        <div className="w-24 h-24 hexagon bg-surface-raised flex items-center justify-center overflow-hidden">
          {player.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-3xl font-extrabold text-muted select-none" aria-hidden="true">{initials(player.name)}</span>
          )}
        </div>
        {player.number != null && (
          <span className="absolute -bottom-1 -right-2 w-10 h-10 hexagon bg-brand text-brand-foreground font-display text-lg font-extrabold flex items-center justify-center">
            <span className="sr-only">Number </span>{player.number}
          </span>
        )}
      </div>

      <h3 className="text-xl leading-tight mb-1 group-hover:text-brand transition-colors break-words">{player.name}</h3>
      <p className="text-xs font-bold uppercase tracking-wider text-muted mb-4">{player.position || 'Player'}</p>

      <dl className={`w-full grid ${withAssists ? 'grid-cols-3' : 'grid-cols-2'} border-t border-border pt-3 mt-auto`}>
        {stats.map((s, i) => (
          <div key={s.label} className={`flex flex-col-reverse ${i > 0 ? 'border-l border-border' : ''}`}>
            <dt className="text-[10px] uppercase font-bold tracking-wider text-muted">{s.label}</dt>
            <dd className="font-display text-2xl font-extrabold">{s.value}</dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}

const GROUPS: Array<{ title: string; match: (position: string) => boolean }> = [
  { title: 'Goalkeepers', match: (p) => p.includes('keeper') },
  { title: 'Defenders', match: (p) => p.includes('defender') || p.includes('back') },
  { title: 'Midfielders', match: (p) => p.includes('midfield') },
  { title: 'Forwards', match: (p) => p.includes('forward') || p.includes('striker') },
];

function PlayerGrid({ players, tenant, withAssists }: { players: SquadPlayer[]; tenant: string; withAssists: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
      {players.map((p) => <PlayerCard key={p.id} player={p} tenant={tenant} withAssists={withAssists} />)}
    </div>
  );
}

export default async function SquadPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const sdk = getServerSDK(tenant);
  const [raw, club] = await Promise.all([sdk.getSquad().catch((): unknown => []), findClub(tenant)]);
  // Clubs that don't record assists show apps and goals only
  const withAssists = club?.trackAssists !== false;
  const squad = Array.isArray(raw) ? (raw as SquadPlayer[]) : [];

  const grouped = GROUPS.map((g) => ({
    title: g.title,
    players: squad.filter((p) => g.match(String(p.position ?? '').toLowerCase())),
  }));
  const placed = new Set(grouped.flatMap((g) => g.players.map((p) => p.id)));
  const others = squad.filter((p) => !placed.has(p.id));
  const useGroups = placed.size > 0;

  return (
    <div className="container py-8 md:py-12">
      <PageHeader eyebrow="The team" title="Squad" subtitle="The players wearing the badge this season. Tap a player to see their stats." />

      {squad.length === 0 ? (
        <EmptyNote icon="users" title="No players yet">
          The squad shows here once the club adds its players.
        </EmptyNote>
      ) : useGroups ? (
        <div className="space-y-10">
          {[...grouped, { title: 'Squad', players: others }].filter((g) => g.players.length > 0).map((g) => (
            <section key={g.title}>
              <h2 className="text-2xl italic mb-4 pb-2 border-b border-border">
                {g.title} <span className="text-muted text-lg not-italic">{g.players.length}</span>
              </h2>
              <PlayerGrid players={g.players} tenant={tenant} withAssists={withAssists} />
            </section>
          ))}
        </div>
      ) : (
        <PlayerGrid players={squad} tenant={tenant} withAssists={withAssists} />
      )}
    </div>
  );
}
