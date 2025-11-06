'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

function persistAdminToken(token: string) {
  if (typeof document === 'undefined') return;
  const cookieParts = [
    `admin_token=${encodeURIComponent(token)}`,
    'path=/',
    'SameSite=Lax',
    'max-age=604800', // 7 days
  ];

  if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
    cookieParts.push('Secure');
  }

  document.cookie = cookieParts.join('; ');
}

function AdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkPasswordStatus() {
      try {
        // Check if there's a token in the URL (from magic link)
        const tokenFromUrl = searchParams.get('token');

        if (tokenFromUrl) {
          // Save the token from magic link
          persistAdminToken(tokenFromUrl);
        }

        // Get token from cookie
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('admin_token='))
          ?.split('=')[1];

        if (!token) {
          // No token, redirect to login
          router.push('/admin/login');
          return;
        }

        // Check if user has password set
        const result = await apiFetch<{ hasPassword: boolean }>('/api/v1/auth/password-status', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${decodeURIComponent(token)}`,
          },
        });

        if (!result.hasPassword) {
          // No password set, redirect to set password
          router.push('/admin/set-password');
        } else {
          // Password is set, go to dashboard
          // For now, just show a success message
          setChecking(false);
        }
      } catch (err: any) {
        console.error('Error checking password status:', err);
        setError(err?.message || 'Failed to check authentication status');
        setChecking(false);
      }
    }

    checkPasswordStatus();
  }, [router, searchParams]);

  if (checking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid var(--border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto var(--spacing-md)',
            }}
          />
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--spacing-2xl)',
          background: 'var(--bg)',
        }}
      >
        <div className="card" style={{ maxWidth: '480px', padding: 'var(--spacing-2xl)', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-md)', color: 'var(--error)' }}>
            Authentication Error
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>{error}</p>
          <button onClick={() => router.push('/admin/login')} className="btn btn-primary">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-2xl)',
        background: 'var(--bg)',
      }}
    >
      <div className="card" style={{ maxWidth: '640px', padding: 'var(--spacing-2xl)' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 'var(--spacing-md)' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>
          Welcome to your admin console! You're successfully authenticated.
        </p>
        <div style={{ padding: 'var(--spacing-lg)', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>What's next?</p>
          <ul style={{ listStyle: 'disc', paddingLeft: 'var(--spacing-lg)', color: 'var(--text-muted)' }}>
            <li>Configure your club settings</li>
            <li>Add fixtures and match schedules</li>
            <li>Manage team members and roles</li>
            <li>Set up automations and integrations</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


export default function AdminPage() {
  return (
    <Suspense fallback={
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    }>
      <AdminContent />
    </Suspense>
  );
}
