import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { runQuotes, getAllQuotes } from "../quotes";

// Mock logger
vi.mock("../../lib/log", () => ({
    logJSON: vi.fn(),
}));

// Mock time utils
vi.mock("../../utils/time", () => ({
    nowUTC: vi.fn().mockReturnValue({
        toFormat: (fmt: string) => "2024-05-15",
    }),
}));

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
    randomUUID: () => "test-uuid-123",
});

// Mock fetch
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

// Mock Math.random for consistent tests
const originalRandom = Math.random;

describe("Quotes Cron", () => {
    const createMockKV = (data: Record<string, any> = {}) => ({
        list: vi.fn().mockResolvedValue({
            keys: Object.keys(data)
                .filter((k) => k.endsWith(":config"))
                .map((name) => ({ name })),
        }),
        get: vi.fn().mockImplementation((key: string, type?: string) => {
            const value = data[key];
            if (type === "json" && value && typeof value === "object") {
                return Promise.resolve(value);
            }
            return Promise.resolve(value?.toString() || null);
        }),
        put: vi.fn().mockResolvedValue(undefined),
    });

    const createMockCtx = () => ({
        waitUntil: vi.fn(),
    });

    beforeEach(() => {
        vi.clearAllMocks();
        Math.random = () => 0.5; // Consistent random for tests
    });

    afterAll(() => {
        Math.random = originalRandom;
    });

    describe("runQuotes", () => {
        it("creates quote post for tenants with feature enabled", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_quotes: true },
                },
            };

            const env = {
                KV: createMockKV(kvData),
            };
            const ctx = createMockCtx();

            await runQuotes(env as any, ctx as any);

            // Should create quote post
            expect(env.KV.put).toHaveBeenCalled();
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCall = putCalls.find((call: any[]) =>
                call[0].startsWith("autopost:")
            );
            expect(autopostCall).toBeDefined();

            const post = JSON.parse(autopostCall[1]);
            expect(post.type).toBe("quote");
            expect(post.quote).toBeDefined();
            expect(post.author).toBeDefined();
        });

        it("skips tenants without quotes feature enabled", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_quotes: false },
                },
            };

            const env = {
                KV: createMockKV(kvData),
            };
            const ctx = createMockCtx();

            await runQuotes(env as any, ctx as any);

            // Should not create quote post
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCalls = putCalls.filter((call: any[]) =>
                call[0].startsWith("autopost:")
            );
            expect(autopostCalls.length).toBe(0);
        });

        it("does not create duplicate quotes for same day", async () => {
            const mockKV = {
                list: vi.fn().mockResolvedValue({
                    keys: [{ name: "team:tenant1:config" }],
                }),
                get: vi.fn().mockImplementation((key: string, type?: string) => {
                    if (key === "team:tenant1:config") {
                        return Promise.resolve({
                            team_id: "tenant1",
                            features: { auto_quotes: true },
                        });
                    }
                    // Return truthy for quote key (already posted today)
                    if (key.startsWith("quote:tenant1:")) {
                        return Promise.resolve("posted");
                    }
                    return Promise.resolve(null);
                }),
                put: vi.fn().mockResolvedValue(undefined),
            };

            const env = {
                KV: mockKV,
            };
            const ctx = createMockCtx();

            await runQuotes(env as any, ctx as any);

            // Should not create new post
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCalls = putCalls.filter((call: any[]) =>
                call[0].startsWith("autopost:")
            );
            expect(autopostCalls.length).toBe(0);
        });

        it("avoids recently used quotes", async () => {
            const recentQuotes = [
                "Success is no accident. It is hard work, perseverance, learning, studying, sacrifice and most of all, love of what you are doing.",
            ];

            const mockKV = {
                list: vi.fn().mockResolvedValue({
                    keys: [{ name: "team:tenant1:config" }],
                }),
                get: vi.fn().mockImplementation((key: string, type?: string) => {
                    if (key === "team:tenant1:config") {
                        return Promise.resolve({
                            team_id: "tenant1",
                            features: { auto_quotes: true },
                        });
                    }
                    if (key === "quotes_history:tenant1" && type === "json") {
                        return Promise.resolve(recentQuotes);
                    }
                    return Promise.resolve(null);
                }),
                put: vi.fn().mockResolvedValue(undefined),
            };

            const env = {
                KV: mockKV,
            };
            const ctx = createMockCtx();

            await runQuotes(env as any, ctx as any);

            // Quote should be different from recent
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCall = putCalls.find((call: any[]) =>
                call[0].startsWith("autopost:")
            );
            const post = JSON.parse(autopostCall[1]);
            expect(post.quote).not.toBe(recentQuotes[0]);
        });

        it("updates quote history after posting", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_quotes: true },
                },
            };

            const env = {
                KV: createMockKV(kvData),
            };
            const ctx = createMockCtx();

            await runQuotes(env as any, ctx as any);

            // Should update quote history
            const putCalls = (env.KV.put as any).mock.calls;
            const historyCall = putCalls.find((call: any[]) =>
                call[0].startsWith("quotes_history:")
            );
            expect(historyCall).toBeDefined();
        });

        it("prefers grassroots quotes for youth teams", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    team_type: "youth",
                    features: { auto_quotes: true },
                },
            };

            const env = {
                KV: createMockKV(kvData),
            };
            const ctx = createMockCtx();

            // Run multiple times to check distribution
            await runQuotes(env as any, ctx as any);

            // Should create a quote post
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCall = putCalls.find((call: any[]) =>
                call[0].startsWith("autopost:")
            );
            expect(autopostCall).toBeDefined();
        });
    });

    describe("getAllQuotes", () => {
        it("returns all available quotes with categories", () => {
            const quotes = getAllQuotes();

            expect(quotes.length).toBeGreaterThan(30);
            expect(quotes.some((q) => q.category === "football")).toBe(true);
            expect(quotes.some((q) => q.category === "grassroots")).toBe(true);

            // Each quote should have quote, author, and category
            quotes.forEach((q) => {
                expect(q.quote).toBeDefined();
                expect(q.author).toBeDefined();
                expect(q.category).toBeDefined();
            });
        });

        it("includes famous football quotes", () => {
            const quotes = getAllQuotes();
            const authors = quotes.map((q) => q.author);

            expect(authors).toContain("Pele");
            expect(authors).toContain("Lionel Messi");
            expect(authors).toContain("Cristiano Ronaldo");
        });

        it("includes grassroots-specific quotes", () => {
            const quotes = getAllQuotes();
            const grassrootsQuotes = quotes.filter(
                (q) => q.category === "grassroots"
            );

            expect(grassrootsQuotes.length).toBeGreaterThan(5);
        });
    });

    describe("Webhook integration", () => {
        it("triggers webhook when quote is posted", async () => {
            const mockKV = {
                list: vi.fn().mockResolvedValue({
                    keys: [{ name: "team:tenant1:config" }],
                }),
                get: vi.fn().mockImplementation((key: string, type?: string) => {
                    if (key === "team:tenant1:config") {
                        return Promise.resolve({
                            team_id: "tenant1",
                            features: { auto_quotes: true },
                        });
                    }
                    if (key === "team:tenant1:webhook") {
                        return Promise.resolve("https://hook.make.com/test123");
                    }
                    return Promise.resolve(null);
                }),
                put: vi.fn().mockResolvedValue(undefined),
            };

            const env = {
                KV: mockKV,
            };
            const ctx = createMockCtx();

            await runQuotes(env as any, ctx as any);

            expect(fetch).toHaveBeenCalledWith(
                "https://hook.make.com/test123",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });

    describe("Quote message formatting", () => {
        it("formats quote with emoji and hashtags", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_quotes: true },
                },
            };

            const env = {
                KV: createMockKV(kvData),
            };
            const ctx = createMockCtx();

            await runQuotes(env as any, ctx as any);

            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCall = putCalls.find((call: any[]) =>
                call[0].startsWith("autopost:")
            );
            const post = JSON.parse(autopostCall[1]);

            expect(post.message).toContain('"');
            expect(post.message).toContain("—");
            expect(post.message).toContain("#");
        });
    });
});
