import { getServerSDK } from '@/lib/sdk';

export default async function ResultsPage({ params }: { params: { tenant: string } }) {
  const sdk = getServerSDK(params.tenant);
  const results = await sdk.listResults().catch(() => []);

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-xl)' }}>Results</h1>

      {results.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
          {results.map((result) => (
            <div key={result.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{result.homeTeam}</div>
                    </div>
                    <div
                      style={{
                        padding: 'var(--spacing-sm) var(--spacing-lg)',
                        background: 'var(--surface)',
                        border: '2px solid var(--brand)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 'bold',
                        fontSize: '1.5rem',
                      }}
                    >
                      {result.homeScore} - {result.awayScore}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{result.awayTeam}</div>
                    </div>
                  </div>
                  {result.scorers && result.scorers.length > 0 && (
                    <div style={{ marginTop: 'var(--spacing-sm)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      ⚽ {result.scorers.join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', marginLeft: 'var(--spacing-lg)' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {new Date(result.date).toLocaleDateString()}
                  </div>
                  {result.competition && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--brand)' }}>{result.competition}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No results yet</p>
        </div>
      )}
    </div>
  );
}
