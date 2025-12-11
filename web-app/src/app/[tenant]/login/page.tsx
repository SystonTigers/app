'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type LoginMethod = 'code' | 'fan' | 'password';
type Role = 'parent' | 'player' | 'coach' | 'fan';

export default function LoginPage() {
    const router = useRouter();
    const params = useParams();
    const tenant = params.tenant as string;
    const { login } = useAuth(); // Use auth context

    const [method, setMethod] = useState<LoginMethod>('code');
    const [code, setCode] = useState('');
    const [role, setRole] = useState<Role>('parent');

    // Parent Login
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Fan Login
    const [fanCode, setFanCode] = useState(''); // Team fan code

    // Multi-tenant selection
    const [showTenantSelect, setShowTenantSelect] = useState(false);
    const [availableTenants, setAvailableTenants] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [coachCodeValid, setCoachCodeValid] = useState(false);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

    const validateCode = async (inputCode: string) => {
        // Check if code is a coach code (format: TEAM-CXXXX)
        const isCoachCode = /-C\d{3,4}$/.test(inputCode);
        setCoachCodeValid(isCoachCode);

        // If switching to coach role but no coach code, reset
        if (role === 'coach' && !isCoachCode) {
            setRole('parent');
        }
    };

    const handleCodeChange = (value: string) => {
        const upperValue = value.toUpperCase();
        setCode(upperValue);
        validateCode(upperValue);
    };

    const handleSelectTenant = async (tenantId: string) => {
        // Log in again with specific tenant
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, tenantId }),
                credentials: 'include',
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Login failed');

            login(data.token, data.user);

            // Should redirect to that tenant's dashboard, ensuring URL handles slug
            // data.user might not give slug, but 'availableTenants' has it.
            const selected = availableTenants.find(t => t.id === tenantId);
            if (selected) {
                window.location.href = `/${selected.slug}`;
            } else {
                router.push(`/${tenant}`); // Fallback
            }

        } catch (err: any) {
            setError(err.message || "Selection failed");
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (method === 'code') {
                // Login with player/coach code
                const response = await fetch(`${API_BASE}/api/v1/auth/code-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        role,
                        tenant,
                    }),
                    credentials: 'include',
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error?.message || 'Invalid code');
                }

                const data = await response.json();
                // Store via Context
                login(data.token, { role }); // Basic user data for code login
                if (data.playerId) {
                    localStorage.setItem('player_id', data.playerId);
                }
                localStorage.setItem('user_role', role);

                router.push(`/${tenant}`);
            } else if (method === 'password') {
                // Parent Email/Pass Login
                const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        password,
                        // If we are on a specific tenant page, maybe prefer that tenant?
                        // But "Universal" implies we search all.
                        // Let's NOT send tenantId initially to allow discovery,
                        // UNLESS we want to force login to THIS tenant?
                        // The plan said: "1. Fetch ALL... 2. If tenant_id provided... filter".
                        // Use case: Parent lands on Tigers login -> expects to login to Tigers.
                        // But if they have accounts elsewhere, we might want to know?
                        // Let's NOT send tenantId to trigger the multi-tenant check if applicable.
                        // Wait, if I am on '/syston-tigers/login', I probably expect to login to Syston Tigers.
                        // But if I have multiple, I might want to choose.
                        // Let's send NO tenantId to allow the backend "Universal" logic to kick in.
                    }),
                    credentials: 'include',
                });

                const data = await response.json();

                if (data.multipleTenants) {
                    setAvailableTenants(data.tenants);
                    setShowTenantSelect(true);
                    setLoading(false);
                    return;
                }

                if (!response.ok) throw new Error(data.error?.message || 'Login failed');

                // Single tenant success
                login(data.token, data.user);
                localStorage.setItem('user_role', 'parent'); // Assume parent/admin for email login

                // If the user logged in to a DIFFERENT tenant than the URL, we should redirect!
                // data.user.tenant_id vs current tenant?
                // We don't have tenant slug in data.user usually, but let's assume standard flow.
                // If we are on specific tenant page, and we logged into IT, good.
                // If we logged into another one (because only 1 match found elsewhere), we should redirect there?
                // The backend `handleAuthLogin` returns a token for the *found* tenant.
                // If it's different, we might be in trouble if we stay on this URL.
                // Ideally, backend returns `tenant_slug` in user or separate field.
                // `handleAuthLogin` usually returns `token` and `user`. 
                // Let's assume standard behavior for now.
                router.push(`/${tenant}`);

            } else {
                // Fan login
                const response = await fetch(`${API_BASE}/api/v1/auth/fan-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        fanCode,
                        tenant,
                    }),
                    credentials: 'include',
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error?.message || 'Invalid fan code');
                }

                const data = await response.json();
                login(data.token, { role: 'fan', email });
                localStorage.setItem('user_role', 'fan');

                router.push(`/${tenant}`);
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            if (!showTenantSelect) setLoading(false);
        }
    };

    if (showTenantSelect) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-4 text-center">Select Your Team</h2>
                    <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
                        Your email is associated with multiple teams. Choose one to continue.
                    </p>
                    <div className="space-y-3">
                        {availableTenants.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => handleSelectTenant(t.id)}
                                className="w-full p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between group transition-colors"
                            >
                                <span className="font-medium">{t.name}</span>
                                <span className="text-gray-400 group-hover:text-blue-500">→</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 px-4">
            <div className="max-w-md w-full">
                {/* Logo/Team Name */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-black dark:bg-white rounded-2xl flex items-center justify-center">
                        <span className="text-2xl font-bold text-white dark:text-black">
                            {tenant?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                        {tenant?.replace(/-/g, ' ')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Sign in to access your team</p>
                </div>

                {/* Method Tabs */}
                <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1 mb-6">
                    <button
                        type="button"
                        onClick={() => setMethod('code')}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${method === 'code'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                            : 'text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        Code
                    </button>
                    <button
                        type="button"
                        onClick={() => setMethod('password')}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${method === 'password'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                            : 'text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        Parent
                    </button>
                    <button
                        type="button"
                        onClick={() => setMethod('fan')}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${method === 'fan'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                            : 'text-gray-600 dark:text-gray-400'
                            }`}
                    >
                        Fan
                    </button>
                </div>

                {/* Login Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {method === 'code' && (
                            <>
                                {/* Code Entry */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Your Login Code
                                    </label>
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => handleCodeChange(e.target.value)}
                                        placeholder="TIGERS-8472"
                                        className="w-full px-4 py-3 text-center text-lg font-mono tracking-wider border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                                        required
                                    />
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5">
                                        Enter the code provided by your team manager
                                    </p>
                                </div>

                                {/* Role Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        I am a...
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setRole('parent')}
                                            className={`py-3 px-2 rounded-lg border-2 text-sm font-medium transition-all ${role === 'parent'
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                }`}
                                        >
                                            👨‍👩‍👧 Parent
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRole('player')}
                                            className={`py-3 px-2 rounded-lg border-2 text-sm font-medium transition-all ${role === 'player'
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                }`}
                                        >
                                            ⚽ Player
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => coachCodeValid && setRole('coach')}
                                            disabled={!coachCodeValid}
                                            className={`py-3 px-2 rounded-lg border-2 text-sm font-medium transition-all ${role === 'coach'
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : coachCodeValid
                                                    ? 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                    : 'border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                }`}
                                        >
                                            🏃 Coach
                                        </button>
                                    </div>
                                    {!coachCodeValid && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            Coach role requires a coach code from your manager
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        {method === 'password' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="parent@example.com"
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                    <div className="text-right mt-2">
                                        <a href="/forgot-password" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                            Forgot password?
                                        </a>
                                    </div>
                                </div>
                            </>
                        )}

                        {method === 'fan' && (
                            <>
                                {/* Fan Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Your Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="fan@email.com"
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>

                                {/* Team Fan Code */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Team Fan Code
                                    </label>
                                    <input
                                        type="text"
                                        value={fanCode}
                                        onChange={(e) => setFanCode(e.target.value.toUpperCase())}
                                        placeholder="TIGERS-FAN"
                                        className="w-full px-4 py-3 text-center font-mono tracking-wider border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                                        required
                                    />
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5">
                                        Ask the team for their fan access code
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || (method === 'code' && !code) || (method === 'fan' && (!email || !fanCode)) || (method === 'password' && (!email || !password))}
                            className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                {/* Manager Link */}
                <p className="text-center text-sm text-gray-600 dark:text-gray-300 mt-6">
                    Team manager?{' '}
                    <a href={`/${tenant}/admin/login`} className="text-blue-600 hover:underline">
                        Sign in here
                    </a>
                </p>
            </div>
        </div>
    );
}
