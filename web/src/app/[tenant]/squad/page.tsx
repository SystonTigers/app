import { getServerSDK } from '@/lib/sdk';

export default async function SquadPage({ params }: { params: { tenant: string } }) {
  const sdk = getServerSDK(params.tenant);
  const squad = await sdk.getSquad().catch(() => []);

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-xl)' }}>Squad</h1>

      {squad.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
          {squad.map((player) => (
            <div key={player.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
                {player.number && (
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--brand)',
                      color: 'var(--on-brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '1.25rem',
                    }}
                  >
                    {player.number}
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{player.name}</h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{player.position}</div>
                </div>
              </div>

              {player.stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)', fontSize: '0.875rem' }}>
                  {player.stats.appearances !== undefined && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Apps:</span> {player.stats.appearances}
                    </div>
                  )}
                  {player.stats.goals !== undefined && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Goals:</span> {player.stats.goals}
                    </div>
                  )}
                  {player.stats.assists !== undefined && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Assists:</span> {player.stats.assists}
                    </div>
                  )}
                  {player.stats.yellowCards !== undefined && player.stats.yellowCards > 0 && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Yellow:</span> {player.stats.yellowCards}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No squad data available</p>
        </div>
      )}
    </div>
  );
}
