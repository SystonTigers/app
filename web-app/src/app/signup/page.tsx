// app/signup/page.tsx
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://syston-postbus.team-platform-2025.workers.dev';

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [authStatus, setAuthStatus] = useState<'loading' | 'unauthenticated' | 'authenticated'>('loading');
  const [tenantStatus, setTenantStatus] = useState<'loading' | 'onboarding' | 'active' | 'error'>('loading');
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string | null>(null);

  // Form Data
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [setupData, setSetupData] = useState({
    clubName: '',
    clubSlug: '',
    primaryColor: '#000000', // Default black
    secondaryColor: '#ffffff' // Default white
  });

  const [slugDirty, setSlugDirty] = useState(false);

  // Check Auth on Mount
  useEffect(() => {
    const storedToken = localStorage.getItem('session_token');
    if (storedToken) {
      setToken(storedToken);
      setAuthStatus('authenticated');
      fetchTenantStatus(storedToken);
    } else {
      setAuthStatus('unauthenticated');
      setStep(1); // Registration
    }
  }, []);

  const fetchTenantStatus = async (authToken: string) => {
    try {
      setTenantStatus('loading');
      const res = await fetch(`${API_BASE}/api/v1/tenants/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();

      if (data.success && data.tenant) {
        if (data.tenant.status === 'active') {
          setTenantStatus('active');
          router.push('/dashboard');
        } else {
          setTenantStatus('onboarding');
          setStep(2); // Setup Wizard
          // Prefill
          setSetupData(prev => ({
            ...prev,
            clubName: data.tenant.name || '',
            clubSlug: data.tenant.slug || '',
            primaryColor: data.tenant.primary_color || '#000000',
            secondaryColor: data.tenant.secondary_color || '#ffffff'
          }));
        }
      } else {
        // Invalid token or tenant not found
        localStorage.removeItem('session_token');
        setAuthStatus('unauthenticated');
        setStep(1);
      }
    } catch (e) {
      console.error('Failed to fetch tenant status', e);
      setTenantStatus('error');
    }
  };

  // Step 1: Registration Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regData.password !== regData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regData.name, // Although currently handleRegisterOwner might not take name, we should add it or ignore it? Schema says email/password.
          email: regData.email,
          password: regData.password
        })
      });

      const data = await res.json();

      if (data.success) {
        // Show verification sent message
        setStep(1.5); // Intermediate state
      } else {
        setError(data.error?.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Setup Submit
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/v1/tenants/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: setupData.clubName,
          slug: setupData.clubSlug,
          primaryColor: setupData.primaryColor,
          secondaryColor: setupData.secondaryColor,
          status: 'active' // Mark as active on completion
        })
      });

      const data = await res.json();

      if (data.success) {
        // Update local session if slug changed?
        // Usually slug change doesn't invalidate token (token has ID).
        // Redirect to dashboard
        window.location.href = '/dashboard'; // Hard reload to ensure context updates
      } else {
        setError(data.error?.message || 'Setup failed');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  // Slugify helper
  const slugify = (input: string) => {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  useEffect(() => {
    if (authStatus === 'authenticated' && !slugDirty && setupData.clubName) {
      setSetupData(prev => ({ ...prev, clubSlug: slugify(prev.clubName) }));
    }
  }, [setupData.clubName, authStatus, slugDirty]);


  if (authStatus === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Verification Sent View
  if (step === 1.5) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a verification link to <strong>{regData.email}</strong>.
            Please click the link to continue your setup.
          </p>
          <p className="text-sm text-gray-500">
            Once verified, you'll be redirected to complete your club setup.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {step === 1 ? (
          // Registration Form
          <form onSubmit={handleRegister}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Create Account</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={regData.name}
                  onChange={e => setRegData({ ...regData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={regData.email}
                  onChange={e => setRegData({ ...regData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={regData.password}
                  onChange={e => setRegData({ ...regData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={regData.confirmPassword}
                  onChange={e => setRegData({ ...regData, confirmPassword: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Sign Up'}
              </button>
            </div>
            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account? <Link href="/login" className="text-indigo-600 font-medium">Log in</Link>
            </p>
          </form>
        ) : (
          // Setup Wizard (Step 2)
          <form onSubmit={handleSetup}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Setup Your Club</h2>
            <p className="text-center text-gray-500 mb-6 text-sm">Design your team's look and feel.</p>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Club Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={setupData.clubName}
                  onChange={e => setSetupData({ ...setupData, clubName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Slug <span className="text-gray-400 font-normal">(yourapp.com/{setupData.clubSlug})</span>
                </label>
                <input
                  type="text"
                  required
                  pattern="^[a-z0-9-]+$"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  value={setupData.clubSlug}
                  onChange={e => {
                    setSlugDirty(true);
                    setSetupData({ ...setupData, clubSlug: e.target.value });
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      className="h-10 w-10 rounded border p-0 cursor-pointer"
                      value={setupData.primaryColor}
                      onChange={e => setSetupData({ ...setupData, primaryColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="w-full px-2 py-2 border rounded-lg text-sm font-mono"
                      value={setupData.primaryColor}
                      onChange={e => setSetupData({ ...setupData, primaryColor: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      className="h-10 w-10 rounded border p-0 cursor-pointer"
                      value={setupData.secondaryColor}
                      onChange={e => setSetupData({ ...setupData, secondaryColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className="w-full px-2 py-2 border rounded-lg text-sm font-mono"
                      value={setupData.secondaryColor}
                      onChange={e => setSetupData({ ...setupData, secondaryColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4 border rounded-lg p-4 bg-gray-50 flex items-center justify-center">
                <div
                  className="rounded-lg shadow-lg p-6 w-full max-w-xs text-center transition-colors"
                  style={{ backgroundColor: setupData.primaryColor, color: setupData.secondaryColor }}
                >
                  <h3 className="font-bold text-xl">{setupData.clubName || 'My Club'}</h3>
                  <p className="text-xs opacity-90 mt-1">Official Team App</p>
                  <div className="mt-4 bg-white/20 rounded h-2 w-20 mx-auto"></div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 mt-4"
              >
                {loading ? 'Saving...' : 'Finish Setup 🚀'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupPageContent />
    </Suspense>
  );
}
