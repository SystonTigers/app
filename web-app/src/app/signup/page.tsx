// app/signup/page.tsx
// Multi-step signup wizard

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Step = 1 | 2 | 3 | 4;
type Plan = 'starter' | 'pro';

interface SignupData {
  clubName: string;
  clubSlug: string;
  email: string;
  plan: Plan;
  promoCode: string;
  primaryColor: string;
  secondaryColor: string;
  webhookUrl: string;
  webhookSecret: string;
}

export default function SignupPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jwt, setJwt] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [discount, setDiscount] = useState(0);

  const [formData, setFormData] = useState<SignupData>({
    clubName: '',
    clubSlug: '',
    email: '',
    plan: (searchParams?.get('plan') as Plan) || 'starter',
    promoCode: '',
    primaryColor: '#FFD700',
    secondaryColor: '#000000',
    webhookUrl: '',
    webhookSecret: '',
  });

  const updateField = (field: keyof SignupData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  // Step 1: Create account
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://syston-postbus.team-platform-2025.workers.dev/public/signup/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubName: formData.clubName,
          clubSlug: formData.clubSlug,
          email: formData.email,
          plan: formData.plan,
          promoCode: formData.promoCode || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Signup failed');
      }

      setJwt(data.jwt);
      setTenantId(data.tenant.id);
      setDiscount(data.discount);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Brand colors
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://syston-postbus.team-platform-2025.workers.dev/public/signup/brand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Brand update failed');
      }

      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to update brand');
    } finally {
      setLoading(false);
    }
  };

  // Step 3a: Make.com setup (Starter)
  const handleStep3StarterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://syston-postbus.team-platform-2025.workers.dev/public/signup/starter/make', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          webhookUrl: formData.webhookUrl,
          webhookSecret: formData.webhookSecret,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Make.com setup failed');
      }

      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to setup Make.com');
    } finally {
      setLoading(false);
    }
  };

  // Step 3b: Pro confirmation
  const handleStep3ProSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://syston-postbus.team-platform-2025.workers.dev/public/signup/pro/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Pro confirmation failed');
      }

      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm Pro plan');
    } finally {
      setLoading(false);
    }
  };

  // Generate slug from club name
  useEffect(() => {
    if (step === 1 && formData.clubName && !formData.clubSlug) {
      const slug = formData.clubName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      updateField('clubSlug', slug);
    }
  }, [formData.clubName]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex items-center ${s < 4 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    s <= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      s < step ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Account</span>
            <span>Branding</span>
            <span>Data Source</span>
            <span>Complete</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 1: Account Creation */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Create Your Account
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Club Name
                  </label>
                  <input
                    type="text"
                    value={formData.clubName}
                    onChange={(e) => updateField('clubName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Syston Tigers U16"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={formData.clubSlug}
                    onChange={(e) => updateField('clubSlug', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="syston-tigers"
                    pattern="[a-z0-9-]+"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Your app will be at: yourapp.com/{formData.clubSlug}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="owner@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => updateField('plan', 'starter')}
                      className={`p-4 border-2 rounded-lg text-left ${
                        formData.plan === 'starter'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">Starter</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">£14.99</div>
                      <div className="text-xs text-gray-600 mt-1">1,000 actions/mo</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('plan', 'pro')}
                      className={`p-4 border-2 rounded-lg text-left ${
                        formData.plan === 'pro'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">Pro</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">£29.99</div>
                      <div className="text-xs text-gray-600 mt-1">Unlimited actions</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Promo Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.promoCode}
                    onChange={(e) => updateField('promoCode', e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="LAUNCH50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Continue'}
              </button>

              <p className="mt-4 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          )}

          {/* Step 2: Brand Colors */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit}>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Customize Your Branding
              </h2>

              {discount > 0 && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-semibold">
                    Promo code applied! {discount}% off
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => updateField('primaryColor', e.target.value)}
                      className="h-12 w-20 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => updateField('primaryColor', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => updateField('secondaryColor', e.target.value)}
                      className="h-12 w-20 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => updateField('secondaryColor', e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="border-2 border-gray-200 rounded-lg p-6">
                  <p className="text-sm font-medium text-gray-700 mb-4">Preview</p>
                  <div
                    className="rounded-lg p-6"
                    style={{ backgroundColor: formData.primaryColor }}
                  >
                    <h3 style={{ color: formData.secondaryColor }} className="text-2xl font-bold">
                      {formData.clubName}
                    </h3>
                    <p style={{ color: formData.secondaryColor }} className="mt-2">
                      Next Match: Saturday 2:00 PM
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Data Source Setup */}
          {step === 3 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {formData.plan === 'starter' ? 'Connect Make.com' : 'Confirm Setup'}
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {formData.plan === 'starter' ? (
                <form onSubmit={handleStep3StarterSubmit}>
                  <div className="mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-blue-800">
                        <strong>Setup Instructions:</strong>
                      </p>
                      <ol className="mt-2 text-sm text-blue-700 list-decimal list-inside space-y-1">
                        <li>Create a new scenario in Make.com</li>
                        <li>Add a Webhook trigger and copy the URL below</li>
                        <li>Generate a webhook secret (min 16 characters)</li>
                        <li>Connect your data sources (FA website, spreadsheet, etc.)</li>
                      </ol>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Webhook URL
                        </label>
                        <input
                          type="url"
                          value={formData.webhookUrl}
                          onChange={(e) => updateField('webhookUrl', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="https://hook.make.com/..."
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Webhook Secret
                        </label>
                        <input
                          type="text"
                          value={formData.webhookSecret}
                          onChange={(e) => updateField('webhookSecret', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Min 16 characters"
                          minLength={16}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Connecting...' : 'Complete Setup'}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-blue-900 mb-2">Pro Plan Benefits</h3>
                    <ul className="space-y-2 text-sm text-blue-800">
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Cloudflare-native automations deployed to your account
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Apps Script automatically deployed and configured
                      </li>
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        No manual setup required - we handle everything
                      </li>
                    </ul>
                  </div>

                  <p className="text-gray-600 mb-6">
                    Click Complete to finish your Pro plan setup. Our team will deploy your automations within 24 hours.
                  </p>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleStep3ProSubmit}
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Confirming...' : 'Complete Setup'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto h-16 w-16 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                All Set! 🎉
              </h2>

              <p className="text-lg text-gray-600 mb-8">
                Your account has been created successfully. <br />
                {formData.plan === 'starter'
                  ? 'Your Make.com automation is now connected.'
                  : 'We\'ll deploy your Pro automations within 24 hours.'}
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-left">
                <h3 className="font-semibold text-blue-900 mb-3">Next Steps:</h3>
                <ol className="space-y-2 text-sm text-blue-800 list-decimal list-inside">
                  <li>Check your email for login credentials</li>
                  <li>Download the mobile app (iOS & Android)</li>
                  <li>Visit your dashboard to complete profile setup</li>
                  <li>Invite your team members</li>
                </ol>
              </div>

              <Link
                href={`/${formData.clubSlug}`}
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
