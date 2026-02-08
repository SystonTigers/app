import { describe, it, expect, vi, beforeEach } from "vitest";
import { runBirthdays } from "../birthdays";

// Mock logger
vi.mock("../../lib/log", () => ({
    logJSON: vi.fn(),
}));

// Mock time utils
vi.mock("../../utils/time", () => ({
    nowUTC: vi.fn().mockReturnValue({
        toFormat: (fmt: string) => {
            if (fmt === "MM-dd") {return "05-15";}
            if (fmt === "yyyy-MM-dd") {return "2024-05-15";}
            return "2024-05-15";
        },
    }),
}));

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
    randomUUID: () => "test-uuid-123",
});

// Mock fetch
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

describe("Birthdays Cron", () => {
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

    const createMockDb = (birthdayPlayers: any[] = []) => ({
        prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            all: vi.fn().mockResolvedValue({ results: birthdayPlayers }),
        }),
    });

    const createMockCtx = () => ({
        waitUntil: vi.fn(),
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("runBirthdays", () => {
        it("creates birthday post for player with birthday today", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_birthdays: true },
                },
            };

            const birthdayPlayers = [
                {
                    id: "player1",
                    name: "John Smith",
                    photo_url: "https://example.com/photo.jpg",
                    position: "Forward",
                    birthday: "2010-05-15",
                },
            ];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(birthdayPlayers),
            };
            const ctx = createMockCtx();

            await runBirthdays(env as any, ctx as any);

            // Should create birthday post
            expect(env.KV.put).toHaveBeenCalled();
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCall = putCalls.find((call: any[]) =>
                call[0].startsWith("autopost:")
            );
            expect(autopostCall).toBeDefined();

            const post = JSON.parse(autopostCall[1]);
            expect(post.type).toBe("birthday");
            expect(post.player.name).toBe("John Smith");
        });

        it("skips tenants without birthdays feature enabled", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_birthdays: false },
                },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(),
            };
            const ctx = createMockCtx();

            await runBirthdays(env as any, ctx as any);

            // Should not query DB when feature disabled
            expect(env.DB.prepare).not.toHaveBeenCalled();
        });

        it("does not create duplicate birthday posts", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_birthdays: true },
                },
                "birthday:tenant1:player1:2024-05-15": "posted",
            };

            const birthdayPlayers = [
                {
                    id: "player1",
                    name: "John Smith",
                    birthday: "2010-05-15",
                },
            ];

            const mockKV = {
                list: vi.fn().mockResolvedValue({
                    keys: [{ name: "team:tenant1:config" }],
                }),
                get: vi.fn().mockImplementation((key: string, type?: string) => {
                    if (key === "team:tenant1:config") {
                        return Promise.resolve({
                            team_id: "tenant1",
                            features: { auto_birthdays: true },
                        });
                    }
                    // Return truthy for birthday key (already posted)
                    if (key.startsWith("birthday:tenant1:player1:")) {
                        return Promise.resolve("posted");
                    }
                    return Promise.resolve(null);
                }),
                put: vi.fn().mockResolvedValue(undefined),
            };

            const env = {
                KV: mockKV,
                DB: createMockDb(birthdayPlayers),
            };
            const ctx = createMockCtx();

            await runBirthdays(env as any, ctx as any);

            // Should not create new post
            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCalls = putCalls.filter((call: any[]) =>
                call[0].startsWith("autopost:")
            );
            expect(autopostCalls.length).toBe(0);
        });

        it("creates posts for multiple birthday players", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_birthdays: true },
                },
            };

            const birthdayPlayers = [
                { id: "player1", name: "John Smith", birthday: "2010-05-15" },
                { id: "player2", name: "Mike Jones", birthday: "2011-05-15" },
            ];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(birthdayPlayers),
            };
            const ctx = createMockCtx();

            await runBirthdays(env as any, ctx as any);

            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCalls = putCalls.filter((call: any[]) =>
                call[0].startsWith("autopost:")
            );
            expect(autopostCalls.length).toBe(2);
        });

        it("handles no birthday players gracefully", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_birthdays: true },
                },
            };

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb([]),
            };
            const ctx = createMockCtx();

            await runBirthdays(env as any, ctx as any);

            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCalls = putCalls.filter((call: any[]) =>
                call[0].startsWith("autopost:")
            );
            expect(autopostCalls.length).toBe(0);
        });

        it("calculates age correctly", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_birthdays: true },
                },
            };

            // Use a birthday that will result in a known age
            const currentYear = new Date().getFullYear();
            const birthdayPlayers = [
                {
                    id: "player1",
                    name: "John Smith",
                    birthday: `${currentYear - 14}-05-15`,
                },
            ];

            const env = {
                KV: createMockKV(kvData),
                DB: createMockDb(birthdayPlayers),
            };
            const ctx = createMockCtx();

            await runBirthdays(env as any, ctx as any);

            const putCalls = (env.KV.put as any).mock.calls;
            const autopostCall = putCalls.find((call: any[]) =>
                call[0].startsWith("autopost:")
            );
            const post = JSON.parse(autopostCall[1]);
            // Age should be 13 or 14 depending on whether birthday has passed this year
            expect(post.age).toBeGreaterThanOrEqual(13);
            expect(post.age).toBeLessThanOrEqual(14);
        });
    });

    describe("Webhook integration", () => {
        it("triggers webhook when birthday post is created", async () => {
            const kvData = {
                "team:tenant1:config": {
                    team_id: "tenant1",
                    features: { auto_birthdays: true },
                },
                "team:tenant1:webhook": "https://hook.make.com/test123",
            };

            const birthdayPlayers = [
                { id: "player1", name: "John Smith", birthday: "2010-05-15" },
            ];

            const mockKV = {
                list: vi.fn().mockResolvedValue({
                    keys: [{ name: "team:tenant1:config" }],
                }),
                get: vi.fn().mockImplementation((key: string, type?: string) => {
                    if (key === "team:tenant1:config") {
                        return Promise.resolve({
                            team_id: "tenant1",
                            features: { auto_birthdays: true },
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
                DB: createMockDb(birthdayPlayers),
            };
            const ctx = createMockCtx();

            await runBirthdays(env as any, ctx as any);

            expect(fetch).toHaveBeenCalledWith(
                "https://hook.make.com/test123",
                expect.objectContaining({
                    method: "POST",
                })
            );
        });
    });
});
