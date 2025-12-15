/**
 * Friendlies Routes Tests
 * Tests for the friendly matchmaking marketplace feature
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock environment
const mockEnv = {
    DB: {
        prepare: vi.fn(() => ({
            bind: vi.fn(() => ({
                all: vi.fn(() => ({ results: [] })),
                first: vi.fn(() => null),
                run: vi.fn(() => ({ meta: { changes: 1 } })),
            })),
        })),
    },
    FCM_SERVER_KEY: 'test-key',
};

// Mock JWT claims
const mockClaims = {
    tenantId: 'test-tenant-123',
    sub: 'user-123',
    roles: ['admin'],
};

// Mock requireJWT
vi.mock('../../services/auth', () => ({
    requireJWT: vi.fn(() => Promise.resolve(mockClaims)),
}));

// Import handlers
import {
    handleListFriendlyRequests,
    handleCreateFriendlyRequest,
    handleGetMyFriendlyRequests,
    handleDeleteFriendlyRequest,
    handleRequestMatch,
    handleGetFriendlyInbox,
    handleRespondToMatch,
    handleGetSentRequests,
} from '../friendlies';

describe('Friendly Matchmaking Routes', () => {
    const corsHdrs = new Headers();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/v1/friendlies', () => {
        it('should list open friendly requests', async () => {
            const mockResults = [
                { id: '1', team_name: 'Team A', age_group: 'U12', status: 'open' },
                { id: '2', team_name: 'Team B', age_group: 'U14', status: 'open' },
            ];

            mockEnv.DB.prepare = vi.fn(() => ({
                bind: vi.fn(() => ({
                    all: vi.fn(() => ({ results: mockResults })),
                })),
            }));

            const req = new Request('https://api.test/api/v1/friendlies');
            const response = await handleListFriendlyRequests(req, mockEnv, corsHdrs);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data).toHaveLength(2);
        });

        it('should filter by age group', async () => {
            const req = new Request('https://api.test/api/v1/friendlies?age_group=U12');
            await handleListFriendlyRequests(req, mockEnv, corsHdrs);

            expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
                expect.stringContaining('age_group')
            );
        });
    });

    describe('POST /api/v1/friendlies', () => {
        it('should create a new friendly request', async () => {
            mockEnv.DB.prepare = vi.fn(() => ({
                bind: vi.fn(() => ({
                    first: vi.fn(() => ({ name: 'Test Team' })),
                    run: vi.fn(() => ({ meta: { changes: 1 } })),
                })),
            }));

            const req = new Request('https://api.test/api/v1/friendlies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preferred_dates: ['2024-01-15', '2024-01-22'],
                    location_pref: 'home',
                    age_group: 'U12',
                    kit_colors: 'red/white',
                    max_travel_miles: 20,
                }),
            });

            const response = await handleCreateFriendlyRequest(req, mockEnv, corsHdrs);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
            expect(data.data.id).toBeDefined();
        });
    });

    describe('DELETE /api/v1/friendlies/:id', () => {
        it('should delete own friendly request', async () => {
            mockEnv.DB.prepare = vi.fn(() => ({
                bind: vi.fn(() => ({
                    run: vi.fn(() => ({ meta: { changes: 1 } })),
                })),
            }));

            const req = new Request('https://api.test/api/v1/friendlies/request-123', {
                method: 'DELETE',
            });

            const response = await handleDeleteFriendlyRequest(req, mockEnv, corsHdrs);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
        });

        it('should return 404 if request not found', async () => {
            mockEnv.DB.prepare = vi.fn(() => ({
                bind: vi.fn(() => ({
                    run: vi.fn(() => ({ meta: { changes: 0 } })),
                })),
            }));

            const req = new Request('https://api.test/api/v1/friendlies/nonexistent', {
                method: 'DELETE',
            });

            const response = await handleDeleteFriendlyRequest(req, mockEnv, corsHdrs);
            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/v1/friendlies/:id/request', () => {
        it('should send a match request', async () => {
            const mockFriendlyRequest = {
                id: 'request-123',
                tenant_id: 'other-tenant',
                team_name: 'Other Team',
                status: 'open',
            };

            let callCount = 0;
            mockEnv.DB.prepare = vi.fn(() => ({
                bind: vi.fn(() => ({
                    first: vi.fn(() => {
                        callCount++;
                        if (callCount === 1) return mockFriendlyRequest;
                        return { name: 'Requester Team' };
                    }),
                    run: vi.fn(() => ({ meta: { changes: 1 } })),
                    all: vi.fn(() => ({ results: [] })),
                })),
            }));

            const req = new Request('https://api.test/api/v1/friendlies/request-123/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proposed_date: '2024-01-20',
                    proposed_venue: 'Our Home Ground',
                    message: 'Fancy a game?',
                }),
            });

            const response = await handleRequestMatch(req, mockEnv, corsHdrs);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.success).toBe(true);
        });

        it('should not allow requesting own listing', async () => {
            const mockFriendlyRequest = {
                id: 'request-123',
                tenant_id: 'test-tenant-123', // Same as mockClaims.tenantId
                status: 'open',
            };

            mockEnv.DB.prepare = vi.fn(() => ({
                bind: vi.fn(() => ({
                    first: vi.fn(() => mockFriendlyRequest),
                })),
            }));

            const req = new Request('https://api.test/api/v1/friendlies/request-123/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            const response = await handleRequestMatch(req, mockEnv, corsHdrs);
            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/v1/friendlies/match/:id/respond', () => {
        it('should accept a match and create fixtures for both teams', async () => {
            const mockMatch = {
                id: 'match-123',
                request_id: 'request-123',
                requester_tenant_id: 'requester-tenant',
                requester_team_name: 'Requester Team',
                host_tenant_id: 'test-tenant-123',
                host_team_name: 'Host Team',
                proposed_date: '2024-01-20',
            };

            mockEnv.DB.prepare = vi.fn(() => ({
                bind: vi.fn(() => ({
                    first: vi.fn(() => mockMatch),
                    run: vi.fn(() => ({ meta: { changes: 1 } })),
                    all: vi.fn(() => ({ results: [] })),
                })),
            }));

            const req = new Request('https://api.test/api/v1/friendlies/match/match-123/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'accept',
                    confirmed_date: '2024-01-20',
                    confirmed_venue: 'Local Ground',
                }),
            });

            const response = await handleRespondToMatch(req, mockEnv, corsHdrs);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toContain('Fixture created');
        });
    });
});
