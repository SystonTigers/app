import { getServerSDK } from '@/lib/sdk';

export default async function FixturesPage({ params }: { params: { tenant: string } }) {
  const sdk = getServerSDK(params.tenant);
  const fixtures = await sdk.listFixtures().catch(() => []);

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-xl)' }}>Upcoming Fixtures</h1>

      {fixtures.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
          {fixtures.map((fixture: any) => (
            <div key={fixture.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--spacing-sm)' }}>
                    {fixture.homeTeam} vs {fixture.awayTeam}
                  </h3>
                  {fixture.competition && (
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: 'var(--brand)',
                        color: 'var(--on-brand)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                      }}
                    >
                      {fixture.competition}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600' }}>{new Date(fixture.date).toLocaleDateString()}</div>
                  {fixture.time && <div style={{ color: 'var(--text-muted)' }}>{fixture.time}</div>}
                  {fixture.venue && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{fixture.venue}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No upcoming fixtures</p>
        </div>
      )}
    </div>
  );
}
