import type { LatestMotm } from '@/lib/club';

/** Club page sidebar: the latest Man of the Match, voted for by parents and players in the app. */
export function MotmWinnerCard({ motm }: { motm: LatestMotm }) {
  const names = motm.winners.map((w) => w.name).join(' & ');
  const photo = motm.winners.length === 1 ? motm.winners[0].photoUrl : null;
  const match = motm.match;
  const score = match && match.ourScore != null && match.theirScore != null ? ` ${match.ourScore}-${match.theirScore}` : '';

  return (
    <div className="bg-gray-900 text-white chamfer-lg shadow-sm p-6">
      <p className="text-xs font-black uppercase tracking-widest text-brand mb-3">
        Man of the Match{motm.winners.length > 1 ? ' (joint)' : ''}
      </p>
      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-brand" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-brand text-black flex items-center justify-center text-2xl font-black" aria-hidden="true">
            ★
          </div>
        )}
        <div>
          <p className="text-xl font-black uppercase italic leading-tight">{names}</p>
          {match && (
            <p className="text-sm text-gray-400 mt-1">
              vs {match.opponent}{score} · {new Date(match.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-4">Voted for by parents and players in the club app.</p>
    </div>
  );
}
