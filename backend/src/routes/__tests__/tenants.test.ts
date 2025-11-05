import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerTenantRoutes } from "../tenants";
import * as gasService from "../../services/gas";
import * as tenantService from "../../services/tenants";

// Mock the gas service
vi.mock("../../services/gas", () => ({
  gasCall: vi.fn(),
}));

// Mock the tenant service
vi.mock("../../services/tenants", () => ({
  getTenant: vi.fn(),
  putTenant: vi.fn(),
}));

describe("Tenant Management Routes", () => {
  let mockEnv: any;
  let corsHdrs: Headers;
  let router: any;
  let postHandler: any;
  let postVerifyHandler: any;

  beforeEach(() => {
    mockEnv = {
      TEMPLATE_SPREADSHEET_ID: "template-spreadsheet-id",
      WORKER_BASE_URL: "https://api.example.com",
      BACKEND_API_KEY: "test-api-key",
      YOUTUBE_API_KEY: "test-youtube-key",
      ENVIRONMENT: "test",
      APP_VERSION: "1.0.0",
    };

    corsHdrs = new Headers();

    // Create a simple router mock that captures handlers
    router = {
      post: vi.fn((path: string, handler: any) => {
        if (path === "/api/tenants") {
          postHandler = handler;
        } else if (path === "/api/tenants/:id/verify") {
          postVerifyHandler = handler;
        }
      }),
    };

    // Register routes
    registerTenantRoutes(router);

    // Reset mocks
    vi.mocked(gasService.gasCall).mockReset();
    vi.mocked(tenantService.getTenant).mockReset();
    vi.mocked(tenantService.putTenant).mockReset();
  });

  describe("POST /api/tenants (Provision Tenant)", () => {
    it("successfully provisions a new tenant", async () => {
      vi.mocked(tenantService.getTenant).mockResolvedValue(null);
      vi.mocked(tenantService.putTenant).mockImplementation(
        async (env, tenant) => tenant
      );
      vi.mocked(gasService.gasCall).mockResolvedValue({
        ok: true,
        spreadsheetId: "new-spreadsheet-id",
        report: { status: "success" },
      });

      const request = new Request("https://example.com/api/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          teamName: "Test Team",
          tenantId: "test-team",
          primary: "#FF0000",
          secondary: "#0000FF",
          badgeUrl: "https://example.com/badge.png",
          contactEmail: "test@example.com",
        }),
      });

      const response = await postHandler(request, mockEnv, corsHdrs, "req-123");

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.tenantId).toBe("test-team");
      expect(data.spreadsheetId).toBe("new-spreadsheet-id");
      expect(data.status).toBe("READY");

      // Verify gasCall was called with correct payload
      expect(gasService.gasCall).toHaveBeenCalledWith(
        mockEnv,
        "provision",
        expect.objectContaining({
          teamName: "Test Team",
          tenantId: "test-team",
          config: expect.objectContaining({
            TEAM_NAME: "Test Team",
            TENANT_ID: "test-team",
            PRIMARY_COLOUR: "#FF0000",
            SECONDARY_COLOUR: "#0000FF",
          }),
        })
      );
    });

    it("provisions tenant with optional fields", async () => {
      vi.mocked(tenantService.getTenant).mockResolvedValue(null);
      vi.mocked(tenantService.putTenant).mockImplementation(
        async (env, tenant) => tenant
      );
      vi.mocked(gasService.gasCall).mockResolvedValue({
        ok: true,
        spreadsheetId: "new-spreadsheet-id",
        report: { status: "success" },
      });

      const request = new Request("https://example.com/api/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          teamName: "Test Team",
          tenantId: "test-team",
          primary: "#FF0000",
          secondary: "#0000FF",
          badgeUrl: "https://example.com/badge.png",
          contactEmail: "test@example.com",
          makeWebhookUrl: "https://make.com/webhook",
          youtubeChannelId: "UC123456789",
        }),
      });

      const response = await postHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify optional fields were passed to gasCall
      expect(gasService.gasCall).toHaveBeenCalledWith(
        mockEnv,
        "provision",
        expect.objectContaining({
          config: expect.objectContaining({
            MAKE_WEBHOOK_URL: "https://make.com/webhook",
            YOUTUBE_CHANNEL_ID: "UC123456789",
          }),
        })
      );
    });

    it("returns existing tenant when already provisioned (idempotency)", async () => {
      vi.mocked(tenantService.getTenant).mockResolvedValue({
        tenantId: "test-team",
        teamName: "Test Team",
        primary: "#FF0000",
        secondary: "#0000FF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "test@example.com",
        spreadsheetId: "existing-spreadsheet-id",
        status: "READY",
        validatorReport: { status: "success" },
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });

      const request = new Request("https://example.com/api/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          teamName: "Test Team",
          tenantId: "test-team",
          primary: "#FF0000",
          secondary: "#0000FF",
          badgeUrl: "https://example.com/badge.png",
          contactEmail: "test@example.com",
        }),
      });

      const response = await postHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.spreadsheetId).toBe("existing-spreadsheet-id");
      expect(data.status).toBe("READY");

      // Should not call gasCall for idempotent request
      expect(gasService.gasCall).not.toHaveBeenCalled();
    });

    it("rejects invalid request with missing required fields", async () => {
      const request = new Request("https://example.com/api/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          teamName: "Test Team",
          // Missing tenantId and other required fields
        }),
      });

      const response = await postHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("invalid_request");
      expect(data.issues).toBeDefined();
    });

    it("rejects tenantId with invalid characters", async () => {
      const request = new Request("https://example.com/api/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          teamName: "Test Team",
          tenantId: "Test_Team!", // Invalid: uppercase and special chars
          primary: "#FF0000",
          secondary: "#0000FF",
          badgeUrl: "https://example.com/badge.png",
          contactEmail: "test@example.com",
        }),
      });

      const response = await postHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("invalid_request");
    });

    it("rejects colors without # prefix", async () => {
      const request = new Request("https://example.com/api/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          teamName: "Test Team",
          tenantId: "test-team",
          primary: "FF0000", // Missing #
          secondary: "#0000FF",
          badgeUrl: "https://example.com/badge.png",
          contactEmail: "test@example.com",
        }),
      });

      const response = await postHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it("rejects invalid email address", async () => {
      const request = new Request("https://example.com/api/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          teamName: "Test Team",
          tenantId: "test-team",
          primary: "#FF0000",
          secondary: "#0000FF",
          badgeUrl: "https://example.com/badge.png",
          contactEmail: "not-an-email",
        }),
      });

      const response = await postHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it("rejects invalid badge URL", async () => {
      const request = new Request("https://example.com/api/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          teamName: "Test Team",
          tenantId: "test-team",
          primary: "#FF0000",
          secondary: "#0000FF",
          badgeUrl: "not-a-url",
          contactEmail: "test@example.com",
        }),
      });

      const response = await postHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it("handles gasCall failure gracefully", async () => {
      vi.mocked(tenantService.getTenant).mockResolvedValue(null);
      vi.mocked(tenantService.putTenant).mockImplementation(
        async (env, tenant) => tenant
      );
      vi.mocked(gasService.gasCall).mockRejectedValue(
        new Error("Google Apps Script error")
      );

      const request = new Request("https://example.com/api/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          teamName: "Test Team",
          tenantId: "test-team",
          primary: "#FF0000",
          secondary: "#0000FF",
          badgeUrl: "https://example.com/badge.png",
          contactEmail: "test@example.com",
        }),
      });

      const response = await postHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(502);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.status).toBe("ERROR");
      expect(data.error).toBe("Google Apps Script error");

      // Verify tenant was updated to ERROR status
      expect(tenantService.putTenant).toHaveBeenCalledWith(
        mockEnv,
        expect.objectContaining({
          status: "ERROR",
          validatorReport: { error: "Google Apps Script error" },
        })
      );
    });

    it("returns success:false when gas validation fails", async () => {
      vi.mocked(tenantService.getTenant).mockResolvedValue(null);
      vi.mocked(tenantService.putTenant).mockImplementation(
        async (env, tenant) => tenant
      );
      vi.mocked(gasService.gasCall).mockResolvedValue({
        ok: false,
        spreadsheetId: "new-spreadsheet-id",
        report: { status: "validation_failed", errors: ["Missing sheet"] },
      });

      const request = new Request("https://example.com/api/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          teamName: "Test Team",
          tenantId: "test-team",
          primary: "#FF0000",
          secondary: "#0000FF",
          badgeUrl: "https://example.com/badge.png",
          contactEmail: "test@example.com",
        }),
      });

      const response = await postHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.status).toBe("ERROR");
      expect(data.validatorReport.errors).toContain("Missing sheet");
    });

    it("rejects malformed JSON", async () => {
      const request = new Request("https://example.com/api/tenants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "not valid json{",
      });

      const response = await postHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe("POST /api/tenants/:id/verify (Verify Tenant)", () => {
    it("successfully verifies tenant setup", async () => {
      vi.mocked(tenantService.getTenant).mockResolvedValue({
        tenantId: "test-team",
        teamName: "Test Team",
        primary: "#FF0000",
        secondary: "#0000FF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "test@example.com",
        spreadsheetId: "spreadsheet-123",
        status: "PROVISIONING",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });
      vi.mocked(tenantService.putTenant).mockImplementation(
        async (env, tenant) => tenant
      );
      vi.mocked(gasService.gasCall).mockResolvedValue({
        ok: true,
        report: { status: "valid", checks: 10 },
      });

      const request = new Request(
        "https://example.com/api/tenants/test-team/verify",
        {
          method: "POST",
        }
      );
      (request as any).params = { id: "test-team" };

      const response = await postVerifyHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.ok).toBe(true);
      expect(data.report.status).toBe("valid");

      // Verify gasCall was called with spreadsheet ID
      expect(gasService.gasCall).toHaveBeenCalledWith(mockEnv, "verify", {
        spreadsheetId: "spreadsheet-123",
      });
    });

    it("returns 404 for non-existent tenant", async () => {
      vi.mocked(tenantService.getTenant).mockResolvedValue(null);

      const request = new Request(
        "https://example.com/api/tenants/non-existent/verify",
        {
          method: "POST",
        }
      );
      (request as any).params = { id: "non-existent" };

      const response = await postVerifyHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("unknown_tenant");
    });

    it("returns 404 for tenant without spreadsheet", async () => {
      vi.mocked(tenantService.getTenant).mockResolvedValue({
        tenantId: "test-team",
        teamName: "Test Team",
        primary: "#FF0000",
        secondary: "#0000FF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "test@example.com",
        spreadsheetId: undefined, // No spreadsheet yet
        status: "PROVISIONING",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });

      const request = new Request(
        "https://example.com/api/tenants/test-team/verify",
        {
          method: "POST",
        }
      );
      (request as any).params = { id: "test-team" };

      const response = await postVerifyHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("unknown_tenant");
    });

    it("requires tenant ID in params", async () => {
      const request = new Request(
        "https://example.com/api/tenants//verify",
        {
          method: "POST",
        }
      );
      (request as any).params = { id: "" };

      const response = await postVerifyHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("missing_tenant_id");
    });

    it("handles verification failure", async () => {
      vi.mocked(tenantService.getTenant).mockResolvedValue({
        tenantId: "test-team",
        teamName: "Test Team",
        primary: "#FF0000",
        secondary: "#0000FF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "test@example.com",
        spreadsheetId: "spreadsheet-123",
        status: "PROVISIONING",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });
      vi.mocked(tenantService.putTenant).mockImplementation(
        async (env, tenant) => tenant
      );
      vi.mocked(gasService.gasCall).mockResolvedValue({
        ok: false,
        report: { status: "invalid", errors: ["Missing required columns"] },
      });

      const request = new Request(
        "https://example.com/api/tenants/test-team/verify",
        {
          method: "POST",
        }
      );
      (request as any).params = { id: "test-team" };

      const response = await postVerifyHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.ok).toBe(false);
      expect(data.report.errors).toContain("Missing required columns");

      // Verify tenant was updated to ERROR status
      expect(tenantService.putTenant).toHaveBeenCalledWith(
        mockEnv,
        expect.objectContaining({
          status: "ERROR",
        })
      );
    });

    it("handles gasCall exception during verification", async () => {
      vi.mocked(tenantService.getTenant).mockResolvedValue({
        tenantId: "test-team",
        teamName: "Test Team",
        primary: "#FF0000",
        secondary: "#0000FF",
        badgeUrl: "https://example.com/badge.png",
        contactEmail: "test@example.com",
        spreadsheetId: "spreadsheet-123",
        status: "PROVISIONING",
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      });
      vi.mocked(tenantService.putTenant).mockImplementation(
        async (env, tenant) => tenant
      );
      vi.mocked(gasService.gasCall).mockRejectedValue(
        new Error("Network timeout")
      );

      const request = new Request(
        "https://example.com/api/tenants/test-team/verify",
        {
          method: "POST",
        }
      );
      (request as any).params = { id: "test-team" };

      const response = await postVerifyHandler(request, mockEnv, corsHdrs);

      expect(response.status).toBe(502);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.ok).toBe(false);
      expect(data.error).toBe("Network timeout");

      // Verify tenant was updated to ERROR status
      expect(tenantService.putTenant).toHaveBeenCalledWith(
        mockEnv,
        expect.objectContaining({
          status: "ERROR",
          validatorReport: { error: "Network timeout" },
        })
      );
    });
  });
});
