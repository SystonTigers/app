// app/pricing/page.tsx
// Plans and prices. Keep in step with PLANS in backend/src/routes/billing.ts.

import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/SiteHeader';
import { Icon } from '@/components/ui/Icon';

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
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="container max-w-5xl pb-20 sm:pb-24">
        <section className="text-center pt-8 sm:pt-12 pb-10 sm:pb-12">
          <p className="eyebrow mb-3">Pricing</p>
          <h1 className="text-5xl md:text-6xl italic">Simple pricing</h1>
          <p className="mt-4 text-lg text-muted">One price per club. Free for 14 days, no card needed.</p>
        </section>

        <section aria-label="Plans" className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.id} className={`card p-6 sm:p-8 flex flex-col ${plan.popular ? 'border-brand' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-3xl uppercase">{plan.name}</h2>
                {plan.popular ? (
                  <span className="shrink-0 bg-brand text-brand-foreground text-xs font-bold uppercase tracking-wider px-3 py-1 chamfer-sm">Most help</span>
                ) : null}
              </div>
              <p className="mt-2 text-muted">{plan.blurb}</p>
              <p className="mt-6">
                <span className="font-display text-6xl font-extrabold">{plan.price}</span>
                <span className="ml-2 text-muted">a month</span>
              </p>
              <ul className="mt-8 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <Icon name="check" className="w-5 h-5 mt-0.5 shrink-0 text-brand" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/create-team" className={`btn mt-8 w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}>
                Start free trial
              </Link>
            </div>
          ))}
        </section>

        <section aria-labelledby="faq-title" className="mt-16 sm:mt-20 max-w-3xl mx-auto">
          <h2 id="faq-title" className="text-4xl italic text-center mb-8">Questions</h2>
          <dl className="space-y-6">
            {faqs.map((f) => (
              <div key={f.q} className="border-b border-border pb-6">
                <dt className="font-bold text-lg">{f.q}</dt>
                <dd className="mt-2 text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
