import { describe, it, expect, vi, beforeEach } from "vitest";
import { runMilestones, checkMilestonesAfterMatch } from "../milestones";

// Mock logger
vi.mock("../../lib/log", () => ({
    logJSON: vi.fn(),
}));

// Mock time utils
vi.mock("../../utils/time", () => ({
    nowUTC: vi.fn().mockReturnValue({
        toFormat: (fmt: string) => "2024-01-15",
    }),
}));

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
    randomUUID: () => "test-uuid-123",
});

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

describe("Milestones Cron", () => {
    const createMockKV = (data: Record<string, any> = {}) => ({
        list: vi.fn().mockImplementation(({ prefix }: { prefix: string }) => {
            const matchingKeys = Object.keys(data)
                .filter(k => k.startsWith(prefix))
                .map(name => ({ name }));
            return Promise.resolve({ keys: matchingKeys });
        }),
        get: vi.fn().mockImplementation((key: string, type?: string) => {
            const value = data[key];
            if (value === undefined) return Promise.resolve(null);
            if (type === "json" && typeof value === "object") {
                return Promise.resolve(value);
            }
            // For string values or non-json types, return as-is
            if (typeof value === "string") {
                return Promise.resolve(value);
            }
            return Promise.resolve(typeof value === "object" ? null : String(value));
        }),
        put: vi.fn().mockResolvedValue(undefined),
    });

    // More accurate mock matching actual DB queries
    const createMockDb = (
        goalCount: number = 0,
        assistCount: number = 0,
        appearanceCount: number = 0,
        players: any[] = []
    ) => ({
        prepare: vi.fn().mockImplementation((query: string) => ({
            bind: vi.fn().mockReturnThis(),
            all: vi.fn().mockImplementation(() => {
                // List all players in tenant
                if (query.includes("SELECT id, name FROM squad WHERE tenant_id")) {
                    return Promise.resolve({ results: players });
                }
                // Get event counts
                if (query.includes("GROUP BY event_type")) {
                    const results: any[] = [];
                    if (goalCount > 0) results.push({ event_type: 'goal', count: goalCount });
                    if (assistCount > 0) results.push({ event_type: 'assist', count: assistCount });
                    return Promise.resolve({ results });
                }
                // Get distinct players in match
                if (query.includes("DISTINCT player_id")) {
                    return Promise.resolve({ results: players.map(p => ({ player_id: p.id })) });
                }
                return Promise.resolve({ results: [] });
            }),
            first: vi.fn().mockImplementation(() => {
                // Get player by id
                if (query.includes("SELECT id, name, photo_url FROM squad WHERE")) {
                    return Promise.resolve(players[0] || null);
                }
                // Get appearance count
                if (query.includes("COUNT(DISTINCT fixture_id)")) {
                    return Promise.resolve({ count: appearanceCount });
                }
                return Promise.resolve(null);
            }),
        })),
    });

    const createMockCtx = () => ({
        waitUntil: vi.fn(),
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockClear();
    });

    describe("runMilestones", () => {
        it("processes all tenants with milestones enabled", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_milestones: true },
                },
                "team:tenant2:config": {
                    team_id: "tenant2",
                    features: { auto_milestones: true },
                },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(),
            };
            const ctx = createMockCtx();

            await runMilestones(env as any, ctx as any);

            // Should query KV for tenant configs
            expect(env.KV.list).toHaveBeenCalledWith({ prefix: "team:" });
        });

        it("skips tenants without milestones feature enabled", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_milestones: false },
                },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(),
            };
            const ctx = createMockCtx();

            await runMilestones(env as any, ctx as any);

            // Should not query DB for player stats
            expect(env.DB.prepare).not.toHaveBeenCalled();
        });

        it("creates milestone post when player reaches goal milestone", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_milestones: true },
                },
            };

            const players = [{ id: "player1", name: "John Smith", photo_url: null }];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(10, 0, 0, players), // 10 goals
            };
            const ctx = createMockCtx();

            await runMilestones(env as any, ctx as any);

            // Should save milestone post to KV
            expect(env.KV.put).toHaveBeenCalled();
        });

        it("does not create duplicate milestone posts", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_milestones: true },
                },
                "milestone:tenant1:player1:goals:10": "true", // Already celebrated 10 goals
                "milestone:tenant1:player1:goals:5": "true", // Also celebrated 5 goals
            };

            const players = [{ id: "player1", name: "John Smith", photo_url: null }];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(10, 0, 0, players),
            };
            const ctx = createMockCtx();

            await runMilestones(env as any, ctx as any);

            // Should not create new post for already celebrated milestone
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCalls = putCalls.filter((call: any[]) => call[0].startsWith("autopost:"));
            expect(autopostCalls.length).toBe(0);
        });

        it("creates post for higher milestone when previous is celebrated", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_milestones: true },
                },
                "milestone:tenant1:player1:goals:10": "true", // Already celebrated 10 goals
            };

            const players = [{ id: "player1", name: "John Smith", photo_url: null }];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(25, 0, 0, players), // Now at 25 goals
            };
            const ctx = createMockCtx();

            await runMilestones(env as any, ctx as any);

            // Should create post for 25 goals milestone
            expect(env.KV.put).toHaveBeenCalled();
        });
    });

    describe("checkMilestonesAfterMatch", () => {
        it("checks milestones for players who participated", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_milestones: true },
                },
            };

            const players = [{ id: "player1", name: "John Smith", photo_url: null }];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(0, 0, 0, players),
            };

            await checkMilestonesAfterMatch(env as any, "tenant1", "fixture123");

            // Should query for participants in the match
            expect(env.DB.prepare).toHaveBeenCalled();
        });

        it("does nothing when feature is disabled", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_milestones: false },
                },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(),
            };

            await checkMilestonesAfterMatch(env as any, "tenant1", "fixture123");

            // Should not query DB when feature disabled
            expect(env.DB.prepare).not.toHaveBeenCalled();
        });
    });

    describe("Milestone thresholds", () => {
        it("creates post at 5 goal milestone", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_milestones: true },
                },
            };

            const players = [{ id: "player1", name: "John Smith", photo_url: null }];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(5, 0, 0, players),
            };
            const ctx = createMockCtx();

            await runMilestones(env as any, ctx as any);

            expect(env.KV.put).toHaveBeenCalled();
        });

        it("creates post for assist milestones", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_milestones: true },
                },
            };

            const players = [{ id: "player1", name: "John Smith", photo_url: null }];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(0, 10, 0, players), // 10 assists
            };
            const ctx = createMockCtx();

            await runMilestones(env as any, ctx as any);

            expect(env.KV.put).toHaveBeenCalled();
        });

        it("creates post for appearance milestones", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_milestones: true },
                },
            };

            const players = [{ id: "player1", name: "John Smith", photo_url: null }];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(0, 0, 50, players), // 50 appearances
            };
            const ctx = createMockCtx();

            await runMilestones(env as any, ctx as any);

            expect(env.KV.put).toHaveBeenCalled();
        });
    });

    describe("Webhook integration", () => {
        it("triggers webhook when milestone post is created", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_milestones: true },
                },
                "team:tenant1:webhook": "https://hook.make.com/test123",
            };

            const players = [{ id: "player1", name: "John Smith", photo_url: null }];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(10, 0, 0, players), // 10 goals triggers milestone
            };
            const ctx = createMockCtx();

            await runMilestones(env as any, ctx as any);

            // Should call webhook
            expect(mockFetch).toHaveBeenCalledWith(
                "https://hook.make.com/test123",
                expect.objectContaining({
                    method: "POST",
                    headers: { "content-type": "application/json" },
                })
            );
        });
    });
});
