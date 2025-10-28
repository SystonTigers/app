// app/pricing/page.tsx
// Pricing page showing Starter vs Pro plans

import Link from 'next/link';

export const metadata = {
  title: 'Pricing - Team Platform',
  description: 'Choose the perfect plan for your team',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Team Platform</h1>
            <Link
              href="/signup"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Sign up →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Choose the plan that fits your team. No hidden fees.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Starter Plan */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900">Starter</h3>
              <p className="mt-2 text-gray-600">Perfect for small teams getting started</p>
              <div className="mt-6 flex items-baseline">
                <span className="text-5xl font-extrabold text-gray-900">£14.99</span>
                <span className="ml-2 text-xl text-gray-500">/month</span>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-gray-700">
                  <strong>1,000 automation actions/month</strong>
                </span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-gray-700">Make.com integration</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-gray-700">Mobile app (iOS & Android)</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-gray-700">Web dashboard</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-gray-700">Custom branding (colors, badge)</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-gray-700">Fixtures, results, & league tables</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-gray-700">Live match updates</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-gray-700">14-day free trial</span>
              </li>
            </ul>

            <Link
              href="/signup?plan=starter"
              className="block w-full bg-blue-600 text-white text-center py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl border-2 border-blue-500 p-8 relative">
            {/* Popular Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-1 rounded-full">
                POPULAR
              </span>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white">Pro</h3>
              <p className="mt-2 text-blue-100">For teams that want unlimited automation</p>
              <div className="mt-6 flex items-baseline">
                <span className="text-5xl font-extrabold text-white">£29.99</span>
                <span className="ml-2 text-xl text-blue-100">/month</span>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="h-6 w-6 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-white">
                  <strong>Unlimited automation actions</strong>
                </span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-white">
                  <strong>Cloudflare-native automations</strong>
                </span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-white">Apps Script deployment</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-white">Everything in Starter, plus:</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-white">Priority support</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-white">Advanced analytics</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-white">99.9% uptime SLA</span>
              </li>
              <li className="flex items-start">
                <svg className="h-6 w-6 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="ml-3 text-white">14-day free trial</span>
              </li>
            </ul>

            <Link
              href="/signup?plan=pro"
              className="block w-full bg-white text-blue-600 text-center py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h3>
          <div className="max-w-3xl mx-auto space-y-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                What counts as an "automation action"?
              </h4>
              <p className="text-gray-600">
                An automation action is any data sync operation performed by your Make.com workflow or our Cloudflare automation.
                Examples include updating fixtures, syncing results, posting match updates, or sending notifications.
                Pro plan users get unlimited actions.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Can I upgrade from Starter to Pro?
              </h4>
              <p className="text-gray-600">
                Yes! You can upgrade at any time from your dashboard. Your billing will be prorated automatically.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                What happens if I exceed 1,000 actions on Starter?
              </h4>
              <p className="text-gray-600">
                Automations will pause until the next month, or you can upgrade to Pro for unlimited actions.
                You'll receive email alerts at 80% and 100% usage.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer discounts for multiple teams?
              </h4>
              <p className="text-gray-600">
                Yes! Contact us for volume pricing if you manage multiple teams.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h4>
              <p className="text-gray-600">
                Absolutely. No long-term contracts. Cancel anytime from your dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h3>
          <p className="text-gray-600 mb-8">
            Join teams already using Team Platform to engage their fans.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
          >
            Start Your Free Trial
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-400 text-sm">
            © 2025 Team Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
