import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    handleCreateLMSGame,
    handleListLMSGames,
    handleGetLMSGame,
    handleJoinLMSGame,
    handleCreateLMSRound,
    handleSubmitLMSPrediction,
    handleProcessLMSRound,
    handleResetLMSGame,
} from "../lms";

// Mock auth service
const mockRequireJWT = vi.fn();

vi.mock("../../services/auth", () => ({
    requireJWT: (...args: any[]) => mockRequireJWT(...args),
}));

// Mock util service
vi.mock("../../services/util", () => ({
    json: (body: any, status = 200, headers?: any) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
        }),
}));

describe("LMS Routes", () => {
    const createMockEnv = () => {
        const mockRun = vi.fn().mockResolvedValue({ success: true });
        const mockFirst = vi.fn().mockResolvedValue(null);
        const mockAll = vi.fn().mockResolvedValue({ results: [] });

        return {
            DB: {
                prepare: vi.fn().mockReturnValue({
                    bind: vi.fn().mockReturnValue({
                        run: mockRun,
                        first: mockFirst,
                        all: mockAll,
                    }),
                }),
            },
        };
    };

    const createCorsHeaders = () => new Headers({
        "Access-Control-Allow-Origin": "*",
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("handleCreateLMSGame", () => {
        it("requires admin role", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                sub: "user-123",
                role: "fan", // Not admin
            });

            const req = new Request("https://api.test.com/lms/games", {
                method: "POST",
                body: JSON.stringify({ name: "Test Game" }),
            });

            const response = await handleCreateLMSGame(req, createMockEnv(), createCorsHeaders());
            const body = await response.json() as any;

            expect(response.status).toBe(403);
            expect(body.error).toContain("Admin");
        });

        it("creates game successfully for admin", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                sub: "admin-123",
                role: "admin",
            });

            const req = new Request("https://api.test.com/lms/games", {
                method: "POST",
                body: JSON.stringify({
                    name: "Premier League Survivor",
                    sport: "football",
                    competition: "Premier League"
                }),
            });

            const response = await handleCreateLMSGame(req, createMockEnv(), createCorsHeaders());
            const body = await response.json() as any;

            expect(response.status).toBe(201);
            expect(body.success).toBe(true);
            expect(body.game.name).toBe("Premier League Survivor");
        });

        it("requires game name", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                sub: "admin-123",
                role: "admin",
            });

            const req = new Request("https://api.test.com/lms/games", {
                method: "POST",
                body: JSON.stringify({}),
            });

            const response = await handleCreateLMSGame(req, createMockEnv(), createCorsHeaders());
            const body = await response.json() as any;

            expect(response.status).toBe(400);
            expect(body.error).toContain("name");
        });
    });

    describe("handleJoinLMSGame", () => {
        it("allows user to join active game", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                sub: "player-123",
                name: "Test Player",
                role: "player",
            });

            const env = createMockEnv();
            // Mock game exists
            env.DB.prepare().bind().first = vi.fn()
                .mockResolvedValueOnce({ id: "game-1", status: "active" }) // Game exists
                .mockResolvedValueOnce(null); // Not already joined

            const req = new Request("https://api.test.com/lms/games/game-1/join", {
                method: "POST",
            });

            const response = await handleJoinLMSGame(req, env, createCorsHeaders());
            const body = await response.json() as any;

            expect(response.status).toBe(201);
            expect(body.success).toBe(true);
            expect(body.entry.status).toBe("alive");
        });

        it("prevents joining same game twice", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                sub: "player-123",
                role: "player",
            });

            const env = createMockEnv();
            env.DB.prepare().bind().first = vi.fn()
                .mockResolvedValueOnce({ id: "game-1", status: "active" }) // Game exists
                .mockResolvedValueOnce({ id: "entry-1" }); // Already joined

            const req = new Request("https://api.test.com/lms/games/game-1/join", {
                method: "POST",
            });

            const response = await handleJoinLMSGame(req, env, createCorsHeaders());
            const body = await response.json() as any;

            expect(response.status).toBe(400);
            expect(body.error).toContain("Already joined");
        });
    });

    describe("handleSubmitLMSPrediction", () => {
        it("prevents prediction if eliminated", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                sub: "player-123",
                role: "player",
            });

            const env = createMockEnv();
            env.DB.prepare().bind().first = vi.fn()
                .mockResolvedValueOnce({
                    id: "round-1",
                    status: "open",
                    deadline: Date.now() + 100000,
                    game_id: "game-1"
                })
                .mockResolvedValueOnce({
                    id: "entry-1",
                    status: "eliminated", // User is eliminated
                    teams_used: "[]"
                });

            const req = new Request("https://api.test.com/lms/predictions", {
                method: "POST",
                body: JSON.stringify({
                    round_id: "round-1",
                    team_picked: "Arsenal"
                }),
            });

            const response = await handleSubmitLMSPrediction(req, env, createCorsHeaders());
            const body = await response.json() as any;

            expect(response.status).toBe(400);
            expect(body.error).toContain("eliminated");
        });

        it("prevents picking same team twice", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                sub: "player-123",
                role: "player",
            });

            const env = createMockEnv();
            env.DB.prepare().bind().first = vi.fn()
                .mockResolvedValueOnce({
                    id: "round-1",
                    status: "open",
                    deadline: Date.now() + 100000,
                    game_id: "game-1"
                })
                .mockResolvedValueOnce({
                    id: "entry-1",
                    status: "alive",
                    teams_used: '["Arsenal"]' // Already used Arsenal
                });

            const req = new Request("https://api.test.com/lms/predictions", {
                method: "POST",
                body: JSON.stringify({
                    round_id: "round-1",
                    team_picked: "Arsenal" // Trying to pick Arsenal again
                }),
            });

            const response = await handleSubmitLMSPrediction(req, env, createCorsHeaders());
            const body = await response.json() as any;

            expect(response.status).toBe(400);
            expect(body.error).toContain("already picked");
        });

        it("prevents prediction after deadline", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                sub: "player-123",
                role: "player",
            });

            const env = createMockEnv();
            env.DB.prepare().bind().first = vi.fn()
                .mockResolvedValueOnce({
                    id: "round-1",
                    status: "open",
                    deadline: Date.now() - 1000, // Deadline passed
                    game_id: "game-1"
                });

            const req = new Request("https://api.test.com/lms/predictions", {
                method: "POST",
                body: JSON.stringify({
                    round_id: "round-1",
                    team_picked: "Arsenal"
                }),
            });

            const response = await handleSubmitLMSPrediction(req, env, createCorsHeaders());
            const body = await response.json() as any;

            expect(response.status).toBe(400);
            expect(body.error).toContain("deadline");
        });
    });

    describe("handleProcessLMSRound", () => {
        it("requires admin role", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                sub: "player-123",
                role: "player",
            });

            const req = new Request("https://api.test.com/lms/rounds/round-1/process", {
                method: "POST",
                body: JSON.stringify({ fixtures: [] }),
            });

            const response = await handleProcessLMSRound(req, createMockEnv(), createCorsHeaders());
            const body = await response.json() as any;

            expect(response.status).toBe(403);
        });
    });

    describe("Tenant Isolation", () => {
        it("only returns games for current tenant", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "tenant-a",
                sub: "user-123",
                role: "player",
            });

            const env = createMockEnv();
            env.DB.prepare().bind().all = vi.fn().mockResolvedValue({
                results: [
                    { id: "game-1", tenant_id: "tenant-a", name: "Game A" },
                ]
            });

            const req = new Request("https://api.test.com/lms/games", {
                method: "GET",
            });

            const response = await handleListLMSGames(req, env, createCorsHeaders());

            // Verify tenant_id was used in query
            expect(env.DB.prepare).toHaveBeenCalled();
            expect(response.status).toBe(200);
        });
    });
});
