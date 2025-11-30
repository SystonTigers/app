import Link from 'next/link';
import { ThemeProvider } from '@/components/ThemeProvider';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata({ params }: TenantLayoutProps) {
  const { tenant } = await params;
  const name = tenant.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${name} | Team Platform`,
  };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant } = await params;

  // Provide default tenant name if undefined
  const tenantName = tenant
    ? tenant.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Team Platform';

  return (
    <ThemeProvider tenant={tenant || 'default'}>
      <div className="min-h-screen flex flex-col">
        {/* Header/Nav */}
        <header className="bg-[var(--surface)] border-b border-border py-4">
          <nav className="container">
            <div className="flex items-center justify-between">
              <Link
                href={`/${tenant || ''}`}
                className="text-2xl font-bold text-brand no-underline"
              >
                {tenantName}
              </Link>

              <div className="flex gap-6">
                <Link href={`/${tenant}`} className="hover:text-brand transition-colors">Home</Link>
                <Link href={`/${tenant}/calendar`} className="hover:text-brand transition-colors">Calendar</Link>
                <Link href={`/${tenant}/videos`} className="hover:text-brand transition-colors">Videos</Link>
                <Link href={`/${tenant}/fixtures`} className="hover:text-brand transition-colors">Fixtures</Link>
                <Link href={`/${tenant}/results`} className="hover:text-brand transition-colors">Results</Link>
                <Link href={`/${tenant}/table`} className="hover:text-brand transition-colors">Table</Link>
                <Link href={`/${tenant}/squad`} className="hover:text-brand transition-colors">Squad</Link>
                <Link href={`/${tenant}/stats`} className="hover:text-brand transition-colors">Stats</Link>
              </div>
            </div>
          </nav>
        </header>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-[var(--surface)] border-t border-border py-8 mt-12">
          <div className="container flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} {tenantName}. Powered by Team Platform</p>
            </div>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-brand transition-colors">Twitter</a>
              <a href="#" className="text-muted-foreground hover:text-brand transition-colors">Instagram</a>
              <a href="#" className="text-muted-foreground hover:text-brand transition-colors">Facebook</a>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
