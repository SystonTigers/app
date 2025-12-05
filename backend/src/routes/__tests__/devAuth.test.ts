import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleDevAdminJWT, handleDevMagicLink, handleDevInfo } from "../devAuth";

// Mock jose
vi.mock("jose", () => ({
    SignJWT: vi.fn().mockImplementation(() => ({
        setProtectedHeader: vi.fn().mockReturnThis(),
        setIssuer: vi.fn().mockReturnThis(),
        setAudience: vi.fn().mockReturnThis(),
        setSubject: vi.fn().mockReturnThis(),
        setIssuedAt: vi.fn().mockReturnThis(),
        setExpirationTime: vi.fn().mockReturnThis(),
        sign: vi.fn().mockResolvedValue("mock-jwt-token"),
    })),
}));

// Mock lib/validate json
vi.mock("../../lib/validate", () => ({
    json: (body: any, status = 200) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
        }),
}));

describe("Dev Auth Routes", () => {
    describe("handleDevAdminJWT", () => {
        it("returns 403 in non-development environment", async () => {
            const env = {
                ENVIRONMENT: "production",
                JWT_SECRET: "secret",
                JWT_ISSUER: "test",
            };

            const req = new Request("https://api.test.com/dev/auth/admin-jwt", {
                method: "POST",
                body: JSON.stringify({ tenantId: "test" }),
            });

            const response = await handleDevAdminJWT(req, env as any);
            const body = await response.json() as any;

            expect(response.status).toBe(403);
            expect(body.success).toBe(false);
            expect(body.error).toContain("development");
        });

        it("generates JWT in development environment", async () => {
            const env = {
                ENVIRONMENT: "development",
                JWT_SECRET: "test-secret",
                JWT_ISSUER: "syston.app",
            };

            const req = new Request("https://api.test.com/dev/auth/admin-jwt", {
                method: "POST",
                body: JSON.stringify({ tenantId: "my-tenant", email: "admin@test.com" }),
            });

            const response = await handleDevAdminJWT(req, env as any);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.token).toBe("mock-jwt-token");
            expect(body.tenantId).toBe("my-tenant");
            expect(body.email).toBe("admin@test.com");
            expect(body.warning).toContain("DEV MODE");
        });

        it("uses default tenantId and email when not provided", async () => {
            const env = {
                ENVIRONMENT: "development",
                JWT_SECRET: "test-secret",
            };

            const req = new Request("https://api.test.com/dev/auth/admin-jwt", {
                method: "POST",
                body: JSON.stringify({}),
            });

            const response = await handleDevAdminJWT(req, env as any);
            const body = await response.json() as any;

            expect(body.tenantId).toBe("test-tenant");
            expect(body.email).toBe("dev@localhost");
        });

        it("handles invalid JSON body", async () => {
            const env = {
                ENVIRONMENT: "development",
                JWT_SECRET: "test-secret",
            };

            const req = new Request("https://api.test.com/dev/auth/admin-jwt", {
                method: "POST",
                body: "invalid json",
            });

            const response = await handleDevAdminJWT(req, env as any);
            const body = await response.json() as any;

            // Should use defaults even with invalid JSON
            expect(body.success).toBe(true);
        });
    });

    describe("handleDevMagicLink", () => {
        it("returns 403 in non-development environment", async () => {
            const env = {
                ENVIRONMENT: "staging",
                JWT_SECRET: "secret",
            };

            const req = new Request("https://api.test.com/dev/auth/magic-link", {
                method: "POST",
                body: JSON.stringify({}),
            });

            const response = await handleDevMagicLink(req, env as any);
            const body = await response.json() as any;

            expect(response.status).toBe(403);
            expect(body.success).toBe(false);
        });

        it("generates magic link in development environment", async () => {
            const env = {
                ENVIRONMENT: "development",
                JWT_SECRET: "test-secret",
                ADMIN_CONSOLE_URL: "http://localhost:3000",
            };

            const req = new Request("https://api.test.com/dev/auth/magic-link", {
                method: "POST",
                body: JSON.stringify({ tenantId: "my-tenant", email: "user@test.com" }),
            });

            const response = await handleDevMagicLink(req, env as any);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.magicLink).toContain("localhost:3000");
            expect(body.magicLink).toContain("token=");
            expect(body.tenantId).toBe("my-tenant");
            expect(body.email).toBe("user@test.com");
        });

        it("uses defaults when not provided", async () => {
            const env = {
                ENVIRONMENT: "development",
                JWT_SECRET: "test-secret",
                ADMIN_CONSOLE_URL: "http://localhost:3000",
            };

            const req = new Request("https://api.test.com/dev/auth/magic-link", {
                method: "POST",
                body: JSON.stringify({}),
            });

            const response = await handleDevMagicLink(req, env as any);
            const body = await response.json() as any;

            expect(body.tenantId).toBe("test-tenant");
            expect(body.email).toBe("dev@localhost");
        });
    });

    describe("handleDevInfo", () => {
        it("returns environment info", async () => {
            const env = {
                ENVIRONMENT: "development",
                BACKEND_URL: "http://localhost:8787",
                ADMIN_CONSOLE_URL: "http://localhost:3000",
                JWT_ISSUER: "syston.app",
            };

            const req = new Request("https://api.test.com/dev/info");

            const response = await handleDevInfo(req, env as any);
            const body = await response.json() as any;

            expect(body.environment).toBe("development");
            expect(body.isDevelopment).toBe(true);
            expect(body.backendUrl).toBe("http://localhost:8787");
            expect(body.adminConsoleUrl).toBe("http://localhost:3000");
            expect(body.devEndpointsEnabled).toBe(true);
        });

        it("shows devEndpointsEnabled as false in production", async () => {
            const env = {
                ENVIRONMENT: "production",
                BACKEND_URL: "https://api.example.com",
            };

            const req = new Request("https://api.test.com/dev/info");

            const response = await handleDevInfo(req, env as any);
            const body = await response.json() as any;

            expect(body.isDevelopment).toBe(false);
            expect(body.devEndpointsEnabled).toBe(false);
        });

        it("handles missing env values", async () => {
            const env = {};

            const req = new Request("https://api.test.com/dev/info");

            const response = await handleDevInfo(req, env as any);
            const body = await response.json() as any;

            expect(body.environment).toBe("unknown");
            expect(body.backendUrl).toBe("not set");
        });
    });
});
