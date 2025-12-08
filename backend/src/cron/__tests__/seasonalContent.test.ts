import { describe, it, expect, vi, beforeEach } from "vitest";
import { runWeeklyRoundup, runSeasonCheck } from "../seasonalContent";

// Mock logger
vi.mock("../../lib/log", () => ({
    logJSON: vi.fn(),
}));

// Mock time utils - can be overridden per test
const mockNowUTC = vi.fn();
vi.mock("../../utils/time", () => ({
    nowUTC: () => mockNowUTC(),
}));

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
    randomUUID: () => "test-uuid-123",
});

// Mock fetch
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

describe("Seasonal Content Cron", () => {
    const createMockKV = (data: Record<string, any> = {}) => ({
        list: vi.fn().mockResolvedValue({
            keys: Object.keys(data).map((name) => ({ name })),
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

    const createMockDb = (resultsData: any[] = [], topScorers: any[] = [], topAssisters: any[] = [], stats?: any, squad?: any, nextFixture?: any) => ({
        prepare: vi.fn().mockImplementation((query: string) => ({
            bind: vi.fn().mockReturnThis(),
            all: vi.fn().mockImplementation(() => {
                if (query.includes("FROM team_results")) {
                    return Promise.resolve({ results: resultsData });
                } else if (query.includes("event_type = 'assist'")) {
                    return Promise.resolve({ results: topAssisters });
                } else if (query.includes("event_type = 'goal'")) {
                    return Promise.resolve({ results: topScorers });
                }
                return Promise.resolve({ results: [] });
            }),
            first: vi.fn().mockImplementation(() => {
                if (query.includes("COUNT(*)")) {
                    return Promise.resolve(squad || { count: 15 });
                } else if (query.includes("FROM fixtures")) {
                    return Promise.resolve(nextFixture || null);
                } else if (query.includes("SUM(CASE WHEN")) {
                    return Promise.resolve(stats || {
                        matches: 10,
                        wins: 6,
                        draws: 2,
                        losses: 2,
                        goals_for: 20,
                        goals_against: 12,
                    });
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
        // Default mock for nowUTC
        mockNowUTC.mockReturnValue({
            toFormat: (fmt: string) => {
                if (fmt === 'yyyy-MM-dd') return "2024-01-15";
                if (fmt === 'MM-dd') return "01-15";
                return "2024-01-15";
            },
        });
    });

    describe("runWeeklyRoundup", () => {
        it("creates weekly roundup for tenants with feature enabled", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_weekly_roundup: true },
                },
            };

            const results = [
                { our_score: 3, their_score: 1 },
                { our_score: 2, their_score: 2 },
                { our_score: 1, their_score: 0 },
            ];

            const topScorers = [
                { player_id: "p1", player_name: "John Smith", goals: 3 },
            ];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(results, topScorers),
            };
            const ctx = createMockCtx();

            await runWeeklyRoundup(env as any, ctx as any);

            // Should create weekly roundup post
            expect(env.KV.put).toHaveBeenCalled();
        });

        it("skips tenants without feature enabled", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_weekly_roundup: false },
                },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(),
            };
            const ctx = createMockCtx();

            await runWeeklyRoundup(env as any, ctx as any);

            // Should not query DB when feature disabled
            expect(env.DB.prepare).not.toHaveBeenCalled();
        });

        it("does not create duplicate posts for same week", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_weekly_roundup: true },
                },
                "weekly:tenant1:2024-01-15": "posted",
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb([{ our_score: 2, their_score: 1 }]),
            };
            const ctx = createMockCtx();

            await runWeeklyRoundup(env as any, ctx as any);

            // Should not create new post
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCalls = putCalls.filter((call: any[]) => call[0].startsWith("autopost:"));
            expect(autopostCalls.length).toBe(0);
        });

        it("handles no matches in the week", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_weekly_roundup: true },
                },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb([]), // No matches
            };
            const ctx = createMockCtx();

            await runWeeklyRoundup(env as any, ctx as any);

            // Should not create post
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCalls = putCalls.filter((call: any[]) => call[0].startsWith("autopost:"));
            expect(autopostCalls.length).toBe(0);
        });

        it("calculates stats correctly", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_weekly_roundup: true },
                },
            };

            // 2 wins, 1 draw, 1 loss
            const results = [
                { our_score: 3, their_score: 1 }, // Win
                { our_score: 2, their_score: 2 }, // Draw
                { our_score: 4, their_score: 0 }, // Win
                { our_score: 0, their_score: 1 }, // Loss
            ];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(results),
            };
            const ctx = createMockCtx();

            await runWeeklyRoundup(env as any, ctx as any);

            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCall = putCalls.find((call: any[]) => call[0].startsWith("autopost:"));
            expect(autopostCall).toBeDefined();

            const post = JSON.parse(autopostCall[1]);
            expect(post.stats.wins).toBe(2);
            expect(post.stats.draws).toBe(1);
            expect(post.stats.losses).toBe(1);
            expect(post.stats.goalsFor).toBe(9);
            expect(post.stats.goalsAgainst).toBe(4);
            expect(post.stats.points).toBe(7); // 2*3 + 1*1
        });
    });

    describe("runSeasonCheck", () => {
        describe("Season Start", () => {
            it("creates season start post on configured date", async () => {
                mockNowUTC.mockReturnValue({
                    toFormat: (fmt: string) => {
                        if (fmt === 'yyyy-MM-dd') return "2024-09-01";
                        if (fmt === 'MM-dd') return "09-01";
                        return "2024-09-01";
                    },
                });

                const kvData = {
                    "team:tenant1:config": {
                        team_id: "tenant1",
                        features: {
                            auto_season_posts: true,
                            season_dates: { start: "09-01", mid: "01-01", end: "05-31" },
                        },
                    },
                };

                const nextFixture = {
                    opponent: "Rival FC",
                    fixture_date: "2024-09-07",
                };

                const env = {
                    KV: createMockKV(kvData),
                    DB: createMockDb([], [], [], null, { count: 18 }, nextFixture),
                };
                const ctx = createMockCtx();

                await runSeasonCheck(env as any, ctx as any);

                // Should create season start post
                const putCalls = (env.KV.put as any).mock.calls;
                const autopostCall = putCalls.find((call: any[]) => call[0].startsWith("autopost:"));
                expect(autopostCall).toBeDefined();

                const post = JSON.parse(autopostCall[1]);
                expect(post.type).toBe("season_start");
            });
        });

        describe("Mid-Season Review", () => {
            it("creates mid-season review on configured date", async () => {
                mockNowUTC.mockReturnValue({
                    toFormat: (fmt: string) => {
                        if (fmt === 'yyyy-MM-dd') return "2025-01-01";
                        if (fmt === 'MM-dd') return "01-01";
                        return "2025-01-01";
                    },
                });

                const kvData = {
                    "team:tenant1:config": {
                        team_id: "tenant1",
                        features: {
                            auto_season_posts: true,
                            season_dates: { start: "09-01", mid: "01-01", end: "05-31" },
                        },
                    },
                };

                const stats = {
                    matches: 15,
                    wins: 10,
                    draws: 3,
                    losses: 2,
                    goals_for: 35,
                    goals_against: 15,
                };

                const topScorer = { name: "John Smith", goals: 12 };

                const env = {
                    KV: createMockKV(kvData),
                    DB: createMockDb([], [topScorer], [], stats),
                };
                const ctx = createMockCtx();

                await runSeasonCheck(env as any, ctx as any);

                const putCalls = (env.KV.put as any).mock.calls;
                const autopostCall = putCalls.find((call: any[]) => call[0].startsWith("autopost:"));
                expect(autopostCall).toBeDefined();

                const post = JSON.parse(autopostCall[1]);
                expect(post.type).toBe("mid_season_review");
            });
        });

        describe("Season End Summary", () => {
            it("creates end of season summary on configured date", async () => {
                mockNowUTC.mockReturnValue({
                    toFormat: (fmt: string) => {
                        if (fmt === 'yyyy-MM-dd') return "2025-05-31";
                        if (fmt === 'MM-dd') return "05-31";
                        return "2025-05-31";
                    },
                });

                const kvData = {
                    "team:tenant1:config": {
                        team_id: "tenant1",
                        features: {
                            auto_season_posts: true,
                            season_dates: { start: "09-01", mid: "01-01", end: "05-31" },
                        },
                    },
                };

                const stats = {
                    matches: 30,
                    wins: 20,
                    draws: 5,
                    losses: 5,
                    goals_for: 75,
                    goals_against: 30,
                };

                const topScorers = [
                    { name: "John Smith", goals: 25 },
                    { name: "Mike Jones", goals: 18 },
                ];

                const topAssisters = [
                    { name: "Tom Wilson", assists: 15 },
                ];

                const env = {
                    KV: createMockKV(kvData),
                    DB: createMockDb([], topScorers, topAssisters, stats),
                };
                const ctx = createMockCtx();

                await runSeasonCheck(env as any, ctx as any);

                const putCalls = (env.KV.put as any).mock.calls;
                const autopostCall = putCalls.find((call: any[]) => call[0].startsWith("autopost:"));
                expect(autopostCall).toBeDefined();

                const post = JSON.parse(autopostCall[1]);
                expect(post.type).toBe("season_end_summary");
                expect(post.awards.top_scorers).toBeDefined();
                expect(post.awards.top_assisters).toBeDefined();
            });
        });

        it("uses default season dates when not configured", async () => {
            mockNowUTC.mockReturnValue({
                toFormat: (fmt: string) => {
                    if (fmt === 'yyyy-MM-dd') return "2024-09-01";
                    if (fmt === 'MM-dd') return "09-01";
                    return "2024-09-01";
                },
            });

            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_season_posts: true }, // No season_dates
                },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(),
            };
            const ctx = createMockCtx();

            await runSeasonCheck(env as any, ctx as any);

            // Should still work with default dates (09-01 is season start)
            expect(env.DB.prepare).toHaveBeenCalled();
        });

        it("does not create duplicate season posts", async () => {
            mockNowUTC.mockReturnValue({
                toFormat: (fmt: string) => {
                    if (fmt === 'yyyy-MM-dd') return "2024-09-01";
                    if (fmt === 'MM-dd') return "09-01";
                    return "2024-09-01";
                },
            });

            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: {
                        auto_season_posts: true,
                        season_dates: { start: "09-01", mid: "01-01", end: "05-31" },
                    },
                },
                "season_start:tenant1:2024": "posted",
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(),
            };
            const ctx = createMockCtx();

            await runSeasonCheck(env as any, ctx as any);

            // Should not create new post
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCalls = putCalls.filter((call: any[]) => call[0].startsWith("autopost:"));
            expect(autopostCalls.length).toBe(0);
        });

        it("skips tenants without feature enabled", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_season_posts: false },
                },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(),
            };
            const ctx = createMockCtx();

            await runSeasonCheck(env as any, ctx as any);

            // Should not query DB when feature disabled
            expect(env.DB.prepare).not.toHaveBeenCalled();
        });
    });

    describe("Webhook integration", () => {
        it("triggers webhook for weekly roundup", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_weekly_roundup: true },
                },
                "team:tenant1:webhook": "https://hook.make.com/test123",
            };

            const results = [{ our_score: 3, their_score: 1 }];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(results),
            };
            const ctx = createMockCtx();

            await runWeeklyRoundup(env as any, ctx as any);

            expect(fetch).toHaveBeenCalledWith(
                "https://hook.make.com/test123",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });

        it("triggers webhook for season posts", async () => {
            mockNowUTC.mockReturnValue({
                toFormat: (fmt: string) => {
                    if (fmt === 'yyyy-MM-dd') return "2024-09-01";
                    if (fmt === 'MM-dd') return "09-01";
                    return "2024-09-01";
                },
            });

            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: {
                        auto_season_posts: true,
                        season_dates: { start: "09-01", mid: "01-01", end: "05-31" },
                    },
                },
                "team:tenant1:webhook": "https://hook.make.com/test456",
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(),
            };
            const ctx = createMockCtx();

            await runSeasonCheck(env as any, ctx as any);

            expect(fetch).toHaveBeenCalledWith(
                "https://hook.make.com/test456",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });
});
