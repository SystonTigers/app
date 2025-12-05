import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { shouldDefer, incrementCounter } from "../rateAware";

describe("Rate Aware Service", () => {
    const createMockEnv = () => ({
        KV_IDEMP: {
            get: vi.fn(),
            put: vi.fn(),
        },
    });

    describe("shouldDefer", () => {
        describe("YouTube channel", () => {
            it("returns false when under quota limit", async () => {
                const env = createMockEnv();
                env.KV_IDEMP.get.mockResolvedValue("10"); // 10 posts today, under 50 limit

                const tenant = { id: "tenant-123" } as any;
                const result = await shouldDefer("yt", tenant, env);

                expect(result).toBe(false);
            });

            it("returns true when at quota limit", async () => {
                const env = createMockEnv();
                env.KV_IDEMP.get.mockResolvedValue("50"); // At exactly 50 limit

                const tenant = { id: "tenant-123" } as any;
                const result = await shouldDefer("yt", tenant, env);

                expect(result).toBe(true);
            });

            it("returns true when over quota limit", async () => {
                const env = createMockEnv();
                env.KV_IDEMP.get.mockResolvedValue("100"); // Over 50 limit

                const tenant = { id: "tenant-123" } as any;
                const result = await shouldDefer("yt", tenant, env);

                expect(result).toBe(true);
            });

            it("returns false when counter is null (no posts today)", async () => {
                const env = createMockEnv();
                env.KV_IDEMP.get.mockResolvedValue(null);

                const tenant = { id: "tenant-123" } as any;
                const result = await shouldDefer("yt", tenant, env);

                expect(result).toBe(false);
            });

            it("uses correct rate key format", async () => {
                const env = createMockEnv();
                env.KV_IDEMP.get.mockResolvedValue("0");

                const tenant = { id: "my-tenant" } as any;
                await shouldDefer("yt", tenant, env);

                const callArg = env.KV_IDEMP.get.mock.calls[0][0];
                expect(callArg).toContain("rate:");
                expect(callArg).toContain("my-tenant");
                expect(callArg).toContain(":yt:");
                // Should contain today's date in YYYY-MM-DD format
                expect(callArg).toMatch(/\d{4}-\d{2}-\d{2}$/);
            });
        });

        describe("Other channels", () => {
            it("returns false for Facebook channel", async () => {
                const env = createMockEnv();
                const tenant = { id: "tenant-123" } as any;
                const result = await shouldDefer("fb", tenant, env);

                expect(result).toBe(false);
            });

            it("returns false for Instagram channel", async () => {
                const env = createMockEnv();
                const tenant = { id: "tenant-123" } as any;
                const result = await shouldDefer("ig", tenant, env);

                expect(result).toBe(false);
            });

            it("returns false for TikTok channel", async () => {
                const env = createMockEnv();
                const tenant = { id: "tenant-123" } as any;
                const result = await shouldDefer("tiktok", tenant, env);

                expect(result).toBe(false);
            });

            it("returns false for X/Twitter channel", async () => {
                const env = createMockEnv();
                const tenant = { id: "tenant-123" } as any;
                const result = await shouldDefer("x", tenant, env);

                expect(result).toBe(false);
            });
        });
    });

    describe("incrementCounter", () => {
        it("increments counter from 0 when no existing value", async () => {
            const env = createMockEnv();
            env.KV_IDEMP.get.mockResolvedValue(null);

            const tenant = { id: "tenant-123" } as any;
            await incrementCounter("yt", tenant, env);

            expect(env.KV_IDEMP.put).toHaveBeenCalledWith(
                expect.any(String),
                "1",
                { expirationTtl: 90000 }
            );
        });

        it("increments existing counter", async () => {
            const env = createMockEnv();
            env.KV_IDEMP.get.mockResolvedValue("5");

            const tenant = { id: "tenant-123" } as any;
            await incrementCounter("yt", tenant, env);

            expect(env.KV_IDEMP.put).toHaveBeenCalledWith(
                expect.any(String),
                "6",
                { expirationTtl: 90000 }
            );
        });

        it("uses correct key format", async () => {
            const env = createMockEnv();
            env.KV_IDEMP.get.mockResolvedValue("0");

            const tenant = { id: "my-tenant" } as any;
            await incrementCounter("fb", tenant, env);

            const putKey = env.KV_IDEMP.put.mock.calls[0][0];
            expect(putKey).toContain("rate:");
            expect(putKey).toContain("my-tenant");
            expect(putKey).toContain(":fb:");
            expect(putKey).toMatch(/\d{4}-\d{2}-\d{2}$/);
        });

        it("sets TTL of 25 hours (90000 seconds)", async () => {
            const env = createMockEnv();
            env.KV_IDEMP.get.mockResolvedValue("10");

            const tenant = { id: "tenant-123" } as any;
            await incrementCounter("ig", tenant, env);

            expect(env.KV_IDEMP.put).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                { expirationTtl: 90000 }
            );
        });

        it("works for all channel types", async () => {
            const channels = ["yt", "fb", "ig", "tiktok", "x"] as const;
            const tenant = { id: "tenant-123" } as any;

            for (const channel of channels) {
                const env = createMockEnv();
                env.KV_IDEMP.get.mockResolvedValue("1");

                await incrementCounter(channel, tenant, env);

                expect(env.KV_IDEMP.put).toHaveBeenCalledWith(
                    expect.stringContaining(`:${channel}:`),
                    "2",
                    { expirationTtl: 90000 }
                );
            }
        });
    });
});
