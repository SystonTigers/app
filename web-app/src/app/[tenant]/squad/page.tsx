
import { getServerSDK } from '@/lib/sdk';
import { Suspense } from 'react';

// Player Card Component
function PlayerCard({ player }: { player: any }) {
  const initials = player.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700">
      {/* Top Pattern / Gradient */}
      <div className={`h-24 w-full bg-gradient-to-r from-brand to-brand/80 absolute top-0 left-0 z-0`}>
        <div className="absolute inset-0 opacity-20 bg-[url('/assets/pattern.png')] bg-repeat" />
      </div>

      <div className="relative z-10 p-6 pt-12 flex flex-col items-center">
        {/* Avatar / Photo */}
        <div className="relative mb-4">
          <div className="h-28 w-28 rounded-full border-4 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 flex items-center justify-center shadow-lg overflow-hidden">
            {player.image ? (
              <img src={player.image} alt={player.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-gray-400 select-none">{initials}</span>
            )}
          </div>
          {player.number && (
            <div className="absolute bottom-0 right-0 bg-white dark:bg-gray-900 border-2 border-brand text-brand font-black rounded-full w-10 h-10 flex items-center justify-center shadow-md text-sm">
              {player.number}
            </div>
          )}
        </div>

        {/* Info */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-1 group-hover:text-brand transition-colors">
          {player.name}
        </h3>
        <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase tracking-wider rounded-full mb-6">
          {player.position || 'Player'}
        </span>

        {/* Stats Grid */}
        {player.stats && (
          <div className="w-full grid grid-cols-3 gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{player.stats.appearances || 0}</div>
              <div className="text-[10px] uppercase text-gray-500 font-bold">Apps</div>
            </div>
            <div className="text-center border-l border-gray-100 dark:border-gray-700">
              <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{player.stats.goals || 0}</div>
              <div className="text-[10px] uppercase text-gray-500 font-bold">Goals</div>
            </div>
            <div className="text-center border-l border-gray-100 dark:border-gray-700">
              <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{player.stats.assists || 0}</div>
              <div className="text-[10px] uppercase text-gray-500 font-bold">Assists</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function SquadPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const sdk = getServerSDK(tenant);

  let squad: any[] = [];
  try {
    squad = await sdk.getSquad().catch(() => []);
  } catch (e) {
    console.error("Failed to fetch squad");
  }

  // Mock data if empty (for demo purposes if API returns nothing in dev)
  if (squad.length === 0) {
    squad = [
      { id: '1', name: 'James Smith', number: 9, position: 'Forward', stats: { appearances: 12, goals: 8, assists: 3 } },
      { id: '2', name: 'David Jones', number: 4, position: 'Defender', stats: { appearances: 11, goals: 1, assists: 0 } },
      { id: '3', name: 'Alex Johnson', number: 10, position: 'Midfielder', stats: { appearances: 12, goals: 4, assists: 7 } },
      { id: '4', name: 'Ben Wilson', number: 1, position: 'Goalkeeper', stats: { appearances: 12, goals: 0, assists: 1 } },
    ];
  }

  const goalkeepers = squad.filter((p: any) => p.position?.toLowerCase().includes('keeper'));
  const defenders = squad.filter((p: any) => p.position?.toLowerCase().includes('defender') || p.position?.toLowerCase().includes('back'));
  const midfielders = squad.filter((p: any) => p.position?.toLowerCase().includes('midfield'));
  const forwards = squad.filter((p: any) => p.position?.toLowerCase().includes('forward') || p.position?.toLowerCase().includes('striker'));
  const others = squad.filter((p: any) => !goalkeepers.includes(p) && !defenders.includes(p) && !midfielders.includes(p) && !forwards.includes(p));

  const renderSection = (title: string, players: any[]) => {
    if (players.length === 0) return null;
    return (
      <div className="mb-12">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-gray-400 mb-6 border-b border-gray-200 dark:border-gray-800 pb-2">
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {players.map((p: any) => <PlayerCard key={p.id} player={p} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pb-20">
      {/* Hero Section */}
      <div className="relative bg-gray-900 text-white py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522778119026-d647f0565c6a?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />

        <div className="container relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4">
            Meet the <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-yellow-500">Squad</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto font-medium">
            The talented individuals representing our badge this season.
          </p>
        </div>
      </div>

      <div className="container px-6 -mt-10 relative z-20">
        {/* If we have categorized players, show sections. Otherwise just a grid. */}
        {(goalkeepers.length > 0 || defenders.length > 0) ? (
          <>
            {renderSection('Goalkeepers', goalkeepers)}
            {renderSection('Defenders', defenders)}
            {renderSection('Midfielders', midfielders)}
            {renderSection('Forwards', forwards)}
            {renderSection('Squad', others)}
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {squad.map((p: any) => <PlayerCard key={p.id} player={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
