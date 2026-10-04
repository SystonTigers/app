'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUserRole, canAccessAdmin } from '@/hooks/useUserRole';

interface AdminGuardProps {
    children: React.ReactNode;
}

/**
 * Client component that protects admin routes
 * Redirects non-admin users to login or home page
 */
export function AdminGuard({ children }: AdminGuardProps) {
    const { role, isLoggedIn } = useUserRole();
    const router = useRouter();
    const params = useParams();
    const tenant = params.tenant as string;
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        // Wait for role to be loaded from localStorage
        const timer = setTimeout(() => {
            if (!isLoggedIn) {
                // Not logged in, redirect to login
                router.push(`/${tenant}/login`);
            } else if (!canAccessAdmin(role)) {
                // Logged in but insufficient permissions
                router.push(`/${tenant}?error=unauthorized`);
            } else {
                setChecking(false);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [role, isLoggedIn, router, tenant]);

    if (checking) {
        return (
            <div role="status" aria-live="polite" className="min-h-[60vh] flex items-center justify-center bg-background">
                <div className="flex items-center gap-3 text-muted">
                    <span className="w-8 h-8 hexagon bg-brand/20 animate-pulse" aria-hidden="true" />
                    <span className="font-display uppercase tracking-wider">Checking you&apos;re club staff…</span>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
