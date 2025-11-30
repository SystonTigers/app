import { getServerSDK } from '@/lib/sdk';

export default async function TablePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const sdk = getServerSDK(tenant);
  const table = await sdk.getLeagueTable().catch(() => []);

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-2xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>League Table</h1>
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            textDecoration: 'none',
            color: 'var(--text)',
            fontWeight: '500'
          }}
        >
          Official League Site &rarr;
        </a>
      </div>

      {table.length > 0 ? (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--brand)' }}>
                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Pos</th>
                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Team</th>
                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>P</th>
                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>W</th>
                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>D</th>
                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>L</th>
                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>GF</th>
                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>GA</th>
                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>GD</th>
                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontWeight: 'bold' }}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row: any, index: number) => (
                <tr
                  key={row.position}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: index % 2 === 0 ? 'transparent' : 'var(--bg)',
                  }}
                >
                  <td style={{ padding: 'var(--spacing-sm)', fontWeight: '600' }}>{row.position}</td>
                  <td style={{ padding: 'var(--spacing-sm)', fontWeight: '600' }}>{row.team}</td>
                  <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{row.played}</td>
                  <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{row.won}</td>
                  <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{row.drawn}</td>
                  <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{row.lost}</td>
                  <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{row.goalsFor}</td>
                  <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{row.goalsAgainst}</td>
                  <td
                    style={{
                      padding: 'var(--spacing-sm)',
                      textAlign: 'center',
                      color: row.goalDifference > 0 ? 'var(--success)' : row.goalDifference < 0 ? 'var(--error)' : 'inherit',
                    }}
                  >
                    {row.goalDifference > 0 ? '+' : ''}
                    {row.goalDifference}
                  </td>
                  <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontWeight: 'bold' }}>
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No table data available</p>
        </div>
      )}
    </div>
  );
}
