import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
        prefetch: vi.fn(),
        back: vi.fn(),
    }),
    useParams: () => ({ tenant: 'test-tenant' }),
    usePathname: () => '/test-tenant/admin',
    useSearchParams: () => new URLSearchParams(),
}));

// Mock localStorage
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

// Import AdminGuard after mocks are set up
import { AdminGuard } from '../../components/AdminGuard';

describe('AdminGuard', () => {
    beforeEach(() => {
        localStorageMock.clear();
        mockPush.mockClear();
        mockReplace.mockClear();
        vi.clearAllMocks();
    });

    it('should render children when user is a manager', async () => {
        mockStorage['user_role'] = 'manager';
        mockStorage['user_token'] = 'test-token';
        mockStorage['tenant_id'] = 'test-tenant';

        render(
            <AdminGuard>
                <div data-testid="protected-content">Protected Content</div>
            </AdminGuard>
        );

        // Wait for the component to check auth and render
        await waitFor(() => {
            const element = screen.queryByTestId('protected-content');
            expect(element).not.toBeNull();
        }, { timeout: 500 });
    });

    it('should render children when user is a coach', async () => {
        mockStorage['user_role'] = 'coach';
        mockStorage['user_token'] = 'test-token';
        mockStorage['tenant_id'] = 'test-tenant';

        render(
            <AdminGuard>
                <div data-testid="protected-content">Protected Content</div>
            </AdminGuard>
        );

        await waitFor(() => {
            const element = screen.queryByTestId('protected-content');
            expect(element).not.toBeNull();
        }, { timeout: 500 });
    });

    it('should redirect to login when user is not logged in', async () => {
        render(
            <AdminGuard>
                <div data-testid="protected-content">Protected Content</div>
            </AdminGuard>
        );

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalled();
        }, { timeout: 500 });

        // Should redirect to login page
        const redirectUrl = mockPush.mock.calls[0]?.[0];
        expect(redirectUrl).toContain('login');
    });

    it('should redirect with error when user role is player', async () => {
        mockStorage['user_role'] = 'player';
        mockStorage['user_token'] = 'test-token';
        mockStorage['tenant_id'] = 'test-tenant';

        render(
            <AdminGuard>
                <div data-testid="protected-content">Protected Content</div>
            </AdminGuard>
        );

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalled();
        }, { timeout: 500 });

        // Should redirect with unauthorized error
        const redirectUrl = mockPush.mock.calls[0]?.[0];
        expect(redirectUrl).toContain('error=unauthorized');
    });

    it('should redirect with error when user role is fan', async () => {
        mockStorage['user_role'] = 'fan';
        mockStorage['user_token'] = 'test-token';
        mockStorage['tenant_id'] = 'test-tenant';

        render(
            <AdminGuard>
                <div data-testid="protected-content">Protected Content</div>
            </AdminGuard>
        );

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalled();
        }, { timeout: 500 });

        const redirectUrl = mockPush.mock.calls[0]?.[0];
        expect(redirectUrl).toContain('error=unauthorized');
    });

    it('should redirect with error when user role is parent', async () => {
        mockStorage['user_role'] = 'parent';
        mockStorage['user_token'] = 'test-token';
        mockStorage['tenant_id'] = 'test-tenant';

        render(
            <AdminGuard>
                <div data-testid="protected-content">Protected Content</div>
            </AdminGuard>
        );

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalled();
        }, { timeout: 500 });

        const redirectUrl = mockPush.mock.calls[0]?.[0];
        expect(redirectUrl).toContain('error=unauthorized');
    });

    it('should show loading state initially', () => {
        render(
            <AdminGuard>
                <div data-testid="protected-content">Protected Content</div>
            </AdminGuard>
        );

        // Initially should not show protected content (checking state)
        const element = screen.queryByTestId('protected-content');
        expect(element).toBeNull();
    });
});
