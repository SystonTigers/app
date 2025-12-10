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
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

describe("Milestones Cron", () => {
    const createMockKV = (data: Record<string, any> = {}) => ({
        list: vi.fn().mockResolvedValue({
            keys: Object.keys(data).map((name) => ({ name })),
        }),
        get: vi.fn().mockImplementation((key: string, type?: string) => {
            const value = data[key];
            if (type === "json" && value) {
                return Promise.resolve(value);
            }
            return Promise.resolve(value?.toString() || null);
        }),
        put: vi.fn().mockResolvedValue(undefined),
    });

    const createMockDb = (goalCounts: any[] = [], assistCounts: any[] = [], appearanceCounts: any[] = [], player?: any) => ({
        prepare: vi.fn().mockImplementation((query: string) => ({
            bind: vi.fn().mockReturnThis(),
            all: vi.fn().mockImplementation(() => {
                if (query.includes("event_type = 'goal'")) {
                    return Promise.resolve({ results: goalCounts });
                } else if (query.includes("event_type = 'assist'")) {
                    return Promise.resolve({ results: assistCounts });
                } else if (query.includes("COUNT(DISTINCT me.fixture_id)")) {
                    return Promise.resolve({ results: appearanceCounts });
                } else if (query.includes("DISTINCT player_id")) {
                    return Promise.resolve({ results: [{ player_id: "player1" }] });
                }
                return Promise.resolve({ results: [] });
            }),
            first: vi.fn().mockImplementation(() => {
                if (query.includes("FROM squad_players")) {
                    return Promise.resolve(player || null);
                }
                return Promise.resolve({ goals: 10, assists: 5, appearances: 15 });
            }),
        })),
    });

    const createMockCtx = () => ({
        waitUntil: vi.fn(),
    });

    beforeEach(() => {
        vi.clearAllMocks();
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

            const goalCounts = [{ player_id: "player1", total_goals: 10 }];
            const player = { id: "player1", name: "John Smith", position: "Forward" };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(goalCounts, [], [], player),
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
                "milestone:tenant1:player1:goal": "10", // Already celebrated 10 goals
            };

            const goalCounts = [{ player_id: "player1", total_goals: 10 }];
            const player = { id: "player1", name: "John Smith", position: "Forward" };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(goalCounts, [], [], player),
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
                "milestone:tenant1:player1:goal": "10", // Already celebrated 10 goals
            };

            const goalCounts = [{ player_id: "player1", total_goals: 25 }]; // Now at 25
            const player = { id: "player1", name: "John Smith", position: "Forward" };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(goalCounts, [], [], player),
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

            const player = { id: "player1", name: "John Smith", position: "Forward" };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb([], [], [], player),
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
            const prepCalls = (env.DB.prepare as any).mock.calls.length;
            expect(prepCalls).toBe(0);
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

            const goalCounts = [{ player_id: "player1", total_goals: 5 }];
            const player = { id: "player1", name: "John Smith", position: "Forward" };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(goalCounts, [], [], player),
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

            const assistCounts = [{ player_id: "player1", total_assists: 10 }];
            const player = { id: "player1", name: "John Smith", position: "Midfielder" };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb([], assistCounts, [], player),
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

            const appearanceCounts = [{ player_id: "player1", total_appearances: 50 }];
            const player = { id: "player1", name: "John Smith", position: "Defender" };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb([], [], appearanceCounts, player),
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

            const goalCounts = [{ player_id: "player1", total_goals: 10 }];
            const player = { id: "player1", name: "John Smith", position: "Forward" };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(goalCounts, [], [], player),
            };
            const ctx = createMockCtx();

            await runMilestones(env as any, ctx as any);

            // Should call webhook
            expect(fetch).toHaveBeenCalledWith(
                "https://hook.make.com/test123",
                expect.objectContaining({
                    method: "POST",
                    headers: { "content-type": "application/json" },
                })
            );
        });
    });
});
