'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSDK } from '@/lib/sdk';

export default function Onboard() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      router.replace('/admin');
      return;
    }

    (async () => {
      try {
        const sdk = getSDK();
        const res = await sdk.verifyMagicToken(token);
        if (res?.success) {
          router.replace('/admin');
        } else {
          router.replace('/login?e=verify_failed');
        }
      } catch (error) {
        console.error('Magic link verification error:', error);
        router.replace('/login?e=verify_error');
      }
    })();
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow">
        <p className="text-gray-700">Setting up your secure session...</p>
      </div>
    </div>
  );
}
