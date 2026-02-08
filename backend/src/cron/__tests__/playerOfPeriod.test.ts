import { describe, it, expect, vi, beforeEach } from "vitest";
import { runPlayerOfPeriod, getPlayerOfPeriodLeaderboard, getPastWinners } from "../playerOfPeriod";

// Mock logger
vi.mock("../../lib/log", () => ({
    logJSON: vi.fn(),
}));

// Mock time utils
vi.mock("../../utils/time", () => {
    const mockToFormat = (fmt: string) => {
        if (fmt === 'yyyy-MM-dd') {return "2024-01-15";}
        if (fmt === 'yyyy-WW') {return "2024-W03";}
        if (fmt === 'yyyy-MM') {return "2024-01";}
        return "01-15";
    };
    return {
        nowUTC: vi.fn().mockReturnValue({
            toFormat: mockToFormat,
            minus: vi.fn().mockReturnThis(),
            toMillis: vi.fn().mockReturnValue(Date.now() - 7 * 24 * 60 * 60 * 1000),
        }),
    };
});

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
    randomUUID: () => "test-uuid-123",
});

// Mock fetch
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", mockFetch);

describe("Player of Period Cron", () => {
    const createMockKV = (data: Record<string, any> = {}) => ({
        list: vi.fn().mockImplementation(({ prefix }: { prefix: string }) => {
            const matchingKeys = Object.keys(data)
                .filter(k => k.startsWith(prefix))
                .map(name => ({ name }));
            return Promise.resolve({ keys: matchingKeys });
        }),
        get: vi.fn().mockImplementation((key: string, type?: string) => {
            const value = data[key];
            if (value === undefined) {return Promise.resolve(null);}
            if (type === "json" && typeof value === "object") {
                return Promise.resolve(value);
            }
            return Promise.resolve(typeof value === "string" ? value : JSON.stringify(value));
        }),
        put: vi.fn().mockResolvedValue(undefined),
    });

    // Mock DB that returns match_events format
    const createMockDb = (events: any[] = []) => ({
        prepare: vi.fn().mockImplementation(() => ({
            bind: vi.fn().mockReturnThis(),
            all: vi.fn().mockResolvedValue({ results: events }),
            first: vi.fn().mockResolvedValue(null),
        })),
    });

    const createMockCtx = () => ({
        waitUntil: vi.fn(),
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockClear();
    });

    describe("runPlayerOfPeriod", () => {
        it("processes weekly player of period for enabled tenants", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_player_of_week: true },
                },
            };

            // Match events format as used by the actual implementation
            const matchEvents = [
                { player_id: "p1", event_type: "goal", count: 3, player_name: "John Smith", photo_url: null },
                { player_id: "p1", event_type: "assist", count: 2, player_name: "John Smith", photo_url: null },
                { player_id: "p1", event_type: "motm", count: 1, player_name: "John Smith", photo_url: null },
            ];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(matchEvents),
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

            const matchEvents = [
                { player_id: "p1", event_type: "goal", count: 8, player_name: "John Smith", photo_url: null },
            ];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(matchEvents),
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
                // Already posted for this period
                "player_of_week:tenant1:2024-W03": "true",
            };

            const matchEvents = [
                { player_id: "p1", event_type: "goal", count: 3, player_name: "John Smith", photo_url: null },
            ];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(matchEvents),
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
                DB: createMockDb([]), // No events
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

            // Player 1: 2 goals (10) + 1 assist (3) + 1 MOTM (10) = 23
            // Player 2: 3 goals (15) + 0 assists (0) + 0 MOTM (0) = 15
            const matchEvents = [
                { player_id: "p1", event_type: "goal", count: 2, player_name: "Player One", photo_url: null },
                { player_id: "p1", event_type: "assist", count: 1, player_name: "Player One", photo_url: null },
                { player_id: "p1", event_type: "motm", count: 1, player_name: "Player One", photo_url: null },
                { player_id: "p2", event_type: "goal", count: 3, player_name: "Player Two", photo_url: null },
            ];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(matchEvents),
            };
            const ctx = createMockCtx();

            await runPlayerOfPeriod(env as any, ctx as any, { period: "week" });

            // Player 1 should win with higher score
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCall = putCalls.find((call: any[]) => call[0].startsWith("autopost:"));
            expect(autopostCall).toBeDefined();

            const postData = JSON.parse(autopostCall[1]);
            expect(postData.player_id).toBe("p1");
        });
    });

    describe("getPlayerOfPeriodLeaderboard", () => {
        it("returns ranked list of players", async () => {
            const matchEvents = [
                { player_id: "p1", event_type: "goal", count: 3, player_name: "Player One", photo_url: null },
                { player_id: "p2", event_type: "goal", count: 5, player_name: "Player Two", photo_url: null },
            ];

            const env = {
                KV: createMockKV({}),
                DB: createMockDb(matchEvents),
            };

            const leaderboard = await getPlayerOfPeriodLeaderboard(env as any, "tenant1", "week");

            expect(leaderboard.length).toBe(2);
            // Player 2 should be first with 5 goals = 25 points
            expect(leaderboard[0].id).toBe("p2");
            expect(leaderboard[1].id).toBe("p1");
        });
    });

    describe("getPastWinners", () => {
        it("returns list of past winners", async () => {
            const kvData = {
                "player_of_week:tenant1:2024-W02": "true",
                "player_of_week:tenant1:2024-W01": "true",
                "autopost:tenant1:post1": {
                    type: "player_of_week",
                    period: "2024-W02",
                    player_name: "Player One",
                    player_id: "p1",
                    stats: { goals: 3 },
                    created_at: 1704700000000,
                },
                "autopost:tenant1:post2": {
                    type: "player_of_week",
                    period: "2024-W01",
                    player_name: "Player Two",
                    player_id: "p2",
                    stats: { goals: 2 },
                    created_at: 1704100000000,
                },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb([]),
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

            const matchEvents = [
                { player_id: "p1", event_type: "goal", count: 3, player_name: "John Smith", photo_url: null },
            ];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(matchEvents),
            };
            const ctx = createMockCtx();

            await runPlayerOfPeriod(env as any, ctx as any, { period: "week" });

            // Should call webhook
            expect(mockFetch).toHaveBeenCalledWith(
                "https://hook.make.com/test123",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });
});
