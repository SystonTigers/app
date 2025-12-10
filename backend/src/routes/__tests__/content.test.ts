import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    handleCreateFixture,
    handleDeleteFixture,
    handleUpdateFixture,
    handleGetFixture,
    handleCreateResult,
    handleDeleteResult,
    handleUpdateResult,
    handleGetResult,
    handleCreatePost,
    handleDeletePost,
    handleUpdatePost,
    handleGetPost,
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
    const createMockDb = (firstResult?: any) => ({
        prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            run: vi.fn().mockResolvedValue({ success: true }),
            first: vi.fn().mockResolvedValue(firstResult),
        }),
        batch: vi.fn().mockResolvedValue([]),
    });

    const createMockEnv = (firstResult?: any) => ({
        DB: createMockDb(firstResult),
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
                const body = await response.json() as any;

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
                const body = await response.json() as any;

                expect(body.success).toBe(true);
            });
        });

        describe("handleUpdateFixture", () => {
            it("updates fixture with new values", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/fixtures/abc123", {
                    method: "PATCH",
                    body: JSON.stringify({
                        opponent: "New Rival FC",
                        venue: "Away Stadium",
                    }),
                });

                const response = await handleUpdateFixture(req, env, corsHdrs, "abc123");
                const body = await response.json() as any;

                expect(body.success).toBe(true);
            });

            it("returns error when no fields provided", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/fixtures/abc123", {
                    method: "PATCH",
                    body: JSON.stringify({}),
                });

                const response = await handleUpdateFixture(req, env, corsHdrs, "abc123");
                const body = await response.json() as any;

                expect(body.success).toBe(false);
                expect(body.error).toBe("No fields to update");
            });

            it("updates multiple fields at once", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/fixtures/abc123", {
                    method: "PATCH",
                    body: JSON.stringify({
                        date: "2025-02-15",
                        time: "19:30",
                        opponent: "Updated FC",
                        status: "completed",
                        homeScore: 2,
                        awayScore: 1,
                    }),
                });

                const response = await handleUpdateFixture(req, env, corsHdrs, "abc123");
                const body = await response.json() as any;

                expect(body.success).toBe(true);
                expect(env.DB.prepare).toHaveBeenCalled();
            });
        });

        describe("handleGetFixture", () => {
            it("returns fixture when found", async () => {
                const mockFixture = {
                    id: "abc123",
                    opponent: "Rival FC",
                    fixture_date: "2025-01-20",
                    venue: "Home Stadium",
                };
                const env = createMockEnv(mockFixture);
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/fixtures/abc123");

                const response = await handleGetFixture(req, env, corsHdrs, "abc123");
                const body = await response.json() as any;

                expect(body.success).toBe(true);
                expect(body.data.opponent).toBe("Rival FC");
            });

            it("returns 404 when fixture not found", async () => {
                const env = createMockEnv(null);
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/fixtures/notfound");

                const response = await handleGetFixture(req, env, corsHdrs, "notfound");
                const body = await response.json() as any;

                expect(body.success).toBe(false);
                expect(body.error).toBe("Fixture not found");
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
                const body = await response.json() as any;

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
                const body = await response.json() as any;

                expect(body.success).toBe(true);
            });
        });

        describe("handleUpdateResult", () => {
            it("updates result with new score", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/results/xyz789", {
                    method: "PATCH",
                    body: JSON.stringify({
                        ourScore: 4,
                        theirScore: 2,
                        scorers: "Player A x2, Player B x2",
                    }),
                });

                const response = await handleUpdateResult(req, env, corsHdrs, "xyz789");
                const body = await response.json() as any;

                expect(body.success).toBe(true);
            });

            it("returns error when no fields provided", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/results/xyz789", {
                    method: "PATCH",
                    body: JSON.stringify({}),
                });

                const response = await handleUpdateResult(req, env, corsHdrs, "xyz789");
                const body = await response.json() as any;

                expect(body.success).toBe(false);
                expect(body.error).toBe("No fields to update");
            });
        });

        describe("handleGetResult", () => {
            it("returns result when found", async () => {
                const mockResult = {
                    id: "xyz789",
                    opponent: "Rival FC",
                    our_score: 3,
                    their_score: 1,
                };
                const env = createMockEnv(mockResult);
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/results/xyz789");

                const response = await handleGetResult(req, env, corsHdrs, "xyz789");
                const body = await response.json() as any;

                expect(body.success).toBe(true);
                expect(body.data.our_score).toBe(3);
            });

            it("returns 404 when result not found", async () => {
                const env = createMockEnv(null);
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/results/notfound");

                const response = await handleGetResult(req, env, corsHdrs, "notfound");
                const body = await response.json() as any;

                expect(body.success).toBe(false);
                expect(body.error).toBe("Result not found");
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
                const body = await response.json() as any;

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
                const body = await response.json() as any;

                expect(body.success).toBe(true);
            });
        });

        describe("handleUpdatePost", () => {
            it("updates post content", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/posts/post123", {
                    method: "PATCH",
                    body: JSON.stringify({
                        title: "Updated Title",
                        content: "Updated content here",
                    }),
                });

                const response = await handleUpdatePost(req, env, corsHdrs, "post123");
                const body = await response.json() as any;

                expect(body.success).toBe(true);
            });

            it("returns error when no fields provided", async () => {
                const env = createMockEnv();
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/posts/post123", {
                    method: "PATCH",
                    body: JSON.stringify({}),
                });

                const response = await handleUpdatePost(req, env, corsHdrs, "post123");
                const body = await response.json() as any;

                expect(body.success).toBe(false);
                expect(body.error).toBe("No fields to update");
            });
        });

        describe("handleGetPost", () => {
            it("returns post when found", async () => {
                const mockPost = {
                    id: "post123",
                    title: "Match Day!",
                    content: "Get ready",
                    author: "Admin",
                };
                const env = createMockEnv(mockPost);
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/posts/post123");

                const response = await handleGetPost(req, env, corsHdrs, "post123");
                const body = await response.json() as any;

                expect(body.success).toBe(true);
                expect(body.data.title).toBe("Match Day!");
            });

            it("returns 404 when post not found", async () => {
                const env = createMockEnv(null);
                const corsHdrs = createCorsHeaders();

                const req = new Request("https://api.test.com/content/posts/notfound");

                const response = await handleGetPost(req, env, corsHdrs, "notfound");
                const body = await response.json() as any;

                expect(body.success).toBe(false);
                expect(body.error).toBe("Post not found");
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
                const body = await response.json() as any;

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
                const body = await response.json() as any;

                expect(body.success).toBe(true);
            });
        });
    });
});
