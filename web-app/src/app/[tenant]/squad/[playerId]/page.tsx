import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSDK } from '@/lib/sdk';
import { PlayerDiscussButton } from '@/components/PlayerDiscussButton';
import { CareerHistory } from '@/components/CareerHistory';
import { Icon } from '@/components/ui/Icon';

interface PublicPlayer {
  id: string;
  name: string;
  number?: number | null;
  position?: string | null;
  photo?: string | null;
  stats?: Partial<Record<'appearances' | 'goals' | 'assists' | 'motm', number>>;
}

const TILES: Array<{ key: 'appearances' | 'goals' | 'assists' | 'motm'; label: string; accent?: boolean }> = [
  { key: 'appearances', label: 'Appearances' },
  { key: 'goals', label: 'Goals', accent: true },
  { key: 'assists', label: 'Assists' },
  { key: 'motm', label: 'Man of the Match' },
];

export default async function PlayerBioPage({ params }: { params: Promise<{ tenant: string; playerId: string }> }) {
  const { tenant, playerId } = await params;
  const sdk = getServerSDK(tenant);

  let player: PublicPlayer | null = null;
  try {
    player = (await sdk.getPlayer(playerId)) as PublicPlayer | null;
  } catch (e) {
    console.error(`Failed to load player ${playerId}`, e);
  }
  if (!player) notFound();

  const hasNumber = player.number !== undefined && player.number !== null;
  const tiles = TILES.map((t) => ({ ...t, value: player.stats?.[t.key] })).filter((t): t is typeof t & { value: number } => typeof t.value === 'number');

  return (
    <div className="pb-12">
      <section className="relative overflow-hidden border-b border-border bg-surface hex-grid">
        {hasNumber && (
          <span className="absolute -top-6 right-2 md:right-10 font-display text-[180px] md:text-[300px] font-extrabold leading-none text-foreground/5 select-none" aria-hidden="true">
            {player.number}
          </span>
        )}
        <div className="container relative py-10 md:py-16">
          <Link href={`/${tenant}/squad`} className="inline-flex items-center gap-1.5 min-h-[40px] text-sm font-bold text-muted hover:text-brand mb-6">
            <Icon name="arrowLeft" className="w-4 h-4" /> Squad
          </Link>
          <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-10">
            <div className="w-36 h-36 md:w-52 md:h-52 hexagon bg-surface-raised flex items-center justify-center overflow-hidden shrink-0">
              {player.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={player.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-6xl font-extrabold text-muted" aria-hidden="true">{player.name.charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {player.position && (
                  <span className="bg-brand text-brand-foreground px-3 py-1 chamfer-sm font-display text-sm font-bold uppercase tracking-wider">{player.position}</span>
                )}
                {hasNumber && <span className="font-display text-xl font-bold text-muted">#{player.number}</span>}
              </div>
              <h1 className="page-title text-5xl md:text-7xl break-words">{player.name}</h1>
            </div>
            <PlayerDiscussButton tenant={tenant} playerId={playerId} playerName={player.name} />
          </div>
        </div>
      </section>

      <div className="container py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2" aria-labelledby="season-stats">
          <h2 id="season-stats" className="text-2xl italic mb-4">Season stats</h2>
          {tiles.length > 0 ? (
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {tiles.map((t) => (
                <div key={t.key} className="card p-5 text-center flex flex-col-reverse">
                  <dt className="text-xs font-bold text-muted uppercase tracking-wider">{t.label}</dt>
                  <dd className={`font-display text-5xl font-extrabold ${t.accent ? 'text-brand' : ''}`}>{t.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="card text-muted">Stats show here once {player.name} has played in a game recorded by the club.</p>
          )}
        </section>

        <aside className="space-y-6">
          <CareerHistory playerId={playerId} playerName={player.name} />
          <Link href={`/${tenant}/shop`} className="card block group hover:border-brand/60 transition-colors">
            <Icon name="shirt" className="w-8 h-8 text-brand mb-3" />
            <h3 className="text-xl mb-1">Club shop</h3>
            <p className="text-muted text-sm mb-4">Kit, training wear and club gear.</p>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand">
              Visit the shop <Icon name="arrowRight" className="w-4 h-4" />
            </span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
