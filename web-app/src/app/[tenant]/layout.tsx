import { ThemeProvider } from '@/components/ThemeProvider';
import { getClubInfo } from '@/lib/club';
import { PremiumLayoutWrapper } from './PremiumLayoutWrapper';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata({ params }: TenantLayoutProps) {
  const { tenant } = await params;
  const club = await getClubInfo(tenant);
  return {
    title: `${club.name} | Boost Huddle`,
  };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant } = await params;
  const club = await getClubInfo(tenant);

  return (
    <ThemeProvider tenant={tenant}>
      <PremiumLayoutWrapper tenant={tenant} tenantName={club.name}>
        {children}
      </PremiumLayoutWrapper>
    </ThemeProvider>
  );
}
