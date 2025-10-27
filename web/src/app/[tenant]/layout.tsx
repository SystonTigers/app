import Link from 'next/link';
import { ThemeProvider } from '@/components/ThemeProvider';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: { tenant: string };
}

export default function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant } = params;

  return (
    <ThemeProvider tenant={tenant}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header/Nav */}
        <header
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            padding: 'var(--spacing-md) 0',
          }}
        >
          <nav className="container">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Link
                href={`/${tenant}`}
                style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--brand)' }}
              >
                {tenant.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </Link>

              <div style={{ display: 'flex', gap: 'var(--spacing-lg)' }}>
                <Link href={`/${tenant}`}>Home</Link>
                <Link href={`/${tenant}/fixtures`}>Fixtures</Link>
                <Link href={`/${tenant}/results`}>Results</Link>
                <Link href={`/${tenant}/table`}>Table</Link>
                <Link href={`/${tenant}/squad`}>Squad</Link>
                <Link href={`/${tenant}/stats`}>Stats</Link>
              </div>
            </div>
          </nav>
        </header>

        {/* Main content */}
        <main style={{ flex: 1 }}>{children}</main>

        {/* Footer */}
        <footer
          style={{
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            padding: 'var(--spacing-xl) 0',
            marginTop: 'var(--spacing-2xl)',
          }}
        >
          <div className="container" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Powered by Team Platform</p>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
