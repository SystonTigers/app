import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { Icon, type IconName } from '@/components/ui/Icon';

export const metadata = {
  title: 'Boost Huddle – run your grassroots football club in one place',
  description:
    'Fixtures, results, league table, squad, news and match videos for grassroots football clubs. Free for 14 days, no card needed.',
};

const features: { icon: IconName; title: string; body: string }[] = [
  { icon: 'whistle', title: 'Live Match Centre', body: 'Tap goals, cards and subs from the touchline. Parents who can’t make it follow the score live, with alerts on their phone.' },
  { icon: 'image', title: 'Posts that make themselves', body: 'Goals, results and team news become match graphics in your club colours and post to your club feed, and to Facebook and Instagram once you connect them.' },
  { icon: 'table', title: 'Fixtures, results & table', body: 'Paste in your FA Full-Time emails and the fixtures are added for you. Results and the league table update after the final whistle.' },
  { icon: 'video', title: 'Match highlights', body: 'Mark the big moments during the game and every one becomes a clip of your match video, ready to watch or share.' },
  { icon: 'shield', title: 'Safe with children’s photos', body: 'Parents say yes or no to photos and video in the app. Nobody appears publicly without a yes.' },
  { icon: 'phone', title: 'An app for every family', body: 'Players and parents add your club app to their phone in one tap. No app store, nothing to pay.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        <section className="hex-grid">
          <div className="container max-w-4xl pt-12 sm:pt-20 pb-16 sm:pb-24 text-center">
            <p className="eyebrow mb-4">For grassroots football clubs</p>
            <h1 className="text-5xl md:text-7xl italic leading-[0.95] mb-6">
              Run your grassroots club <span className="text-brand">in one place</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted mb-10 max-w-2xl mx-auto">
              Live scores, fixtures, the league table, match highlights and social posts for your club, with no spreadsheets and no chasing group chats.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/create-team" className="btn btn-primary">
                Start your free trial <Icon name="arrowRight" className="w-4 h-4" />
              </Link>
              <Link href="/pricing" className="btn btn-secondary">See pricing</Link>
            </div>
            <p className="mt-4 text-sm text-muted">Free for 14 days. No card needed. Set up in 2 minutes.</p>
          </div>
        </section>

        <section aria-labelledby="features-title" className="container pb-20 sm:pb-24">
          <h2 id="features-title" className="sr-only">What you get</h2>
          <ul className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <li key={f.title} className="card">
                <span className="w-11 h-11 mb-4 hexagon bg-brand/15 text-brand flex items-center justify-center">
                  <Icon name={f.icon} className="w-5 h-5" />
                </span>
                <h3 className="font-display text-xl uppercase mb-2">{f.title}</h3>
                <p className="text-muted">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="container max-w-4xl pb-20 sm:pb-24 text-center">
          <h2 className="text-4xl italic mb-3">Ready for kick-off?</h2>
          <p className="text-muted mb-6">Set up your club page and app today. Your families can join tonight.</p>
          <Link href="/create-team" className="btn btn-primary">Create your club</Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
