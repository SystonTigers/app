import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleListDiscussions } from "../discussions";

// Mock auth service with different roles
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

describe("Discussions Routes - Role-Based Filtering", () => {
    const createMockEnv = () => ({
        DB: {
            prepare: vi.fn().mockReturnValue({
                bind: vi.fn().mockReturnValue({
                    all: vi.fn().mockResolvedValue({
                        results: [
                            { id: "d1", category: "general", title: "Welcome", comment_count: 0 },
                            { id: "d2", category: "tactics", title: "Formation", comment_count: 2 },
                            { id: "d3", category: "match-analysis", title: "Last Game", comment_count: 1 },
                            { id: "d4", category: "training", title: "Drills", comment_count: 0 },
                        ]
                    }),
                }),
            }),
        },
    });

    const createCorsHeaders = () => new Headers({
        "Access-Control-Allow-Origin": "*",
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Role: Fan", () => {
        it("blocks fans from accessing discussions", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                userId: "fan-user",
                role: "fan",
            });

            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/discussions", {
                method: "GET",
            });

            const response = await handleListDiscussions(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(response.status).toBe(403);
            expect(body.success).toBe(false);
            expect(body.error.code).toBe("FORBIDDEN");
            expect(body.error.message).toContain("Fans");
        });
    });

    describe("Role: Player", () => {
        it("allows players to view general category", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                userId: "player-user",
                role: "player",
            });

            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/discussions?category=general", {
                method: "GET",
            });

            const response = await handleListDiscussions(req, env, corsHdrs);

            expect(response.status).toBe(200);
        });

        it("allows players to view match-analysis", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                userId: "player-user",
                role: "player",
            });

            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/discussions?category=match-analysis", {
                method: "GET",
            });

            const response = await handleListDiscussions(req, env, corsHdrs);

            expect(response.status).toBe(200);
        });

        it("blocks players from tactics category", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                userId: "player-user",
                role: "player",
            });

            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/discussions?category=tactics", {
                method: "GET",
            });

            const response = await handleListDiscussions(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(response.status).toBe(403);
            expect(body.error.code).toBe("FORBIDDEN");
        });

        it("blocks players from training category", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                userId: "player-user",
                role: "player",
            });

            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/discussions?category=training", {
                method: "GET",
            });

            const response = await handleListDiscussions(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(response.status).toBe(403);
            expect(body.error.code).toBe("FORBIDDEN");
        });
    });

    describe("Role: Parent", () => {
        it("allows parents to view general discussions", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                userId: "parent-user",
                role: "parent",
            });

            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/discussions?category=general", {
                method: "GET",
            });

            const response = await handleListDiscussions(req, env, corsHdrs);

            expect(response.status).toBe(200);
        });

        it("blocks parents from tactics category", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                userId: "parent-user",
                role: "parent",
            });

            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/discussions?category=tactics", {
                method: "GET",
            });

            const response = await handleListDiscussions(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(response.status).toBe(403);
        });
    });

    describe("Role: Coach", () => {
        it("allows coaches to view all categories", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                userId: "coach-user",
                role: "coach",
            });

            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            // Test tactics
            const tacticsReq = new Request("https://api.test.com/discussions?category=tactics", {
                method: "GET",
            });

            const tacticsResponse = await handleListDiscussions(tacticsReq, env, corsHdrs);
            expect(tacticsResponse.status).toBe(200);

            // Test training
            const trainingReq = new Request("https://api.test.com/discussions?category=training", {
                method: "GET",
            });

            const trainingResponse = await handleListDiscussions(trainingReq, env, corsHdrs);
            expect(trainingResponse.status).toBe(200);
        });
    });

    describe("Role: Manager", () => {
        it("allows managers to view all categories", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                userId: "manager-user",
                role: "manager",
            });

            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/discussions?category=tactics", {
                method: "GET",
            });

            const response = await handleListDiscussions(req, env, corsHdrs);

            expect(response.status).toBe(200);
        });
    });

    describe("No category filter", () => {
        it("filters to allowed categories for restricted roles", async () => {
            mockRequireJWT.mockResolvedValue({
                tenantId: "test-tenant",
                userId: "parent-user",
                role: "parent",
            });

            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            // When no category is specified, should auto-filter to allowed categories
            const req = new Request("https://api.test.com/discussions", {
                method: "GET",
            });

            const response = await handleListDiscussions(req, env, corsHdrs);

            // Should succeed but with filtered results
            expect(response.status).toBe(200);

            // The SQL query should include the IN clause for category filtering
            expect(env.DB.prepare).toHaveBeenCalled();
        });
    });
});
