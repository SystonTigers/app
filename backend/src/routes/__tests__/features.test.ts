import { describe, it, expect, vi } from "vitest";
import {
    handleGetFeatures,
    handleUpdateFeatures,
    handleGetConfig,
    handleUpdateConfig,
    handleGetBranding,
    handleUpdateBranding,
    FEATURE_FLAGS,
} from "../features";

// Mock auth service
vi.mock("../../services/auth", () => ({
    requireJWT: vi.fn().mockResolvedValue({
        tenantId: "test-tenant",
        userId: "user123",
        roles: ["admin", "coach"],
    }),
}));

// Mock util service
vi.mock("../../services/util", () => ({
    json: (body: any, status = 200, headers?: any) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
        }),
}));

describe("Features Routes", () => {
    const createMockKV = (storedConfig?: any) => ({
        get: vi.fn().mockResolvedValue(storedConfig),
        put: vi.fn().mockResolvedValue(undefined),
    });

    const createMockDb = (firstResult?: any) => ({
        prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnThis(),
            run: vi.fn().mockResolvedValue({ success: true }),
            first: vi.fn().mockResolvedValue(firstResult),
        }),
    });

    const createMockEnv = (kvConfig?: any, dbResult?: any) => ({
        KV: createMockKV(kvConfig),
        DB: createMockDb(dbResult),
    });

    const createCorsHeaders = () => new Headers({
        "Access-Control-Allow-Origin": "*",
    });

    describe("FEATURE_FLAGS constant", () => {
        it("contains all expected feature categories", () => {
            const categories = new Set(Object.values(FEATURE_FLAGS).map((f: any) => f.category));
            expect(categories).toContain("content");
            expect(categories).toContain("notifications");
            expect(categories).toContain("social");
        });

        it("has auto_milestones flag for player milestones", () => {
            expect(FEATURE_FLAGS.auto_milestones).toBeDefined();
            expect(FEATURE_FLAGS.auto_milestones.category).toBe("content");
        });

        it("has auto_player_of_week flag", () => {
            expect(FEATURE_FLAGS.auto_player_of_week).toBeDefined();
        });

        it("has auto_player_of_month flag", () => {
            expect(FEATURE_FLAGS.auto_player_of_month).toBeDefined();
        });

        it("has auto_weekly_roundup flag", () => {
            expect(FEATURE_FLAGS.auto_weekly_roundup).toBeDefined();
        });

        it("has auto_season_posts flag", () => {
            expect(FEATURE_FLAGS.auto_season_posts).toBeDefined();
        });
    });

    describe("handleGetFeatures", () => {
        it("returns all features with current state", async () => {
            const mockConfig = {
                features: {
                    auto_birthdays: true,
                    auto_milestones: false,
                },
            };
            const env = createMockEnv(mockConfig);
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/features");

            const response = await handleGetFeatures(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.data.features).toBeDefined();
            expect(body.data.grouped).toBeDefined();
            expect(body.data.categories).toContain("content");
        });

        it("returns default values when no config exists", async () => {
            const env = createMockEnv(null);
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/features");

            const response = await handleGetFeatures(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.data.features.length).toBeGreaterThan(0);
        });

        it("groups features by category", async () => {
            const env = createMockEnv({});
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/features");

            const response = await handleGetFeatures(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.data.grouped.content).toBeDefined();
            expect(body.data.grouped.notifications).toBeDefined();
            expect(body.data.grouped.social).toBeDefined();
        });
    });

    describe("handleUpdateFeatures", () => {
        it("updates feature flags", async () => {
            const mockConfig = { features: {} };
            const env = createMockEnv(mockConfig);
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/features", {
                method: "PATCH",
                body: JSON.stringify({
                    auto_milestones: true,
                    auto_player_of_week: true,
                }),
            });

            const response = await handleUpdateFeatures(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.data.updated).toContain("auto_milestones");
            expect(body.data.updated).toContain("auto_player_of_week");
        });

        it("ignores invalid feature keys", async () => {
            const mockConfig = { features: {} };
            const env = createMockEnv(mockConfig);
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/features", {
                method: "PATCH",
                body: JSON.stringify({
                    invalid_feature: true,
                    auto_milestones: true,
                }),
            });

            const response = await handleUpdateFeatures(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.data.updated).not.toContain("invalid_feature");
            expect(body.data.updated).toContain("auto_milestones");
        });

        it("saves updated config to KV", async () => {
            const mockConfig = { features: { auto_birthdays: true } };
            const env = createMockEnv(mockConfig);
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/features", {
                method: "PATCH",
                body: JSON.stringify({ auto_milestones: true }),
            });

            await handleUpdateFeatures(req, env, corsHdrs);

            expect(env.KV.put).toHaveBeenCalled();
        });
    });

    describe("handleGetConfig", () => {
        it("returns tenant configuration", async () => {
            const mockConfig = {
                team_id: "test-tenant",
                team_name: "Test FC",
                features: { auto_birthdays: true },
                season_dates: { start: "09-01", mid: "01-01", end: "05-31" },
            };
            const mockTenant = { name: "Test FC", id: "test-tenant" };
            const env = createMockEnv(mockConfig, mockTenant);
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/config");

            const response = await handleGetConfig(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.data.config).toBeDefined();
            expect(body.data.config.season_dates).toBeDefined();
        });

        it("returns default values when no config exists", async () => {
            const env = createMockEnv(null, { name: "Test FC" });
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/config");

            const response = await handleGetConfig(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.data.config.season_dates.start).toBe("09-01");
        });
    });

    describe("handleUpdateConfig", () => {
        it("updates team name", async () => {
            const mockConfig = { team_name: "Old Name" };
            const env = createMockEnv(mockConfig);
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/config", {
                method: "PATCH",
                body: JSON.stringify({ team_name: "New Team Name" }),
            });

            const response = await handleUpdateConfig(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(env.KV.put).toHaveBeenCalled();
        });

        it("updates season dates", async () => {
            const mockConfig = { season_dates: { start: "09-01", mid: "01-01", end: "05-31" } };
            const env = createMockEnv(mockConfig);
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/config", {
                method: "PATCH",
                body: JSON.stringify({
                    season_dates: { start: "08-15", end: "06-15" },
                }),
            });

            const response = await handleUpdateConfig(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
        });

        it("updates webhook URL", async () => {
            const mockConfig = {};
            const env = createMockEnv(mockConfig);
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/config", {
                method: "PATCH",
                body: JSON.stringify({
                    webhook_url: "https://hook.make.com/abc123",
                }),
            });

            const response = await handleUpdateConfig(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
        });
    });

    describe("handleGetBranding", () => {
        it("returns branding when found", async () => {
            const mockBranding = {
                tenant_id: "test-tenant",
                primary_color: "#FF0000",
                secondary_color: "#FFFFFF",
                badge_url: "https://example.com/badge.png",
            };
            const env = createMockEnv(null, mockBranding);
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/config/branding");

            const response = await handleGetBranding(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.data.primary_color).toBe("#FF0000");
        });

        it("returns default colors when no branding exists", async () => {
            const env = createMockEnv(null, null);
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/config/branding");

            const response = await handleGetBranding(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(body.data.primary_color).toBe("#FFD700");
            expect(body.data.secondary_color).toBe("#000000");
        });
    });

    describe("handleUpdateBranding", () => {
        it("updates branding colors", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/config/branding", {
                method: "PATCH",
                body: JSON.stringify({
                    primary_color: "#00FF00",
                    secondary_color: "#0000FF",
                }),
            });

            const response = await handleUpdateBranding(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
            expect(env.DB.prepare).toHaveBeenCalled();
        });

        it("rejects invalid color format", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/config/branding", {
                method: "PATCH",
                body: JSON.stringify({
                    primary_color: "not-a-color",
                }),
            });

            const response = await handleUpdateBranding(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(false);
            expect(body.error).toContain("Invalid");
        });

        it("accepts valid hex color with lowercase", async () => {
            const env = createMockEnv();
            const corsHdrs = createCorsHeaders();

            const req = new Request("https://api.test.com/config/branding", {
                method: "PATCH",
                body: JSON.stringify({
                    primary_color: "#aabbcc",
                }),
            });

            const response = await handleUpdateBranding(req, env, corsHdrs);
            const body = await response.json() as any;

            expect(body.success).toBe(true);
        });
    });
});
