import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    canAccess,
    requireRole,
    requirePermission,
    withRole,
    withPermission,
    getSessionFromRequest,
} from "../../middleware/permissions";

// Mock the verifyJWT function from auth routes
vi.mock("../../routes/auth", () => ({
    verifyJWT: vi.fn(),
}));

describe("Permissions Middleware", () => {
    describe("canAccess", () => {
        it("allows manager to access everything", () => {
            expect(canAccess("manager", "squad", "view")).toBe(true);
            expect(canAccess("manager", "squad", "create")).toBe(true);
            expect(canAccess("manager", "squad", "edit")).toBe(true);
            expect(canAccess("manager", "squad", "delete")).toBe(true);
            expect(canAccess("manager", "settings", "edit")).toBe(true);
            expect(canAccess("manager", "admin", "view")).toBe(true);
        });

        it("allows tenant_admin to access everything", () => {
            expect(canAccess("tenant_admin", "squad", "view")).toBe(true);
            expect(canAccess("tenant_admin", "admin", "edit")).toBe(true);
        });

        it("allows platform_admin to access everything", () => {
            expect(canAccess("platform_admin", "settings", "delete")).toBe(true);
        });

        it("restricts coach from deleting squad", () => {
            expect(canAccess("coach", "squad", "view")).toBe(true);
            expect(canAccess("coach", "squad", "create")).toBe(true);
            expect(canAccess("coach", "squad", "edit")).toBe(true);
            expect(canAccess("coach", "squad", "delete")).toBe(false);
        });

        it("restricts parent from editing squad", () => {
            expect(canAccess("parent", "squad", "view")).toBe(true);
            expect(canAccess("parent", "squad", "create")).toBe(false);
            expect(canAccess("parent", "squad", "edit")).toBe(false);
        });

        it("restricts player from viewing tactics", () => {
            expect(canAccess("player", "tactics", "view")).toBe(true);
            expect(canAccess("player", "admin", "view")).toBe(false);
        });

        it("heavily restricts fan access", () => {
            expect(canAccess("fan", "squad", "view")).toBe(true);
            expect(canAccess("fan", "fixtures", "view")).toBe(true);
            expect(canAccess("fan", "training", "view")).toBe(false);
            expect(canAccess("fan", "tactics", "view")).toBe(false);
            expect(canAccess("fan", "discussions", "view")).toBe(false);
            expect(canAccess("fan", "admin", "view")).toBe(false);
        });

        it("returns false for unknown role", () => {
            expect(canAccess("unknown", "squad", "view")).toBe(false);
        });
    });

    describe("getSessionFromRequest", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("returns null when no Authorization header", async () => {
            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
            });
            const env = {};

            const session = await getSessionFromRequest(req, env);

            expect(session).toBeNull();
        });

        it("returns null for malformed Authorization header", async () => {
            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
                headers: { "Authorization": "Basic abc123" },
            });
            const env = {};

            const session = await getSessionFromRequest(req, env);

            expect(session).toBeNull();
        });

        it("returns null when Bearer token is empty", async () => {
            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
                headers: { "Authorization": "Bearer " },
            });
            const env = {};

            const session = await getSessionFromRequest(req, env);

            expect(session).toBeNull();
        });

        it("extracts role from valid token", async () => {
            const { verifyJWT } = await import("../../routes/auth");
            (verifyJWT as any).mockResolvedValue({
                role: "coach",
                tenant_id: "tenant-123",
                player_id: "player-456",
            });

            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
                headers: { "Authorization": "Bearer valid-token" },
            });
            const env = { JWT_SECRET: "secret" };

            const session = await getSessionFromRequest(req, env);

            expect(session).toEqual({
                role: "coach",
                tenantId: "tenant-123",
                playerId: "player-456",
            });
        });

        it("defaults to fan role if not specified in token", async () => {
            const { verifyJWT } = await import("../../routes/auth");
            (verifyJWT as any).mockResolvedValue({
                tenant_id: "tenant-123",
            });

            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
                headers: { "Authorization": "Bearer valid-token" },
            });
            const env = { JWT_SECRET: "secret" };

            const session = await getSessionFromRequest(req, env);

            expect(session?.role).toBe("fan");
        });
    });

    describe("requireRole", () => {
        it("returns unauthorized when no session", async () => {
            const middleware = requireRole("coach");
            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
                // No auth header
            });
            const env = {};
            const corsHdrs = new Headers();

            const result = await middleware(req, env, corsHdrs);

            expect(result).not.toBeNull();
            expect(result?.status).toBe(401);
            const body = await result?.json() as any;
            expect(body.error.code).toBe("UNAUTHORIZED");
        });

        it("returns forbidden when role is insufficient", async () => {
            const { verifyJWT } = await import("../../routes/auth");
            (verifyJWT as any).mockResolvedValue({
                role: "fan",
                tenant_id: "tenant-123",
            });

            const middleware = requireRole("coach");
            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
                headers: { "Authorization": "Bearer token" },
            });
            const env = { JWT_SECRET: "secret" };
            const corsHdrs = new Headers();

            const result = await middleware(req, env, corsHdrs);

            expect(result).not.toBeNull();
            expect(result?.status).toBe(403);
            const body = await result?.json() as any;
            expect(body.error.code).toBe("FORBIDDEN");
        });

        it("returns null (allows) when role is sufficient", async () => {
            const { verifyJWT } = await import("../../routes/auth");
            (verifyJWT as any).mockResolvedValue({
                role: "manager",
                tenant_id: "tenant-123",
            });

            const middleware = requireRole("coach");
            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
                headers: { "Authorization": "Bearer token" },
            });
            const env = { JWT_SECRET: "secret" };
            const corsHdrs = new Headers();

            const result = await middleware(req, env, corsHdrs);

            expect(result).toBeNull();
        });
    });

    describe("requirePermission", () => {
        it("returns forbidden when permission is denied", async () => {
            const { verifyJWT } = await import("../../routes/auth");
            (verifyJWT as any).mockResolvedValue({
                role: "fan",
                tenant_id: "tenant-123",
            });

            const middleware = requirePermission("tactics", "view");
            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
                headers: { "Authorization": "Bearer token" },
            });
            const env = { JWT_SECRET: "secret" };
            const corsHdrs = new Headers();

            const result = await middleware(req, env, corsHdrs);

            expect(result).not.toBeNull();
            expect(result?.status).toBe(403);
        });

        it("returns null (allows) when permission is granted", async () => {
            const { verifyJWT } = await import("../../routes/auth");
            (verifyJWT as any).mockResolvedValue({
                role: "coach",
                tenant_id: "tenant-123",
            });

            const middleware = requirePermission("tactics", "view");
            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
                headers: { "Authorization": "Bearer token" },
            });
            const env = { JWT_SECRET: "secret" };
            const corsHdrs = new Headers();

            const result = await middleware(req, env, corsHdrs);

            expect(result).toBeNull();
        });
    });

    describe("withRole wrapper", () => {
        it("executes handler when role check passes", async () => {
            const { verifyJWT } = await import("../../routes/auth");
            (verifyJWT as any).mockResolvedValue({
                role: "manager",
                tenant_id: "tenant-123",
            });

            const mockHandler = vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ success: true }), { status: 200 })
            );

            const wrappedHandler = withRole("coach", mockHandler);
            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
                headers: { "Authorization": "Bearer token" },
            });
            const env = { JWT_SECRET: "secret" };
            const corsHdrs = new Headers();

            const result = await wrappedHandler(req, env, corsHdrs);

            expect(mockHandler).toHaveBeenCalled();
            expect(result.status).toBe(200);
        });

        it("blocks handler when role check fails", async () => {
            const { verifyJWT } = await import("../../routes/auth");
            (verifyJWT as any).mockResolvedValue({
                role: "fan",
                tenant_id: "tenant-123",
            });

            const mockHandler = vi.fn();

            const wrappedHandler = withRole("coach", mockHandler);
            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
                headers: { "Authorization": "Bearer token" },
            });
            const env = { JWT_SECRET: "secret" };
            const corsHdrs = new Headers();

            const result = await wrappedHandler(req, env, corsHdrs);

            expect(mockHandler).not.toHaveBeenCalled();
            expect(result.status).toBe(403);
        });
    });

    describe("withPermission wrapper", () => {
        it("executes handler when permission check passes", async () => {
            const { verifyJWT } = await import("../../routes/auth");
            (verifyJWT as any).mockResolvedValue({
                role: "coach",
                tenant_id: "tenant-123",
            });

            const mockHandler = vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ success: true }), { status: 200 })
            );

            const wrappedHandler = withPermission("squad", "view", mockHandler);
            const req = new Request("https://api.test.com/endpoint", {
                method: "GET",
                headers: { "Authorization": "Bearer token" },
            });
            const env = { JWT_SECRET: "secret" };
            const corsHdrs = new Headers();

            const result = await wrappedHandler(req, env, corsHdrs);

            expect(mockHandler).toHaveBeenCalled();
            expect(result.status).toBe(200);
        });
    });
});
