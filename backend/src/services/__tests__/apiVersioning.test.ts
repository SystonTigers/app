import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    extractAPIVersion,
    isVersionSupported,
    getVersionInfo,
    addVersionHeaders,
    validateAPIVersionMiddleware,
    getAPIVersionsResponse,
    deprecateVersion,
    sunsetVersion,
    getDeprecationReport,
    API_VERSIONS,
    CURRENT_VERSION,
    LATEST_VERSION,
} from "../apiVersioning";

// Mock log module
vi.mock("../../lib/log", () => ({
    logJSON: vi.fn(),
}));

describe("API Versioning Service", () => {
    // Store original API_VERSIONS to restore after tests
    let originalVersions: typeof API_VERSIONS;

    beforeEach(() => {
        // Deep clone the original versions
        originalVersions = JSON.parse(JSON.stringify(API_VERSIONS));
    });

    afterEach(() => {
        // Restore original versions
        Object.keys(API_VERSIONS).forEach((key) => delete API_VERSIONS[key]);
        Object.assign(API_VERSIONS, originalVersions);
    });

    describe("extractAPIVersion", () => {
        it("extracts version from URL path /api/v1/*", () => {
            const req = new Request("https://api.test.com/api/v1/users");
            expect(extractAPIVersion(req)).toBe("v1");
        });

        it("extracts version from URL path /api/v2/*", () => {
            const req = new Request("https://api.test.com/api/v2/users");
            expect(extractAPIVersion(req)).toBe("v2");
        });

        it("extracts version from X-API-Version header (with v prefix)", () => {
            const req = new Request("https://api.test.com/api/users", {
                headers: { "X-API-Version": "v2" },
            });
            expect(extractAPIVersion(req)).toBe("v2");
        });

        it("extracts version from X-API-Version header (without v prefix)", () => {
            const req = new Request("https://api.test.com/api/users", {
                headers: { "X-API-Version": "2" },
            });
            expect(extractAPIVersion(req)).toBe("v2");
        });

        it("extracts version from Accept header", () => {
            const req = new Request("https://api.test.com/api/users", {
                headers: { Accept: "application/vnd.api+json;version=2" },
            });
            expect(extractAPIVersion(req)).toBe("v2");
        });

        it("prioritizes URL path over headers", () => {
            const req = new Request("https://api.test.com/api/v1/users", {
                headers: { "X-API-Version": "v2" },
            });
            expect(extractAPIVersion(req)).toBe("v1");
        });

        it("prioritizes X-API-Version over Accept header", () => {
            const req = new Request("https://api.test.com/api/users", {
                headers: {
                    "X-API-Version": "v1",
                    Accept: "application/vnd.api+json;version=2",
                },
            });
            expect(extractAPIVersion(req)).toBe("v1");
        });

        it("defaults to CURRENT_VERSION when no version specified", () => {
            const req = new Request("https://api.test.com/api/users");
            expect(extractAPIVersion(req)).toBe(CURRENT_VERSION);
        });
    });

    describe("isVersionSupported", () => {
        it("returns true for active versions", () => {
            expect(isVersionSupported("v1")).toBe(true);
            expect(isVersionSupported("v2")).toBe(true);
        });

        it("returns false for non-existent versions", () => {
            expect(isVersionSupported("v99")).toBe(false);
        });

        it("returns true for deprecated (not sunset) versions", () => {
            API_VERSIONS["v1"].status = "deprecated";
            expect(isVersionSupported("v1")).toBe(true);
        });

        it("returns false for sunset versions", () => {
            API_VERSIONS["v1"].status = "sunset";
            expect(isVersionSupported("v1")).toBe(false);
        });
    });

    describe("getVersionInfo", () => {
        it("returns version info for valid version", () => {
            const info = getVersionInfo("v1");
            expect(info).toBeDefined();
            expect(info?.version).toBe("1");
            expect(info?.status).toBe("active");
        });

        it("returns null for non-existent version", () => {
            expect(getVersionInfo("v99")).toBeNull();
        });
    });

    describe("addVersionHeaders", () => {
        it("adds X-API-Version header", () => {
            const response = new Response("test");
            const modified = addVersionHeaders(response, "v1");
            expect(modified.headers.get("X-API-Version")).toBe("v1");
        });

        it("adds deprecation headers for deprecated versions", () => {
            API_VERSIONS["v1"].status = "deprecated";
            API_VERSIONS["v1"].sunsetDate = "2025-12-31";
            API_VERSIONS["v1"].migrationGuide = "/docs/migrate";

            const response = new Response("test");
            const modified = addVersionHeaders(response, "v1");

            expect(modified.headers.get("Deprecation")).toBe("true");
            expect(modified.headers.get("Sunset")).toBeDefined();
            expect(modified.headers.get("Warning")).toContain("deprecated");
            expect(modified.headers.get("Link")).toContain("migration-guide");
        });

        it("adds Link header to changelog", () => {
            const response = new Response("test");
            const modified = addVersionHeaders(response, "v1");
            expect(modified.headers.get("Link")).toContain("changelog");
        });

        it("returns original response for unknown version", () => {
            const response = new Response("test");
            const modified = addVersionHeaders(response, "v99");
            expect(modified.headers.get("X-API-Version")).toBeNull();
        });

        it("preserves original response body and status", () => {
            const response = new Response("test body", { status: 201 });
            const modified = addVersionHeaders(response, "v1");
            expect(modified.status).toBe(201);
        });
    });

    describe("validateAPIVersionMiddleware", () => {
        it("returns null for valid version", () => {
            const req = new Request("https://api.test.com/api/v1/users");
            expect(validateAPIVersionMiddleware(req)).toBeNull();
        });

        it("returns 400 for non-existent version", async () => {
            const req = new Request("https://api.test.com/api/v99/users");
            const response = validateAPIVersionMiddleware(req);

            expect(response).not.toBeNull();
            expect(response!.status).toBe(400);

            const body = await response!.json() as any;
            expect(body.error.code).toBe("UNSUPPORTED_API_VERSION");
            expect(body.error.supportedVersions).toContain("v1");
        });

        it("returns 410 for sunset version", async () => {
            API_VERSIONS["v1"].status = "sunset";
            API_VERSIONS["v1"].sunsetDate = "2025-01-01";

            const req = new Request("https://api.test.com/api/v1/users");
            const response = validateAPIVersionMiddleware(req);

            expect(response).not.toBeNull();
            expect(response!.status).toBe(410);

            const body = await response!.json() as any;
            expect(body.error.code).toBe("API_VERSION_SUNSET");
        });

        it("returns null for deprecated (but not sunset) version", () => {
            API_VERSIONS["v1"].status = "deprecated";
            const req = new Request("https://api.test.com/api/v1/users");
            expect(validateAPIVersionMiddleware(req)).toBeNull();
        });
    });

    describe("getAPIVersionsResponse", () => {
        it("returns list of versions", async () => {
            const response = getAPIVersionsResponse();
            expect(response.status).toBe(200);

            const body = await response.json() as any;
            expect(body.success).toBe(true);
            expect(body.data.versions).toBeDefined();
            expect(body.data.current).toBe(CURRENT_VERSION);
            expect(body.data.latest).toBe(LATEST_VERSION);
        });

        it("includes cache control header", () => {
            const response = getAPIVersionsResponse();
            expect(response.headers.get("Cache-Control")).toContain("max-age=3600");
        });
    });

    describe("deprecateVersion", () => {
        it("marks version as deprecated", () => {
            deprecateVersion("v1", "2025-12-31");
            expect(API_VERSIONS["v1"].status).toBe("deprecated");
            expect(API_VERSIONS["v1"].deprecationDate).toBeDefined();
            expect(API_VERSIONS["v1"].sunsetDate).toBe("2025-12-31");
        });

        it("throws for non-existent version", () => {
            expect(() => deprecateVersion("v99", "2025-12-31")).toThrow(
                "Version v99 not found"
            );
        });
    });

    describe("sunsetVersion", () => {
        it("marks version as sunset", () => {
            sunsetVersion("v1");
            expect(API_VERSIONS["v1"].status).toBe("sunset");
        });

        it("throws for non-existent version", () => {
            expect(() => sunsetVersion("v99")).toThrow("Version v99 not found");
        });
    });

    describe("getDeprecationReport", () => {
        it("categorizes versions by status", () => {
            const report = getDeprecationReport();
            expect(report.active).toContain("v1");
            expect(report.deprecated).toEqual([]);
            expect(report.sunset).toEqual([]);
        });

        it("includes deprecated versions with sunset dates", () => {
            API_VERSIONS["v1"].status = "deprecated";
            API_VERSIONS["v1"].sunsetDate = "2025-12-31";

            const report = getDeprecationReport();
            expect(report.deprecated).toContainEqual({
                version: "v1",
                sunsetDate: "2025-12-31",
            });
        });

        it("includes sunset versions", () => {
            API_VERSIONS["v1"].status = "sunset";
            API_VERSIONS["v1"].sunsetDate = "2025-01-01";

            const report = getDeprecationReport();
            expect(report.sunset).toContainEqual({
                version: "v1",
                sunsetDate: "2025-01-01",
            });
        });
    });

    describe("Constants", () => {
        it("CURRENT_VERSION is defined", () => {
            expect(CURRENT_VERSION).toBeDefined();
            expect(CURRENT_VERSION).toBe("v1");
        });

        it("LATEST_VERSION is defined", () => {
            expect(LATEST_VERSION).toBeDefined();
            expect(LATEST_VERSION).toBe("v2");
        });

        it("API_VERSIONS contains expected versions", () => {
            expect(API_VERSIONS).toHaveProperty("v1");
            expect(API_VERSIONS).toHaveProperty("v2");
        });
    });
});
