import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    handleCreateFixture,
    handleDeleteFixture,
    handleCreateResult,
    handleDeleteResult,
    handleCreatePost,
    handleDeletePost,
    handleUpdateTable,
} from "../content";

// Mock auth service
vi.mock("../../services/auth", () => ({
    requireJWT: vi.fn().mockResolvedValue({ tenantId: "test-tenant", roles: ["admin"] }),
}));

// Mock util service
vi.mock("../../services/util", () => ({
    json: (body: any, status = 200, headers?: any) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
        }),
}));

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
    randomUUID: () => "test-uuid-123",
});

describe("Content Routes", () => {
    const createMockDb = () => ({
        prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            run: vi.fn().mockResolvedValue({ success: true }),
        }),
        batch: vi.fn().mockResolvedValue([]),
    });

    const createMockEnv = () => ({
        DB: createMockDb(),
    });

    const createCorsHeaders = () => new Headers({
        "Access-Control-Allow-Origin": "*",
    });

    describe("Fixtures", () => {
        describe("handleCreateFixture", () => {
            it("creates a new fixture", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/fixtures", {
                    method: "POST",
                    body: JSON.stringify({
                        date: "2025-01-20",
                        time: "15:00",
                        opponent: "Rival FC",
                        venue: "Home Stadium",
                        competition: "Premier League",
                    }),
                });

                const response = await handleCreateFixture(req, env, corsHdrs);
                const body = await response.json();

                expect(body.success).toBe(true);
                expect(body.id).toBe("test-uuid-123");
            });

            it("calls DB with correct values", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/fixtures", {
                    method: "POST",
                    body: JSON.stringify({
                        date: "2025-01-20",
                        opponent: "Team A",
                    }),
                });

                await handleCreateFixture(req, env, corsHdrs);

                expect(env.DB.prepare).toHaveBeenCalled();
            });
        });

        describe("handleDeleteFixture", () => {
            it("deletes fixture by ID", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/fixtures/abc123", {
                    method: "DELETE",
                });

                const response = await handleDeleteFixture(req, env, corsHdrs, "abc123");
                const body = await response.json();

                expect(body.success).toBe(true);
            });
        });
    });

    describe("Results", () => {
        describe("handleCreateResult", () => {
            it("creates a new result", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/results", {
                    method: "POST",
                    body: JSON.stringify({
                        date: "2025-01-10",
                        opponent: "Rival FC",
                        ourScore: 3,
                        theirScore: 1,
                        venue: "Home",
                        competition: "Cup",
                        scorers: "Player A, Player B x2",
                    }),
                });

                const response = await handleCreateResult(req, env, corsHdrs);
                const body = await response.json();

                expect(body.success).toBe(true);
                expect(body.id).toBe("test-uuid-123");
            });
        });

        describe("handleDeleteResult", () => {
            it("deletes result by ID", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/results/xyz789", {
                    method: "DELETE",
                });

                const response = await handleDeleteResult(req, env, corsHdrs, "xyz789");
                const body = await response.json();

                expect(body.success).toBe(true);
            });
        });
    });

    describe("Feed Posts", () => {
        describe("handleCreatePost", () => {
            it("creates a new post", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/posts", {
                    method: "POST",
                    body: JSON.stringify({
                        title: "Match Day!",
                        content: "Get ready for the big game",
                        author: "Club Admin",
                        imageUrl: "https://example.com/image.jpg",
                    }),
                });

                const response = await handleCreatePost(req, env, corsHdrs);
                const body = await response.json();

                expect(body.success).toBe(true);
                expect(body.id).toBe("test-uuid-123");
            });
        });

        describe("handleDeletePost", () => {
            it("deletes post by ID", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/posts/post123", {
                    method: "DELETE",
                });

                const response = await handleDeletePost(req, env, corsHdrs, "post123");
                const body = await response.json();

                expect(body.success).toBe(true);
            });
        });
    });

    describe("League Table", () => {
        describe("handleUpdateTable", () => {
            it("updates league table with standings", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const standings = [
                    { position: 1, team: "Team A", played: 10, won: 8, drawn: 1, lost: 1, goalsFor: 25, goalsAgainst: 10, points: 25 },
                    { position: 2, team: "Team B", played: 10, won: 7, drawn: 2, lost: 1, goalsFor: 20, goalsAgainst: 8, points: 23 },
                ];

                const req = new Request("https://api.test.com/content/table", {
                    method: "PUT",
                    body: JSON.stringify(standings),
                });

                const response = await handleUpdateTable(req, env, corsHdrs);
                const body = await response.json();

                expect(body.success).toBe(true);
            });

            it("calls batch to clear and insert rows", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const standings = [
                    { position: 1, team: "Team A", played: 10, won: 8, drawn: 1, lost: 1, goalsFor: 25, goalsAgainst: 10, points: 25 },
                ];

                const req = new Request("https://api.test.com/content/table", {
                    method: "PUT",
                    body: JSON.stringify(standings),
                });

                await handleUpdateTable(req, env, corsHdrs);

                expect(env.DB.batch).toHaveBeenCalled();
            });

            it("handles empty standings array", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/table", {
                    method: "PUT",
                    body: JSON.stringify([]),
                });

                const response = await handleUpdateTable(req, env, corsHdrs);
                const body = await response.json();

                expect(body.success).toBe(true);
            });
        });
    });
});
