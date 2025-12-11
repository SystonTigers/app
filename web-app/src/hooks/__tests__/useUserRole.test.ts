import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
    useUserRole,
    ROLE_HIERARCHY,
    meetsMinRole,
    filterNavByRole,
    canAccessAdmin,
    canAccess,
} from '../useUserRole';

// Mock localStorage with mutable state
const mockStorage: Record<string, string> = {};
const localStorageMock = {
    getItem: vi.fn((key: string) => mockStorage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
    }),
    clear: vi.fn(() => {
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    }),
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

describe('useUserRole', () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    describe('session parsing', () => {
        it('should return not logged in when no token exists', () => {
            const { result } = renderHook(() => useUserRole());

            expect(result.current.isLoggedIn).toBe(false);
            expect(result.current.role).toBeNull();
            expect(result.current.tenantId).toBeNull();
            expect(result.current.playerId).toBeNull();
        });

        it('should parse role from localStorage', async () => {
            mockStorage['user_role'] = 'coach';
            mockStorage['user_token'] = 'test-token';
            mockStorage['tenant_id'] = 'tenant-123';

            const { result, rerender } = renderHook(() => useUserRole());

            // After effect runs
            await vi.waitFor(() => {
                rerender();
                expect(result.current.isLoggedIn).toBe(true);
            });
        });

        it('should parse player_id from localStorage', async () => {
            mockStorage['user_role'] = 'player';
            mockStorage['user_token'] = 'test-token';
            mockStorage['tenant_id'] = 'tenant-123';
            mockStorage['player_id'] = 'player-456';

            const { result, rerender } = renderHook(() => useUserRole());

            await vi.waitFor(() => {
                rerender();
                expect(result.current.playerId).toBe('player-456');
            });
        });
    });
});

describe('meetsMinRole', () => {
    it('should return true when user role meets minimum', () => {
        expect(meetsMinRole('coach', 'player')).toBe(true);
        expect(meetsMinRole('coach', 'coach')).toBe(true);
    });

    it('should return false when user role is below minimum', () => {
        expect(meetsMinRole('player', 'coach')).toBe(false);
        expect(meetsMinRole('player', 'manager')).toBe(false);
    });

    it('should handle role hierarchy correctly', () => {
        // Manager should meet all roles
        expect(meetsMinRole('manager', 'fan')).toBe(true);
        expect(meetsMinRole('manager', 'player')).toBe(true);
        expect(meetsMinRole('manager', 'parent')).toBe(true);
        expect(meetsMinRole('manager', 'coach')).toBe(true);
        expect(meetsMinRole('manager', 'manager')).toBe(true);
    });

    it('should return true when role or minRole is null', () => {
        expect(meetsMinRole(null, 'coach')).toBe(true);
        expect(meetsMinRole('coach', null)).toBe(true);
        expect(meetsMinRole(null, null)).toBe(true);
    });
});

describe('canAccessAdmin', () => {
    it('should return true for manager role', () => {
        expect(canAccessAdmin('manager')).toBe(true);
    });

    it('should return true for coach role', () => {
        expect(canAccessAdmin('coach')).toBe(true);
    });

    it('should return false for player role', () => {
        expect(canAccessAdmin('player')).toBe(false);
    });

    it('should return false for fan role', () => {
        expect(canAccessAdmin('fan')).toBe(false);
    });

    it('should return false for parent role', () => {
        expect(canAccessAdmin('parent')).toBe(false);
    });

    it('should return false for null role', () => {
        expect(canAccessAdmin(null)).toBe(false);
    });
});

describe('canAccess', () => {
    it('should allow admin access only for manager and coach', () => {
        expect(canAccess('manager', 'admin')).toBe(true);
        expect(canAccess('coach', 'admin')).toBe(true);
        expect(canAccess('player', 'admin')).toBe(false);
        expect(canAccess('parent', 'admin')).toBe(false);
        expect(canAccess('fan', 'admin')).toBe(false);
    });

    it('should allow tactics access for manager, coach, and player', () => {
        expect(canAccess('manager', 'tactics')).toBe(true);
        expect(canAccess('coach', 'tactics')).toBe(true);
        expect(canAccess('player', 'tactics')).toBe(true);
        expect(canAccess('parent', 'tactics')).toBe(false);
        expect(canAccess('fan', 'tactics')).toBe(false);
    });

    it('should allow fixtures access for all roles', () => {
        expect(canAccess('manager', 'fixtures')).toBe(true);
        expect(canAccess('coach', 'fixtures')).toBe(true);
        expect(canAccess('player', 'fixtures')).toBe(true);
        expect(canAccess('parent', 'fixtures')).toBe(true);
        expect(canAccess('fan', 'fixtures')).toBe(true);
    });

    it('should return true for unknown features', () => {
        expect(canAccess('fan', 'unknown-feature')).toBe(true);
    });

    it('should return false for null role on restricted features', () => {
        expect(canAccess(null, 'admin')).toBe(false);
    });
});

describe('filterNavByRole', () => {
    it('should filter navigation items based on minRole', () => {
        const navItems = [
            { label: 'Fixtures', href: '/fixtures', icon: 'calendar' },
            { label: 'Squad', href: '/squad', icon: 'users', minRole: 'player' as const },
            { label: 'Admin', href: '/admin', icon: 'settings', minRole: 'coach' as const },
        ];

        const fanFiltered = filterNavByRole(navItems, 'fan');
        expect(fanFiltered).toHaveLength(1);
        expect(fanFiltered[0].href).toBe('/fixtures');

        const playerFiltered = filterNavByRole(navItems, 'player');
        expect(playerFiltered).toHaveLength(2);

        const coachFiltered = filterNavByRole(navItems, 'coach');
        expect(coachFiltered).toHaveLength(3);
    });

    it('should filter based on allowedRoles', () => {
        const navItems = [
            { label: 'Public', href: '/public', icon: 'globe' },
            { label: 'Coaches Only', href: '/coaches', icon: 'whistle', allowedRoles: ['coach' as const, 'manager' as const] },
        ];

        const fanFiltered = filterNavByRole(navItems, 'fan');
        expect(fanFiltered).toHaveLength(1);

        const coachFiltered = filterNavByRole(navItems, 'coach');
        expect(coachFiltered).toHaveLength(2);
    });
});

describe('ROLE_HIERARCHY', () => {
    it('should have correct hierarchy order', () => {
        expect(ROLE_HIERARCHY.fan).toBeLessThan(ROLE_HIERARCHY.player);
        expect(ROLE_HIERARCHY.player).toBeLessThan(ROLE_HIERARCHY.parent);
        expect(ROLE_HIERARCHY.parent).toBeLessThan(ROLE_HIERARCHY.coach);
        expect(ROLE_HIERARCHY.coach).toBeLessThan(ROLE_HIERARCHY.manager);
    });

    it('should have all expected roles', () => {
        const expectedRoles = ['fan', 'player', 'parent', 'coach', 'manager'];
        expectedRoles.forEach(role => {
            expect(ROLE_HIERARCHY).toHaveProperty(role);
        });
    });
});
