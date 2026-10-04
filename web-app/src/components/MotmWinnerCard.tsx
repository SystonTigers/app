import type { LatestMotm } from '@/lib/club';
import { formatDate } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/** Club page sidebar: the latest Man of the Match, voted for by parents and players in the app. */
export function MotmWinnerCard({ motm }: { motm: LatestMotm }) {
  const names = motm.winners.map((w) => w.name).join(' & ');
  const photo = motm.winners.length === 1 ? motm.winners[0].photoUrl : null;
  const match = motm.match;
  const score = match && match.ourScore != null && match.theirScore != null ? ` ${match.ourScore}-${match.theirScore}` : '';

  return (
    <section className="card border-brand/40">
      <p className="eyebrow mb-4">Man of the Match{motm.winners.length > 1 ? ' (joint)' : ''}</p>
      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="w-16 h-16 hexagon object-cover" />
        ) : (
          <div className="w-16 h-16 hexagon bg-brand text-brand-foreground flex items-center justify-center" aria-hidden="true">
            <Icon name="star" className="w-7 h-7" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display text-2xl font-extrabold uppercase italic leading-tight break-words">{names}</p>
          {match && (
            <p className="text-sm text-muted mt-1">
              v {match.opponent}{score} · {formatDate(match.date, { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted mt-4">Voted for by parents and players in the club app.</p>
    </section>
  );
}
