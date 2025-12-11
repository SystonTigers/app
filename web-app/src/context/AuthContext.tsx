'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: string;
    email: string;
    roles: string[];
    tenantId: string;
    name?: string;
}

interface Tenant {
    id: string;
    name: string;
    slug: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string, userData: any) => void;
    logout: () => void;
    switchTenant: (targetTenantId: string) => Promise<void>;
    linkPlayer: (code: string) => Promise<{ success: boolean; tenant?: Tenant }>;
    refreshTenants: () => Promise<void>;
    myTenants: Tenant[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [myTenants, setMyTenants] = useState<Tenant[]>([]);
    const router = useRouter();
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787';

    useEffect(() => {
        // Hydrate from localStorage
        const token = localStorage.getItem('user_token');
        if (token) {
            // We could decode JWT here or fetch /me.
            // For now, let's just assume we have some user data stored or fetch it.
            // If we don't valid user data stored, we might want to fetch /auth/me/tenants at least?
            // Let's implement fully later.
            // For now, we rely on the consumer (LoginPage) to call login()
            // But for persistence, we should probably store user object too.
            const storedUser = localStorage.getItem('user_data');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
                // Trigger tenant fetch in background
                fetch(`${API_BASE}/api/v1/auth/me/tenants`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => res.json()).then(data => {
                    if (data.success) setMyTenants(data.tenants || []);
                }).catch(e => console.error(e));
            }
        }
        setLoading(false);
    }, []);

    const login = (token: string, userData: any) => {
        localStorage.setItem('user_token', token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        setUser(userData);

        // Fetch tenants immediately
        fetch(`${API_BASE}/api/v1/auth/me/tenants`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => {
            if (data.success) setMyTenants(data.tenants || []);
        }).catch(e => console.error(e));
    };

    const logout = () => {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('user_role');
        localStorage.removeItem('player_id');
        setUser(null);
        router.push('/');
    };

    const refreshTenants = async () => {
        const token = localStorage.getItem('user_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/v1/auth/me/tenants`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMyTenants(data.tenants || []);
            }
        } catch (e) {
            console.error("Failed to fetch tenants", e);
        }
    };

    const switchTenant = async (targetTenantId: string) => {
        const token = localStorage.getItem('user_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/api/v1/auth/switch-tenant`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ targetTenantId })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || "Switch failed");

            // Update Token and User
            login(data.token, data.user);

            // Redirect to new tenant dashboard
            const target = myTenants.find(t => t.id === targetTenantId);
            if (target) {
                // Hard redirect to clear any state
                window.location.href = `/${target.slug}`;
            } else {
                window.location.reload();
            }

        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const linkPlayer = async (code: string) => {
        const token = localStorage.getItem('user_token');
        if (!token) throw new Error("Not logged in");

        const res = await fetch(`${API_BASE}/api/v1/auth/link-player`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Link failed");

        await refreshTenants();
        return { success: true, tenant: data.tenant };
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, switchTenant, linkPlayer, refreshTenants, myTenants }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
