import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    handleFixtureSync,
    handleGetUpcomingFixtures,
    handleGetAllFixtures,
    handleGetResults,
    handleAddResult,
    handleDeleteFixture,
} from "../fixtures";

// Mock auth service
vi.mock("../../services/auth", () => ({
    requireJWT: vi.fn().mockResolvedValue({ tenantId: "test-tenant", roles: ["admin"] }),
}));

// Mock util service
vi.mock("../../services/util", () => ({
    json: (body: any, status = 200, headers?: any) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json", ...(headers || {}) },
        }),
}));

describe("Fixtures Routes", () => {
    const createMockDb = () => ({
        prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            run: vi.fn().mockResolvedValue({ success: true }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            first: vi.fn().mockResolvedValue(null),
        }),
    });

    const createMockEnv = () => ({
        DB: createMockDb(),
    });

    describe("handleFixtureSync", () => {
        it("syncs fixtures from valid request", async () => {
            const env = createMockEnv();
            const req = new Request("https://api.test.com/fixtures/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fixtures: [
                        { date: "2025-01-15", opponent: "Rival FC", venue: "Home Stadium" },
                    ],
                }),
            });

            const response = await handleFixtureSync(req, env);
            const body = await response.json();

            expect(body.success).toBe(true);
            expect(body.synced).toBe(1);
        });

        it("syncs multiple fixtures", async () => {
            const env = createMockEnv();
            const req = new Request("https://api.test.com/fixtures/sync", {
                method: "POST",
                body: JSON.stringify({
                    fixtures: [
                        { date: "2025-01-15", opponent: "Team A" },
                        { date: "2025-01-22", opponent: "Team B" },
                        { date: "2025-01-29", opponent: "Team C" },
                    ],
                }),
            });

            const response = await handleFixtureSync(req, env);
            const body = await response.json();

            expect(body.success).toBe(true);
            expect(body.synced).toBe(3);
        });

        it("handles empty fixtures array", async () => {
            const env = createMockEnv();
            const req = new Request("https://api.test.com/fixtures/sync", {
                method: "POST",
                body: JSON.stringify({ fixtures: [] }),
            });

            const response = await handleFixtureSync(req, env);
            const body = await response.json();

            expect(body.success).toBe(true);
            expect(body.synced).toBe(0);
        });

        it("validates fixture schema", async () => {
            const env = createMockEnv();
            const req = new Request("https://api.test.com/fixtures/sync", {
                method: "POST",
                body: JSON.stringify({ fixtures: "invalid" }),
            });

            const response = await handleFixtureSync(req, env);
            expect(response.status).toBe(500);
        });
    });

    describe("handleGetUpcomingFixtures", () => {
        it("returns upcoming fixtures", async () => {
            const mockResults = [
                { id: "1", date: "2025-01-20", opponent: "Team A" },
                { id: "2", date: "2025-01-27", opponent: "Team B" },
            ];
            const env = createMockEnv();
            (env.DB.prepare as any).mockReturnValue({
                all: vi.fn().mockResolvedValue({ results: mockResults }),
            });

            const req = new Request("https://api.test.com/fixtures/upcoming");
            const response = await handleGetUpcomingFixtures(req, env);
            const body = await response.json();

            expect(Array.isArray(body)).toBe(true);
        });

        it("returns empty array when no fixtures", async () => {
            const env = createMockEnv();
            (env.DB.prepare as any).mockReturnValue({
                all: vi.fn().mockResolvedValue({ results: [] }),
            });

            const req = new Request("https://api.test.com/fixtures/upcoming");
            const response = await handleGetUpcomingFixtures(req, env);
            const body = await response.json();

            expect(body).toEqual([]);
        });
    });

    describe("handleGetAllFixtures", () => {
        it("returns all fixtures with default limit", async () => {
            const env = createMockEnv();
            (env.DB.prepare as any).mockReturnValue({
                bind: vi.fn().mockReturnThis(),
                all: vi.fn().mockResolvedValue({ results: [] }),
            });

            const req = new Request("https://api.test.com/fixtures/all");
            const response = await handleGetAllFixtures(req, env);
            const body = await response.json();

            expect(Array.isArray(body)).toBe(true);
        });

        it("filters by status parameter", async () => {
            const env = createMockEnv();
            const mockPrepare = env.DB.prepare as any;
            mockPrepare.mockReturnValue({
                bind: vi.fn().mockReturnThis(),
                all: vi.fn().mockResolvedValue({ results: [] }),
            });

            const req = new Request("https://api.test.com/fixtures/all?status=scheduled");
            await handleGetAllFixtures(req, env);

            // Verify query was called with status
            expect(mockPrepare).toHaveBeenCalled();
        });

        it("respects limit parameter", async () => {
            const env = createMockEnv();
            (env.DB.prepare as any).mockReturnValue({
                bind: vi.fn().mockReturnThis(),
                all: vi.fn().mockResolvedValue({ results: [] }),
            });

            const req = new Request("https://api.test.com/fixtures/all?limit=10");
            const response = await handleGetAllFixtures(req, env);

            expect(response.status).toBe(200);
        });
    });

    describe("handleGetResults", () => {
        it("returns recent results", async () => {
            const mockResults = [
                { id: "1", date: "2025-01-10", homeScore: 2, awayScore: 1 },
            ];
            const env = createMockEnv();
            (env.DB.prepare as any).mockReturnValue({
                bind: vi.fn().mockReturnThis(),
                all: vi.fn().mockResolvedValue({ results: mockResults }),
            });

            const req = new Request("https://api.test.com/fixtures/results");
            const response = await handleGetResults(req, env);
            const body = await response.json();

            expect(Array.isArray(body)).toBe(true);
        });

        it("respects limit parameter", async () => {
            const env = createMockEnv();
            (env.DB.prepare as any).mockReturnValue({
                bind: vi.fn().mockReturnThis(),
                all: vi.fn().mockResolvedValue({ results: [] }),
            });

            const req = new Request("https://api.test.com/fixtures/results?limit=5");
            const response = await handleGetResults(req, env);

            expect(response.status).toBe(200);
        });
    });

    describe("handleAddResult", () => {
        it("adds a new result", async () => {
            const env = createMockEnv();
            const req = new Request("https://api.test.com/fixtures/results", {
                method: "POST",
                body: JSON.stringify({
                    date: "2025-01-10",
                    opponent: "Rival FC",
                    homeScore: 3,
                    awayScore: 1,
                }),
            });

            const response = await handleAddResult(req, env);
            const body = await response.json();

            expect(body.success).toBe(true);
        });

        it("validates result schema", async () => {
            const env = createMockEnv();
            const req = new Request("https://api.test.com/fixtures/results", {
                method: "POST",
                body: JSON.stringify({}),
            });

            const response = await handleAddResult(req, env);
            // Missing required fields should cause validation error
            expect(response.status).toBe(500);
        });
    });

    describe("handleDeleteFixture", () => {
        it("deletes fixture by ID", async () => {
            const env = createMockEnv();
            const req = new Request("https://api.test.com/fixtures/abc123", {
                method: "DELETE",
            });

            const response = await handleDeleteFixture(req, env, "abc123");
            const body = await response.json();

            expect(body.success).toBe(true);
        });
    });
});
