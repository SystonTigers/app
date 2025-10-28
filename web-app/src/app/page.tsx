import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Team Platform</h1>
      <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Multi-tenant team management for grassroots sports
      </p>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '1rem' }}>Demo Tenants</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Link href="/demo" className="btn btn-primary">
            View Demo Club
          </Link>
          <Link href="/syston-tigers" className="btn btn-outline">
            Syston Tigers (Example)
          </Link>
        </div>
      </div>

      <div style={{ marginTop: '3rem' }}>
        <Link href="/admin/onboard" className="btn btn-secondary">
          Set Up Your Club
        </Link>
      </div>
    </div>
  );
}
