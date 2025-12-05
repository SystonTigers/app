'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyContent() {
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [error, setError] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setError('No token provided');
            return;
        }

        verifyToken(token);
    }, [searchParams]);

    const verifyToken = async (token: string) => {
        try {
            const res = await fetch('/api/v1/auth/magic/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await res.json();
            if (data.success && data.token) {
                localStorage.setItem('token', data.token);
                setStatus('success');
                setTimeout(() => {
                    router.push('/');
                }, 2000);
            } else {
                setStatus('error');
                setError(data.error || 'Invalid or expired link');
            }
        } catch (err) {
            setStatus('error');
            setError('Verification failed');
        }
    };

    return (
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            {status === 'verifying' && (
                <>
                    <div className="animate-spin text-6xl mb-4">⏳</div>
                    <h1 className="text-2xl font-bold mb-2">Verifying...</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Please wait while we verify your magic link
                    </p>
                </>
            )}

            {status === 'success' && (
                <>
                    <div className="text-6xl mb-4">✅</div>
                    <h1 className="text-2xl font-bold mb-2">Success!</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        You're now signed in. Redirecting...
                    </p>
                </>
            )}

            {status === 'error' && (
                <>
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/auth/magic')}
                        className="bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand/90 transition-colors"
                    >
                        Request New Link
                    </button>
                </>
            )}
        </div>
    );
}

export default function MagicLinkVerifyPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <Suspense fallback={<div>Loading...</div>}>
                <VerifyContent />
            </Suspense>
        </div>
    );
}
