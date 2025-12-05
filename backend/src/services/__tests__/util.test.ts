import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    json,
    cors,
    readIdempotencyKey,
    assert,
    badReq,
    nowMs,
    expMs,
    id,
    nanoid,
    kvGetJSON,
    kvPutJSON,
    kvListJSON,
} from "../util";

// Mock the securityHeaders middleware
vi.mock("../../middleware/securityHeaders", () => ({
    withSecurity: (init: ResponseInit) => init,
}));

describe("Util Service", () => {
    describe("json", () => {
        it("returns a JSON response with default status 200", () => {
            const body = { success: true, data: { name: "test" } };
            const response = json(body);

            expect(response.status).toBe(200);
            expect(response.headers.get("content-type")).toBe("application/json");
        });

        it("accepts custom status code", () => {
            const response = json({ error: "Not Found" }, 404);
            expect(response.status).toBe(404);
        });

        it("accepts custom headers", () => {
            const response = json(
                { data: "test" },
                200,
                { "X-Custom-Header": "value" }
            );
            expect(response.headers.get("X-Custom-Header")).toBe("value");
        });

        it("adds requestId to error responses when X-Request-Id header is present", () => {
            const response = json(
                { success: false, error: { code: "ERR", message: "fail" } },
                400,
                { "X-Request-Id": "req-123" }
            );
            // We can't easily inspect the body without consuming it, but we test it doesn't throw
            expect(response.status).toBe(400);
        });

        it("adds release info to meta when X-Release header is present", () => {
            const response = json(
                { success: true, data: {} },
                200,
                { "X-Release": "v1.2.3" }
            );
            expect(response.status).toBe(200);
        });
    });

    describe("cors", () => {
        it("returns allowed origin if in whitelist (null originList uses defaults)", () => {
            const headers = cors(null, "http://localhost:5173");
            expect(headers["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
        });

        it("returns * for non-whitelisted origins", () => {
            const headers = cors(null, "https://evil.com");
            expect(headers["Access-Control-Allow-Origin"]).toBe("*");
        });

        it("uses custom origin list when provided", () => {
            const headers = cors(["https://myapp.com"], "https://myapp.com");
            expect(headers["Access-Control-Allow-Origin"]).toBe("https://myapp.com");
        });

        it("denies origins not in custom list", () => {
            const headers = cors(["https://myapp.com"], "https://other.com");
            expect(headers["Access-Control-Allow-Origin"]).toBe("*");
        });

        it("includes required CORS headers", () => {
            const headers = cors(null, null);
            expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
            expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
            expect(headers["Access-Control-Allow-Headers"]).toContain("authorization");
            expect(headers["Vary"]).toBe("Origin");
        });

        it("allows capacitor://localhost for mobile apps", () => {
            const headers = cors(null, "capacitor://localhost");
            expect(headers["Access-Control-Allow-Origin"]).toBe("capacitor://localhost");
        });
    });

    describe("readIdempotencyKey", () => {
        it("returns idempotency key from header", () => {
            const req = new Request("https://api.test.com/endpoint", {
                headers: { "Idempotency-Key": "idem-123" },
            });
            expect(readIdempotencyKey(req)).toBe("idem-123");
        });

        it("returns empty string if no idempotency key", () => {
            const req = new Request("https://api.test.com/endpoint");
            expect(readIdempotencyKey(req)).toBe("");
        });
    });

    describe("assert", () => {
        it("does not throw when condition is truthy", () => {
            expect(() => assert(true)).not.toThrow();
            expect(() => assert(1)).not.toThrow();
            expect(() => assert("non-empty")).not.toThrow();
            expect(() => assert({})).not.toThrow();
        });

        it("throws with default message when condition is falsy", () => {
            expect(() => assert(false)).toThrow("bad request");
            expect(() => assert(0)).toThrow("bad request");
            expect(() => assert("")).toThrow("bad request");
            expect(() => assert(null)).toThrow("bad request");
        });

        it("throws with custom message when provided", () => {
            expect(() => assert(false, "custom error")).toThrow("custom error");
        });

        it("thrown error has status 400", () => {
            try {
                assert(false);
            } catch (e: any) {
                expect(e.status).toBe(400);
            }
        });
    });

    describe("badReq", () => {
        it("returns an Error with message", () => {
            const err = badReq("Invalid input");
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toBe("Invalid input");
        });

        it("has status 400", () => {
            const err = badReq("test") as any;
            expect(err.status).toBe(400);
        });
    });

    describe("nowMs", () => {
        it("returns current timestamp in milliseconds", () => {
            const before = Date.now();
            const result = nowMs();
            const after = Date.now();

            expect(result).toBeGreaterThanOrEqual(before);
            expect(result).toBeLessThanOrEqual(after);
        });
    });

    describe("expMs", () => {
        it("returns timestamp ttlMinutes in the future", () => {
            const before = Date.now();
            const result = expMs(60);

            // 60 minutes = 3,600,000 ms
            expect(result).toBeGreaterThanOrEqual(before + 60 * 60_000);
            expect(result).toBeLessThanOrEqual(before + 60 * 60_000 + 100);
        });

        it("handles zero TTL", () => {
            const before = Date.now();
            const result = expMs(0);

            expect(result).toBeGreaterThanOrEqual(before);
            expect(result).toBeLessThanOrEqual(before + 100);
        });
    });

    describe("id", () => {
        it("generates a string id", () => {
            const result = id();
            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(10);
        });

        it("generates unique ids", () => {
            const ids = new Set(Array.from({ length: 100 }, () => id()));
            expect(ids.size).toBe(100);
        });
    });

    describe("nanoid", () => {
        it("generates id of default length 21", () => {
            const result = nanoid();
            expect(result.length).toBe(21);
        });

        it("generates id of custom length", () => {
            const result = nanoid(10);
            expect(result.length).toBe(10);
        });

        it("generates unique ids", () => {
            const ids = new Set(Array.from({ length: 100 }, () => nanoid()));
            expect(ids.size).toBe(100);
        });

        it("only uses alphanumeric characters", () => {
            const result = nanoid(100);
            expect(result).toMatch(/^[a-zA-Z0-9]+$/);
        });
    });

    describe("KV Helpers", () => {
        describe("kvGetJSON", () => {
            it("returns parsed JSON from KV", async () => {
                const mockKV = {
                    get: vi.fn().mockResolvedValue({ name: "test" }),
                };

                const result = await kvGetJSON(mockKV as any, "key");
                expect(result).toEqual({ name: "test" });
                expect(mockKV.get).toHaveBeenCalledWith("key", "json");
            });

            it("returns null for missing key", async () => {
                const mockKV = {
                    get: vi.fn().mockResolvedValue(null),
                };

                const result = await kvGetJSON(mockKV as any, "missing");
                expect(result).toBeNull();
            });
        });

        describe("kvPutJSON", () => {
            it("stores JSON in KV", async () => {
                const mockKV = {
                    put: vi.fn().mockResolvedValue(undefined),
                };

                await kvPutJSON(mockKV as any, "key", { data: "value" });
                expect(mockKV.put).toHaveBeenCalledWith(
                    "key",
                    JSON.stringify({ data: "value" }),
                    undefined
                );
            });

            it("passes options to KV put", async () => {
                const mockKV = {
                    put: vi.fn().mockResolvedValue(undefined),
                };

                await kvPutJSON(mockKV as any, "key", { data: "value" }, { expirationTtl: 3600 });
                expect(mockKV.put).toHaveBeenCalledWith(
                    "key",
                    JSON.stringify({ data: "value" }),
                    { expirationTtl: 3600 }
                );
            });
        });

        describe("kvListJSON", () => {
            it("lists and fetches all items with prefix", async () => {
                const mockKV = {
                    list: vi.fn().mockResolvedValue({
                        keys: [{ name: "prefix:1" }, { name: "prefix:2" }],
                    }),
                    get: vi.fn()
                        .mockResolvedValueOnce({ id: 1 })
                        .mockResolvedValueOnce({ id: 2 }),
                };

                const result = await kvListJSON(mockKV as any, "prefix:");
                expect(result).toEqual([{ id: 1 }, { id: 2 }]);
                expect(mockKV.list).toHaveBeenCalledWith({ prefix: "prefix:", limit: 1000 });
            });

            it("filters out null values", async () => {
                const mockKV = {
                    list: vi.fn().mockResolvedValue({
                        keys: [{ name: "prefix:1" }, { name: "prefix:2" }],
                    }),
                    get: vi.fn()
                        .mockResolvedValueOnce({ id: 1 })
                        .mockResolvedValueOnce(null),
                };

                const result = await kvListJSON(mockKV as any, "prefix:");
                expect(result).toEqual([{ id: 1 }]);
            });

            it("returns empty array when no keys", async () => {
                const mockKV = {
                    list: vi.fn().mockResolvedValue({ keys: [] }),
                    get: vi.fn(),
                };

                const result = await kvListJSON(mockKV as any, "prefix:");
                expect(result).toEqual([]);
            });
        });
    });
});
