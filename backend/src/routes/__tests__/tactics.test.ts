
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSaveTactics, handleGetTactics } from '../tactics';

// Mock dependencies
const mockEnv = {
    DB: {
        prepare: vi.fn(),
    },
    JWT_SECRET: 'test-secret',
};

// Mock requireJWT
vi.mock('../../services/auth', () => ({
    requireJWT: vi.fn().mockResolvedValue({ tenantId: 'test-tenant', userId: 'test-user' }),
}));

describe('Tactics Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('handleSaveTactics', () => {
        it('should save valid tactics', async () => {
            const req = new Request('http://localhost/api/v1/tactics', {
                method: 'POST',
                body: JSON.stringify({
                    formation: '3-4-2-1',
                    playingStyle: 'High Press',
                    pressingIntensity: 'high',
                    buildUpPlay: 'short',
                    defensiveLine: 'high',
                    phases: {
                        attacking: { width: 'wide' },
                        defensive: { width: 'narrow' }
                    }
                }),
            });

            const mockRun = vi.fn();
            const mockBind = vi.fn().mockReturnValue({ run: mockRun });
            mockEnv.DB.prepare.mockReturnValue({ bind: mockBind });

            const res = await handleSaveTactics(req, mockEnv, new Headers());
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.success).toBe(true);

            expect(mockEnv.DB.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO team_tactics'));
            expect(mockBind).toHaveBeenCalledWith(
                'test-tenant',
                '3-4-2-1',
                expect.stringContaining('"formation":"3-4-2-1"'),
                expect.any(Number)
            );
        });

        it('should reject invalid tactics', async () => {
            const req = new Request('http://localhost/api/v1/tactics', {
                method: 'POST',
                body: JSON.stringify({
                    formation: '3-4-2-1',
                    // Missing required fields
                }),
            });

            const res = await handleSaveTactics(req, mockEnv, new Headers());
            expect(res.status).toBe(500);
        });
    });

    describe('handleGetTactics', () => {
        it('should return saved tactics', async () => {
            const req = new Request('http://localhost/api/v1/tactics', {
                method: 'GET',
            });

            const mockConfig = { formation: '3-4-2-1', playingStyle: 'High Press' };
            const mockBind = vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue({ config: JSON.stringify(mockConfig) })
            });
            mockEnv.DB.prepare.mockReturnValue({ bind: mockBind });

            const res = await handleGetTactics(req, mockEnv, new Headers());
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.success).toBe(true);
            expect(data.data).toEqual(mockConfig);
        });

        it('should return null if no tactics saved', async () => {
            const req = new Request('http://localhost/api/v1/tactics', {
                method: 'GET',
            });

            const mockBind = vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue(null)
            });
            mockEnv.DB.prepare.mockReturnValue({ bind: mockBind });

            const res = await handleGetTactics(req, mockEnv, new Headers());
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.data).toBeNull();
        });
    });
});
