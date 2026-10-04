import { getClubInfo } from '@/lib/club';
import { ClubBadge } from '@/components/ui/Brand';
import { ClubLoginForm } from './ClubLoginForm';

export async function generateMetadata({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const club = await getClubInfo(tenant);
  return { title: `Log in | ${club.name}` };
}

/** Log in to one club (shown inside the club's own layout). */
export default async function ClubLoginPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const club = await getClubInfo(tenant);

  return (
    <div className="hex-grid min-h-full">
      <div className="max-w-md mx-auto px-4 py-10 sm:py-16">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <ClubBadge name={club.name} badgeUrl={club.badgeUrl} size={72} />
          </div>
          <p className="eyebrow mb-2">{club.name}</p>
          <h1 className="text-4xl sm:text-5xl italic text-foreground">Log in</h1>
          <p className="mt-3 text-muted">See fixtures, results and team news for your club.</p>
        </div>
        <ClubLoginForm tenant={tenant} />
      </div>
    </div>
  );
}
