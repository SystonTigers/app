// app/pricing/page.tsx
// Plans and prices. Keep in step with PLANS in backend/src/routes/billing.ts.

import Link from 'next/link';

export const metadata = {
  title: 'Pricing – Boost Huddle',
  description: 'Two simple plans for grassroots football clubs. Free for 14 days, no card needed.',
};

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '£14.99',
    blurb: 'Everything a grassroots team needs on match day and in between.',
    features: [
      'Club app for players and parents (no app store)',
      'Live Match Centre with scores, cards and subs',
      'Match alerts for families who can’t be there',
      'Automatic match graphics and Facebook & Instagram posts',
      'Fixtures, results and league table (FA email import)',
      'Match highlights from your match video',
      'Photo & video consent from parents',
      'Your club website in your colours and badge',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '£29.99',
    blurb: 'For clubs that want more help and deeper numbers.',
    features: ['Everything in Starter', 'Elite match graphics with no Boost Huddle credit', 'Priority support', 'Advanced analytics'],
    popular: true,
  },
];

const faqs = [
  { q: 'Do I need a card to try it?', a: 'No. Every club gets 14 days free with everything switched on. We’ll ask before charging anything.' },
  { q: 'Can I switch plans later?', a: 'Yes. Move between Starter and Pro at any time from Billing on your club dashboard.' },
  { q: 'Do parents and players pay?', a: 'No. The club app is free for everyone at the club. Families add it to their phone in one tap.' },
  { q: 'Is it safe for children’s photos?', a: 'Yes. A child’s photo is only ever shown publicly after their parent says yes in the app, and staff are warned before sharing video.' },
  { q: 'Can I cancel any time?', a: 'Yes. There’s no contract. Cancel from Billing and you won’t be charged again.' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0B0D0F] text-white">
      <header className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black italic uppercase no-underline text-white">Boost Huddle</Link>
        <nav className="flex items-center gap-5 text-sm font-bold">
          <Link href="/login" className="text-gray-300 hover:text-white">Log in</Link>
          <Link href="/create-team" className="px-4 py-2 bg-brand text-black chamfer-sm hover:bg-white">Start free trial</Link>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-24">
        <section className="text-center pt-10 pb-12">
          <h1 className="text-4xl md:text-5xl font-black italic uppercase">Simple pricing</h1>
          <p className="mt-4 text-lg text-gray-300">One price per club. Free for 14 days, no card needed.</p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.id} className={`relative bg-gray-900/60 border chamfer-lg p-8 flex flex-col ${plan.popular ? 'border-brand' : 'border-gray-800'}`}>
              {plan.popular ? (
                <span className="absolute -top-3 right-6 bg-brand text-black text-xs font-black uppercase tracking-wider px-3 py-1 chamfer-sm">Most help</span>
              ) : null}
              <h2 className="text-2xl font-black uppercase">{plan.name}</h2>
              <p className="mt-2 text-gray-400">{plan.blurb}</p>
              <p className="mt-6">
                <span className="text-5xl font-black">{plan.price}</span>
                <span className="ml-2 text-gray-400">/month</span>
              </p>
              <ul className="mt-8 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-3 text-gray-200">
                    <span className="text-brand font-black" aria-hidden>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/create-team"
                className={`mt-8 block text-center py-3 font-black uppercase italic tracking-wider chamfer-sm ${plan.popular ? 'bg-brand text-black hover:bg-white' : 'border border-gray-700 hover:border-brand'}`}
              >
                Start free trial
              </Link>
            </div>
          ))}
        </section>

        <section className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-black uppercase text-center mb-8">Questions</h2>
          <div className="space-y-6">
            {faqs.map((f) => (
              <div key={f.q} className="border-b border-gray-800 pb-6">
                <h3 className="font-bold text-lg">{f.q}</h3>
                <p className="mt-2 text-gray-400">{f.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
