import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setError('Missing verification token');
            return;
        }

        const verify = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/v1/auth/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                const data = await res.json();

                if (data.success) {
                    // Store session
                    if (data.data.token) {
                        localStorage.setItem('session_token', data.data.token);
                        // Optionally store user info
                        if (data.data.user) {
                            try {
                                localStorage.setItem('user', JSON.stringify(data.data.user));
                            } catch (e) {
                                console.error('Failed to store user', e);
                            }
                        }
                    }
                    setStatus('success');
                    // Redirect to setup after short delay
                    setTimeout(() => {
                        router.push(data.data.redirect || '/setup');
                    }, 1500);
                } else {
                    setStatus('error');
                    setError(data.error?.message || 'Verification failed');
                }
            } catch (err) {
                setStatus('error');
                setError('Connection failed');
            }
        };

        verify();
    }, [token, router]);

    if (status === 'verifying') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="p-8 bg-white rounded-xl shadow-lg text-center max-w-md w-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email...</h1>
                    <p className="text-gray-600">Please wait while we confirm your account.</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="p-8 bg-white rounded-xl shadow-lg text-center max-w-md w-full">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
                    <p className="text-gray-600 mb-6">Redirecting you to setup your club...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="p-8 bg-white rounded-xl shadow-lg text-center max-w-md w-full">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
                <p className="text-gray-600 mb-6">{error}</p>
                <Link href="/signup">
                    <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 font-medium">Back to Sign Up</button>
                </Link>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}
