import { describe, it, expect, vi, beforeEach } from "vitest";
import { handlePublicTenantRequest } from "../public";

// Mock log module
vi.mock("../../lib/log", () => ({
    logJSON: vi.fn(),
}));

// Mock util service
vi.mock("../../services/util", () => ({
    json: (body: any, status = 200, headers?: any) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
        }),
}));

describe("Public Routes", () => {
    const createMockDb = () => ({
        prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            all: vi.fn().mockResolvedValue({ results: [] }),
            first: vi.fn().mockResolvedValue(null),
        }),
    });

    const createMockKv = () => ({
        get: vi.fn().mockResolvedValue(null),
    });

    const createMockEnv = () => ({
        DB: createMockDb(),
        KV_IDEMP: createMockKv(),
    });

    const createCorsHeaders = () => new Headers({
        "Access-Control-Allow-Origin": "*",
    });

    describe("handlePublicTenantRequest", () => {
        it("returns null for non-GET requests", async () => {
            const env = createMockEnv();
            const req = new Request("https://api.test.com/public/tenant/fixtures", {
                method: "POST",
            });
            const url = new URL(req.url);
            const corsHdrs = createCorsHeaders();

            const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

            expect(response).toBeNull();
        });

        it("returns null for non-public routes", async () => {
            const env = createMockEnv();
            const req = new Request("https://api.test.com/api/fixtures");
            const url = new URL(req.url);
            const corsHdrs = createCorsHeaders();

            const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

            expect(response).toBeNull();
        });

        it("returns 404 for invalid route structure", async () => {
            const env = createMockEnv();
            const req = new Request("https://api.test.com/public/");
            const url = new URL(req.url);
            const corsHdrs = createCorsHeaders();

            const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

            expect(response).not.toBeNull();
            const body = await response!.json() as any;
            expect(body.success).toBe(false);
            expect(body.error.code).toBe("NOT_FOUND");
        });

        it("returns 404 for unknown tenant", async () => {
            const env = createMockEnv();
            const req = new Request("https://api.test.com/public/unknown-tenant/fixtures");
            const url = new URL(req.url);
            const corsHdrs = createCorsHeaders();

            const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

            expect(response).not.toBeNull();
            const body = await response!.json() as any;
            expect(body.success).toBe(false);
            expect(body.error.code).toBe("TENANT_NOT_FOUND");
        });

        describe("with valid tenant", () => {
            const setupTenantMock = (env: any) => {
                (env.DB.prepare as any).mockImplementation((query: string) => {
                    if (query.includes("FROM tenants")) {
                        return {
                            bind: vi.fn().mockReturnThis(),
                            first: vi.fn().mockResolvedValue({
                                id: "tenant-123",
                                slug: "test-club",
                                name: "Test FC",
                            }),
                        };
                    }
                    return {
                        bind: vi.fn().mockReturnThis(),
                        all: vi.fn().mockResolvedValue({ results: [] }),
                        first: vi.fn().mockResolvedValue(null),
                    };
                });
            };

            it("returns fixtures list", async () => {
                const env = createMockEnv();
                setupTenantMock(env);

                const req = new Request("https://api.test.com/public/test-club/fixtures");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(true);
                expect(body.data).toBeDefined();
            });

            it("returns next fixture", async () => {
                const env = createMockEnv();
                setupTenantMock(env);

                const req = new Request("https://api.test.com/public/test-club/fixtures/next");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(true);
            });

            it("returns feed posts", async () => {
                const env = createMockEnv();
                setupTenantMock(env);

                const req = new Request("https://api.test.com/public/test-club/feed");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(true);
                expect(body.data).toBeDefined();
            });

            it("returns league table", async () => {
                const env = createMockEnv();
                setupTenantMock(env);

                const req = new Request("https://api.test.com/public/test-club/table");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(true);
            });

            it("returns team stats", async () => {
                const env = createMockEnv();
                setupTenantMock(env);

                const req = new Request("https://api.test.com/public/test-club/stats");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(true);
            });

            it("returns squad list", async () => {
                const env = createMockEnv();
                setupTenantMock(env);

                const req = new Request("https://api.test.com/public/test-club/squad");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(true);
                expect(body.data).toBeDefined();
            });

            it("returns 404 for unknown resource", async () => {
                const env = createMockEnv();
                setupTenantMock(env);

                const req = new Request("https://api.test.com/public/test-club/unknown-resource");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(false);
                expect(body.error.code).toBe("NOT_FOUND");
            });

            it("respects limit parameter for fixtures", async () => {
                const env = createMockEnv();
                setupTenantMock(env);

                const req = new Request("https://api.test.com/public/test-club/fixtures?limit=5");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(true);
            });

            it("returns results when status=completed", async () => {
                const env = createMockEnv();
                setupTenantMock(env);

                const req = new Request("https://api.test.com/public/test-club/fixtures?status=completed");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(true);
            });

            it("supports page and pageSize for feed", async () => {
                const env = createMockEnv();
                setupTenantMock(env);

                const req = new Request("https://api.test.com/public/test-club/feed?page=2&pageSize=5");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(true);
            });

            it("supports competition filter for table", async () => {
                const env = createMockEnv();
                setupTenantMock(env);

                const req = new Request("https://api.test.com/public/test-club/table?competition=Premier%20League");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(true);
            });
        });

        describe("tenant resolution", () => {
            it("resolves tenant by slug", async () => {
                const env = createMockEnv();
                (env.DB.prepare as any).mockImplementation((query: string) => {
                    if (query.includes("LOWER(slug)")) {
                        return {
                            bind: vi.fn().mockReturnThis(),
                            first: vi.fn().mockResolvedValue({
                                id: "tenant-by-slug",
                                slug: "my-club",
                                name: "My Club FC",
                            }),
                        };
                    }
                    return {
                        bind: vi.fn().mockReturnThis(),
                        all: vi.fn().mockResolvedValue({ results: [] }),
                        first: vi.fn().mockResolvedValue(null),
                    };
                });

                const req = new Request("https://api.test.com/public/my-club/fixtures");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(true);
            });

            it("falls back to KV lookup", async () => {
                const env = createMockEnv();
                (env.KV_IDEMP.get as any).mockResolvedValue(
                    JSON.stringify({ id: "kv-tenant", slug: "kv-club", name: "KV Club" })
                );

                const req = new Request("https://api.test.com/public/kv-club/fixtures");
                const url = new URL(req.url);
                const corsHdrs = createCorsHeaders();

                const response = await handlePublicTenantRequest(req, env, url, corsHdrs, "req-123");

                expect(response).not.toBeNull();
                const body = await response!.json() as any;
                expect(body.success).toBe(true);
            });
        });
    });
});
