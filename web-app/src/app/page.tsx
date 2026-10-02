import Link from 'next/link';
import { APP_URL } from '@/lib/app-link';

export const metadata = {
  title: 'Boost Huddle – run your grassroots football club in one place',
  description:
    'Fixtures, results, league table, squad, news and match videos for grassroots football clubs. Free for 14 days, no card needed.',
};

const LEGAL_BASE = 'https://boosthuddle-legal.pages.dev';

const features = [
  { title: 'Live Match Centre', body: 'Tap goals, cards and subs from the touchline. Parents who can’t make it follow the score live, with alerts on their phone.' },
  { title: 'Posts that make themselves', body: 'Goals, results and team news become match graphics in your club colours and post to your club feed, and to Facebook and Instagram once you connect them.' },
  { title: 'Fixtures, results & table', body: 'Paste in your FA Full-Time emails and the fixtures are added for you. Results and the league table update after the final whistle.' },
  { title: 'Match highlights', body: 'Mark the big moments during the game and every one becomes a clip of your match video, ready to watch or share.' },
  { title: 'Safe with children’s photos', body: 'Parents say yes or no to photos and video in the app. Nobody appears publicly without a yes.' },
  { title: 'An app for every family', body: 'Players and parents add your club app to their phone in one tap. No app store, nothing to pay.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0B0D0F] text-white">
      <header className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <span className="text-2xl font-black italic uppercase">Boost Huddle</span>
        <nav className="flex items-center gap-5 text-sm font-bold">
          <a href={APP_URL} className="text-gray-300 hover:text-white">Open the app</a>
          <Link href="/pricing" className="text-gray-300 hover:text-white">Pricing</Link>
          <Link href="/login" className="text-gray-300 hover:text-white">Log in</Link>
          <Link href="/create-team" className="px-4 py-2 bg-brand text-black chamfer-sm hover:bg-white">Start free trial</Link>
        </nav>
      </header>

      <main>
        <section className="max-w-4xl mx-auto px-4 pt-16 pb-20 text-center">
          <h1 className="text-5xl md:text-6xl font-black italic uppercase leading-tight mb-6">
            Run your grassroots club <span className="text-brand">in one place</span>
          </h1>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Live scores, fixtures, the league table, match highlights and social posts for your club, with no spreadsheets and no chasing group chats.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create-team" className="px-8 py-4 bg-brand text-black font-black uppercase italic tracking-wider chamfer-sm hover:bg-white">
              Start your free trial
            </Link>
            <Link href="/pricing" className="px-8 py-4 border border-gray-700 font-bold uppercase tracking-wider chamfer-sm hover:border-brand">
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">Free for 14 days. No card needed. Set up in 2 minutes.</p>
        </section>

        <section className="max-w-6xl mx-auto px-4 pb-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-gray-900/60 border border-gray-800 chamfer-lg p-6">
              <h2 className="text-lg font-black uppercase mb-2">{f.title}</h2>
              <p className="text-gray-400">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="max-w-4xl mx-auto px-4 pb-24 text-center">
          <h2 className="text-3xl font-black uppercase italic mb-4">Ready for kick-off?</h2>
          <Link href="/create-team" className="inline-block px-8 py-4 bg-brand text-black font-black uppercase italic chamfer-sm hover:bg-white">
            Create your club
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-500 space-x-6">
        <a href={`${LEGAL_BASE}/terms`} className="hover:text-white">Terms</a>
        <a href={`${LEGAL_BASE}/privacy`} className="hover:text-white">Privacy</a>
        <Link href="/login" className="hover:text-white">Log in</Link>
      </footer>
    </div>
  );
}
