import { describe, it, expect, vi, beforeEach } from "vitest";
import { runPlayerOfPeriod, getPlayerOfPeriodLeaderboard, getPastWinners } from "../playerOfPeriod";

// Mock logger
vi.mock("../../lib/log", () => ({
    logJSON: vi.fn(),
}));

// Mock time utils
vi.mock("../../utils/time", () => ({
    nowUTC: vi.fn().mockReturnValue({
        toFormat: (fmt: string) => fmt === 'yyyy-MM-dd' ? "2024-01-15" : "01-15",
    }),
}));

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
    randomUUID: () => "test-uuid-123",
});

// Mock fetch
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

describe("Player of Period Cron", () => {
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

    const createMockDb = (stats: any[] = [], player?: any) => ({
        prepare: vi.fn().mockImplementation((query: string) => ({
            bind: vi.fn().mockReturnThis(),
            all: vi.fn().mockResolvedValue({ results: stats }),
            first: vi.fn().mockImplementation(() => {
                if (query.includes("FROM squad_players")) {
                    return Promise.resolve(player || null);
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
    });

    describe("runPlayerOfPeriod", () => {
        it("processes weekly player of period for enabled tenants", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_player_of_week: true },
                },
            };

            const playerStats = [
                { player_id: "p1", goals: 3, assists: 2, motm_awards: 1, matches_played: 2 },
                { player_id: "p2", goals: 2, assists: 1, motm_awards: 0, matches_played: 2 },
            ];

            const player = { id: "p1", name: "John Smith", position: "Forward" };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(playerStats, player),
            };
            const ctx = createMockCtx();

            await runPlayerOfPeriod(env as any, ctx as any, { period: "week" });

            // Should create post for player of week
            expect(env.KV.put).toHaveBeenCalled();
        });

        it("processes monthly player of period", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_player_of_month: true },
                },
            };

            const playerStats = [
                { player_id: "p1", goals: 8, assists: 5, motm_awards: 2, matches_played: 4 },
            ];

            const player = { id: "p1", name: "John Smith", position: "Forward" };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(playerStats, player),
            };
            const ctx = createMockCtx();

            await runPlayerOfPeriod(env as any, ctx as any, { period: "month" });

            expect(env.KV.put).toHaveBeenCalled();
        });

        it("skips tenants without feature enabled", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_player_of_week: false },
                },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(),
            };
            const ctx = createMockCtx();

            await runPlayerOfPeriod(env as any, ctx as any, { period: "week" });

            // Should not query DB when feature disabled
            expect(env.DB.prepare).not.toHaveBeenCalled();
        });

        it("does not create duplicate posts for same period", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_player_of_week: true },
                },
                "pop:tenant1:week:2024-01-15": JSON.stringify({ player_id: "p1" }),
            };

            const playerStats = [
                { player_id: "p1", goals: 3, assists: 2, motm_awards: 1, matches_played: 2 },
            ];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(playerStats),
            };
            const ctx = createMockCtx();

            await runPlayerOfPeriod(env as any, ctx as any, { period: "week" });

            // Should not create new post for already posted period
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCalls = putCalls.filter((call: any[]) => call[0].startsWith("autopost:"));
            expect(autopostCalls.length).toBe(0);
        });

        it("handles no player stats gracefully", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_player_of_week: true },
                },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb([]), // No stats
            };
            const ctx = createMockCtx();

            await runPlayerOfPeriod(env as any, ctx as any, { period: "week" });

            // Should not create post when no stats available
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCalls = putCalls.filter((call: any[]) => call[0].startsWith("autopost:"));
            expect(autopostCalls.length).toBe(0);
        });
    });

    describe("Performance scoring", () => {
        it("calculates score correctly: goals=5, assists=3, motm=10, matches=1", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_player_of_week: true },
                },
            };

            // Player 1: 2 goals (10) + 1 assist (3) + 1 MOTM (10) + 2 matches (2) = 25
            // Player 2: 3 goals (15) + 0 assists (0) + 0 MOTM (0) + 2 matches (2) = 17
            const playerStats = [
                { player_id: "p1", goals: 2, assists: 1, motm_awards: 1, matches_played: 2 },
                { player_id: "p2", goals: 3, assists: 0, motm_awards: 0, matches_played: 2 },
            ];

            const player1 = { id: "p1", name: "Player One", position: "Midfielder" };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(playerStats, player1),
            };
            const ctx = createMockCtx();

            await runPlayerOfPeriod(env as any, ctx as any, { period: "week" });

            // Player 1 should win with higher score
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCall = putCalls.find((call: any[]) => call[0].startsWith("autopost:"));
            expect(autopostCall).toBeDefined();

            const postData = JSON.parse(autopostCall[1]);
            expect(postData.winner.player_id).toBe("p1");
        });
    });

    describe("getPlayerOfPeriodLeaderboard", () => {
        it("returns ranked list of players", async () => {
            const playerStats = [
                { player_id: "p1", goals: 3, assists: 2, motm_awards: 0, matches_played: 2 },
                { player_id: "p2", goals: 5, assists: 1, motm_awards: 1, matches_played: 2 },
            ];

            const env = {
                KV: createMockKV({}),
                DB: createMockDb(playerStats, { id: "test", name: "Test Player", position: "Forward" }),
            };

            const leaderboard = await getPlayerOfPeriodLeaderboard(env as any, "tenant1", "week");

            expect(leaderboard.length).toBe(2);
            expect(leaderboard[0].rank).toBe(1);
            expect(leaderboard[1].rank).toBe(2);
        });
    });

    describe("getPastWinners", () => {
        it("returns list of past winners", async () => {
            const kvData = {
                "pop:tenant1:week:2024-01-08": { player_id: "p1", posted_at: 1704700000000 },
                "pop:tenant1:week:2024-01-01": { player_id: "p2", posted_at: 1704100000000 },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb([], { id: "p1", name: "Player One", position: "Forward" }),
            };

            const winners = await getPastWinners(env as any, "tenant1", "week", 10);

            expect(winners.length).toBe(2);
        });
    });

    describe("Webhook integration", () => {
        it("triggers webhook when post is created", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_player_of_week: true },
                },
                "team:tenant1:webhook": "https://hook.make.com/test123",
            };

            const playerStats = [
                { player_id: "p1", goals: 3, assists: 2, motm_awards: 1, matches_played: 2 },
            ];

            const player = { id: "p1", name: "John Smith", position: "Forward" };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(playerStats, player),
            };
            const ctx = createMockCtx();

            await runPlayerOfPeriod(env as any, ctx as any, { period: "week" });

            // Should call webhook
            expect(fetch).toHaveBeenCalledWith(
                "https://hook.make.com/test123",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });
});
