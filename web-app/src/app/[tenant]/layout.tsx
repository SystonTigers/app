import { notFound } from 'next/navigation';
import { findClub } from '@/lib/club';
import { brandCss } from '@/lib/brand';
import { PremiumLayoutWrapper } from './PremiumLayoutWrapper';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata({ params }: TenantLayoutProps) {
  const { tenant } = await params;
  const club = await findClub(tenant);
  return {
    title: club ? `${club.name} | Boost Huddle` : 'Club not found | Boost Huddle',
  };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant } = await params;
  const club = await findClub(tenant);
  if (!club) notFound();

  return (
    <>
      {/* The club's colour, set on the server so the page never flashes the default */}
      <style dangerouslySetInnerHTML={{ __html: brandCss(club.primaryColor) }} />
      <PremiumLayoutWrapper tenant={tenant} tenantName={club.name} badgeUrl={club.badgeUrl}>
        {children}
      </PremiumLayoutWrapper>
    </>
  );
}
