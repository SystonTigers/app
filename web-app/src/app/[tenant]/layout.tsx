import { ThemeProvider } from '@/components/ThemeProvider';
import { PremiumLayoutWrapper } from './PremiumLayoutWrapper';

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
      <PremiumLayoutWrapper tenant={tenant || 'default'} tenantName={tenantName}>
        {children}
      </PremiumLayoutWrapper>
    </ThemeProvider>
  );
}
