import { getServerSDK } from '@/lib/sdk';

export default async function StatsPage({ params }: { params: { tenant: string } }) {
  const sdk = getServerSDK(params.tenant);

  const [teamStats, topScorers] = await Promise.allSettled([
    sdk.getTeamStats().catch(() => null),
    sdk.getTopScorers(10).catch(() => []),
  ]);

  const stats = teamStats.status === 'fulfilled' ? teamStats.value : null;
  const scorers = topScorers.status === 'fulfilled' ? topScorers.value : [];

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-xl)' }}>Statistics</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
        {/* Team Stats */}
        <section className="card">
          <h2 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--brand)' }}>Team Stats</h2>
          {stats ? (
            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <span>Played:</span>
                <strong>{stats.played}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <span>Won:</span>
                <strong style={{ color: 'var(--success)' }}>{stats.won}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <span>Drawn:</span>
                <strong>{stats.drawn}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <span>Lost:</span>
                <strong style={{ color: 'var(--error)' }}>{stats.lost}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <span>Goals For:</span>
                <strong>{stats.goalsFor}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <span>Goals Against:</span>
                <strong>{stats.goalsAgainst}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <span>Clean Sheets:</span>
                <strong>{stats.cleanSheets}</strong>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No stats available</p>
          )}
        </section>

        {/* Top Scorers */}
        <section className="card">
          <h2 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--brand)' }}>Top Scorers</h2>
          {scorers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {scorers.map((player, index) => (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-md)',
                    padding: 'var(--spacing-sm)',
                    background: index === 0 ? 'var(--brand)' : 'var(--bg)',
                    color: index === 0 ? 'var(--on-brand)' : 'inherit',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: index === 0 ? 'var(--on-brand)' : 'var(--brand)',
                      color: index === 0 ? 'var(--brand)' : 'var(--on-brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>{player.name}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{player.stats?.goals || 0}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No scoring data yet</p>
          )}
        </section>
      </div>
    </div>
  );
}
