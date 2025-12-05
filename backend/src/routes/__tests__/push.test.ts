import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    handlePushRegister,
    handlePushSend,
    handlePushBroadcast,
} from "../push";

// Mock auth verification
vi.mock("../auth", () => ({
    verifyJWT: vi.fn().mockResolvedValue({
        tenant_id: "test-tenant",
        sub: "user-123",
        roles: ["admin"],
    }),
}));

// Mock error handler
vi.mock("../../middleware/errorHandler", () => ({
    createResponse: (data: any) =>
        new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        }),
    errorResponse: (code: string, message: string, status: number, details?: any) =>
        new Response(JSON.stringify({ error: { code, message, details } }), {
            status,
            headers: { "Content-Type": "application/json" },
        }),
}));

describe("Push Routes", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue({ ok: true });
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    const createMockDb = () => ({
        prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            run: vi.fn().mockResolvedValue({ success: true }),
            all: vi.fn().mockResolvedValue({ results: [] }),
        }),
    });

    const createMockEnv = () => ({
        DB: createMockDb(),
        FCM_SERVER_KEY: "mock-fcm-key",
    });

    describe("handlePushRegister", () => {
        it("registers a device token", async () => {
            const env = createMockEnv();
            const request = {
                headers: new Headers({ Authorization: "Bearer valid-token" }),
                json: vi.fn().mockResolvedValue({
                    platform: "ios",
                    token: "device-token-123",
                }),
            };

            const response = await handlePushRegister(request as any, env as any);
            const body = await response.json();

            expect(body.success).toBe(true);
        });

        it("validates platform enum", async () => {
            const env = createMockEnv();
            const request = {
                headers: new Headers({ Authorization: "Bearer valid-token" }),
                json: vi.fn().mockResolvedValue({
                    platform: "invalid-platform",
                    token: "device-token-123",
                }),
            };

            const response = await handlePushRegister(request as any, env as any);
            expect(response.status).toBe(400);
        });

        it("validates token is not empty", async () => {
            const env = createMockEnv();
            const request = {
                headers: new Headers({ Authorization: "Bearer valid-token" }),
                json: vi.fn().mockResolvedValue({
                    platform: "android",
                    token: "",
                }),
            };

            const response = await handlePushRegister(request as any, env as any);
            expect(response.status).toBe(400);
        });

        it("returns 401 for missing auth header", async () => {
            const env = createMockEnv();
            const request = {
                headers: new Headers(),
                json: vi.fn().mockResolvedValue({
                    platform: "ios",
                    token: "token",
                }),
            };

            const response = await handlePushRegister(request as any, env as any);
            expect(response.status).toBe(401);
        });

        it("accepts web platform", async () => {
            const env = createMockEnv();
            const request = {
                headers: new Headers({ Authorization: "Bearer valid-token" }),
                json: vi.fn().mockResolvedValue({
                    platform: "web",
                    token: "web-push-token",
                }),
            };

            const response = await handlePushRegister(request as any, env as any);
            const body = await response.json();

            expect(body.success).toBe(true);
        });
    });

    describe("handlePushSend", () => {
        it("sends notification to specific user", async () => {
            const env = createMockEnv();
            (env.DB.prepare as any).mockReturnValue({
                bind: vi.fn().mockReturnThis(),
                all: vi.fn().mockResolvedValue({
                    results: [{ token: "device-token-1", platform: "ios" }],
                }),
            });

            const request = {
                headers: new Headers({ Authorization: "Bearer valid-token" }),
                json: vi.fn().mockResolvedValue({
                    user_id: "target-user",
                    notification: {
                        title: "Test Title",
                        body: "Test body message",
                    },
                }),
            };

            const response = await handlePushSend(request as any, env as any);
            const body = await response.json();

            expect(body.success).toBe(true);
            expect(body.sent).toBe(1);
        });

        it("returns 0 sent when user has no devices", async () => {
            const env = createMockEnv();
            (env.DB.prepare as any).mockReturnValue({
                bind: vi.fn().mockReturnThis(),
                all: vi.fn().mockResolvedValue({ results: [] }),
            });

            const request = {
                headers: new Headers({ Authorization: "Bearer valid-token" }),
                json: vi.fn().mockResolvedValue({
                    user_id: "user-no-devices",
                    notification: { title: "Test", body: "Message" },
                }),
            };

            const response = await handlePushSend(request as any, env as any);
            const body = await response.json();

            expect(body.success).toBe(true);
            expect(body.sent).toBe(0);
        });

        it("includes optional data payload", async () => {
            const env = createMockEnv();
            (env.DB.prepare as any).mockReturnValue({
                bind: vi.fn().mockReturnThis(),
                all: vi.fn().mockResolvedValue({
                    results: [{ token: "token-1" }],
                }),
            });

            const request = {
                headers: new Headers({ Authorization: "Bearer valid-token" }),
                json: vi.fn().mockResolvedValue({
                    user_id: "user-1",
                    notification: { title: "Title", body: "Body" },
                    data: { action: "open_match", match_id: "123" },
                }),
            };

            const response = await handlePushSend(request as any, env as any);
            const body = await response.json();

            expect(body.success).toBe(true);
        });

        it("validates notification object", async () => {
            const env = createMockEnv();
            const request = {
                headers: new Headers({ Authorization: "Bearer valid-token" }),
                json: vi.fn().mockResolvedValue({
                    user_id: "user-1",
                    notification: "invalid", // Should be object
                }),
            };

            const response = await handlePushSend(request as any, env as any);
            expect(response.status).toBe(400);
        });
    });

    describe("handlePushBroadcast", () => {
        it("broadcasts to all tenant devices", async () => {
            const env = createMockEnv();
            (env.DB.prepare as any).mockReturnValue({
                bind: vi.fn().mockReturnThis(),
                all: vi.fn().mockResolvedValue({
                    results: [
                        { token: "token-1", platform: "ios" },
                        { token: "token-2", platform: "android" },
                        { token: "token-3", platform: "web" },
                    ],
                }),
            });

            const request = {
                headers: new Headers({ Authorization: "Bearer valid-token" }),
                json: vi.fn().mockResolvedValue({
                    notification: {
                        title: "Broadcast Title",
                        body: "Broadcast message",
                    },
                }),
            };

            const response = await handlePushBroadcast(request as any, env as any);
            const body = await response.json();

            expect(body.success).toBe(true);
            expect(body.sent).toBe(3);
        });

        it("returns 0 sent when no devices registered", async () => {
            const env = createMockEnv();
            (env.DB.prepare as any).mockReturnValue({
                bind: vi.fn().mockReturnThis(),
                all: vi.fn().mockResolvedValue({ results: [] }),
            });

            const request = {
                headers: new Headers({ Authorization: "Bearer valid-token" }),
                json: vi.fn().mockResolvedValue({
                    notification: { title: "Test", body: "Message" },
                }),
            };

            const response = await handlePushBroadcast(request as any, env as any);
            const body = await response.json();

            expect(body.success).toBe(true);
            expect(body.sent).toBe(0);
        });

        it("validates broadcast schema", async () => {
            const env = createMockEnv();
            const request = {
                headers: new Headers({ Authorization: "Bearer valid-token" }),
                json: vi.fn().mockResolvedValue({
                    // Missing notification object
                }),
            };

            const response = await handlePushBroadcast(request as any, env as any);
            expect(response.status).toBe(400);
        });
    });
});
