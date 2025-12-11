'use client';

import { useState, useEffect } from 'react';

export type UserRole = 'manager' | 'coach' | 'parent' | 'player' | 'fan' | null;

interface UserSession {
    role: UserRole;
    tenantId: string | null;
    playerId: string | null;
    isLoggedIn: boolean;
}

/**
 * Hook to get the current user's role from localStorage
 */
export function useUserRole(): UserSession {
    const [session, setSession] = useState<UserSession>({
        role: null,
        tenantId: null,
        playerId: null,
        isLoggedIn: false,
    });

    useEffect(() => {
        // Check localStorage for session info
        const role = localStorage.getItem('user_role') as UserRole;
        const tenantId = localStorage.getItem('tenant_id');
        const playerId = localStorage.getItem('player_id');
        const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');

        setSession({
            role: role || null,
            tenantId: tenantId || null,
            playerId: playerId || null,
            isLoggedIn: !!token,
        });
    }, []);

    return session;
}

/**
 * Navigation items with role restrictions
 */
export interface NavItemWithRole {
    label: string;
    href: string;
    icon: string;
    allowedRoles?: UserRole[]; // If undefined, all roles can access
    minRole?: UserRole; // Minimum role level required
}

/**
 * Define which roles can access which features
 */
export const ROLE_HIERARCHY: Record<string, number> = {
    'fan': 1,
    'player': 2,
    'parent': 3,
    'coach': 4,
    'manager': 5,
};

/**
 * Check if a role meets the minimum requirement
 */
export function meetsMinRole(userRole: UserRole, minRole: UserRole): boolean {
    if (!userRole || !minRole) return true;
    return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
}

/**
 * Filter navigation items based on user role
 */
export function filterNavByRole(items: NavItemWithRole[], userRole: UserRole): NavItemWithRole[] {
    return items.filter(item => {
        // If no restrictions, allow all
        if (!item.allowedRoles && !item.minRole) return true;

        // Check specific allowed roles
        if (item.allowedRoles && item.allowedRoles.includes(userRole)) return true;

        // Check minimum role level
        if (item.minRole && meetsMinRole(userRole, item.minRole)) return true;

        return false;
    });
}

/**
 * Check if current user can access admin pages
 */
export function canAccessAdmin(role: UserRole): boolean {
    const adminRoles: UserRole[] = ['manager', 'coach'];
    return role !== null && adminRoles.includes(role);
}

/**
 * Check if current user can access a specific feature
 */
export function canAccess(role: UserRole, feature: string): boolean {
    const featureAccess: Record<string, UserRole[]> = {
        'admin': ['manager', 'coach'],
        'tactics': ['manager', 'coach', 'player'],
        'training': ['manager', 'coach', 'parent', 'player'],
        'discussions': ['manager', 'coach', 'parent', 'player'],
        'squad': ['manager', 'coach', 'parent', 'player', 'fan'],
        'fixtures': ['manager', 'coach', 'parent', 'player', 'fan'],
        'results': ['manager', 'coach', 'parent', 'player', 'fan'],
        'table': ['manager', 'coach', 'parent', 'player', 'fan'],
        'stats': ['manager', 'coach', 'parent', 'player', 'fan'],
    };

    const allowedRoles = featureAccess[feature];
    if (!allowedRoles) return true; // No restriction
    return role !== null && allowedRoles.includes(role);
}
