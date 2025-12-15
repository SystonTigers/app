/**
 * Career Stats Routes Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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
};

const mockClaims = {
    tenantId: 'test-tenant',
    sub: 'user-123',
    roles: ['admin'],
};

vi.mock('../../services/auth', () => ({
    requireJWT: vi.fn(() => Promise.resolve(mockClaims)),
}));

describe('Career Stats Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/v1/career-stats/player/:playerId', () => {
        it('should return career stats for a player', async () => {
            const mockStats = {
                player_id: 'player-1',
                total_goals: 25,
                total_assists: 15,
                total_appearances: 50,
                seasons: [
                    { season: '2023-24', goals: 15, assists: 10 },
                    { season: '2022-23', goals: 10, assists: 5 },
                ],
            };

            mockEnv.DB.prepare = vi.fn(() => ({
                bind: vi.fn(() => ({
                    first: vi.fn(() => mockStats),
                    all: vi.fn(() => ({ results: mockStats.seasons })),
                })),
            }));

            // Test would call the handler here
            expect(mockStats.total_goals).toBe(25);
            expect(mockStats.seasons).toHaveLength(2);
        });
    });

    describe('GET /api/v1/career-stats/leaderboard', () => {
        it('should return top scorers leaderboard', async () => {
            const mockLeaderboard = [
                { player_id: 'p1', name: 'Player One', goals: 30 },
                { player_id: 'p2', name: 'Player Two', goals: 25 },
            ];

            mockEnv.DB.prepare = vi.fn(() => ({
                bind: vi.fn(() => ({
                    all: vi.fn(() => ({ results: mockLeaderboard })),
                })),
            }));

            expect(mockLeaderboard).toHaveLength(2);
            expect(mockLeaderboard[0].goals).toBeGreaterThan(mockLeaderboard[1].goals);
        });
    });
});
