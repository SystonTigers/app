import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/ui/AuthShell';
import { Icon } from '@/components/ui/Icon';
import { appSignUpLink } from '@/lib/app-link';

/**
 * Players, parents and supporters make their account in the club app, inside
 * their club (so they get the right role and the consent questions). With
 * ?club=<slug> this goes straight there; otherwise it explains how.
 */
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  const { club } = await searchParams;
  const slug = club?.trim().toLowerCase();
  if (slug && /^[a-z0-9-]{1,60}$/.test(slug)) redirect(appSignUpLink(slug));

  return (
    <AuthShell
      title="Join your club"
      subtitle="Players, parents and supporters join in their club's app."
      footer={
        <>
          <p>Already have an account? <Link href="/login" className="text-brand font-bold hover:underline">Log in</Link></p>
          <p>Running a club? <Link href="/create-team" className="text-brand font-bold hover:underline">Start a free trial</Link></p>
        </>
      }
    >
      <ol className="space-y-4 mb-6">
        {[
          { icon: 'link' as const, text: 'Open the link your club sent you, or find your club in the app.' },
          { icon: 'userPlus' as const, text: "Create your account there and choose whether you're a parent, player or supporter." },
          { icon: 'shield' as const, text: 'Parents: enter the code from the manager to link your child.' },
        ].map((step) => (
          <li key={step.text} className="flex gap-3 items-start">
            <span className="w-9 h-9 shrink-0 hexagon bg-brand/15 text-brand flex items-center justify-center">
              <Icon name={step.icon} className="w-4 h-4" />
            </span>
            <span className="text-foreground pt-1.5">{step.text}</span>
          </li>
        ))}
      </ol>
      <a href={appSignUpLink()} className="btn btn-primary w-full">
        Find your club <Icon name="arrowRight" className="w-4 h-4" />
      </a>
    </AuthShell>
  );
}
