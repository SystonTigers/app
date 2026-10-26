/// <reference types="vitest/globals" />
/// <reference types="@testing-library/jest-dom/vitest" />
import { expect, vi } from 'vitest';
// Registered on this package's own vitest: jest-dom's "/vitest" entry imports
// vitest from wherever jest-dom is installed (the repo root), which a
// website-only install (CI) doesn't have.
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
    }),
    useParams: () => ({}),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}));

// Mock localStorage with mutable state
const store: Record<string, string> = {};
const localStorageMock = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
        delete store[key];
    }),
    clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
    }),
    get length() {
        return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
};

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Reset mocks between tests
beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
});
