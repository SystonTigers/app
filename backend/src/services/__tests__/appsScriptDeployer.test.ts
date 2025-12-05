import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AppsScriptDeployer,
  deployAppsScriptForTenant,
  type AppsScriptDeployment,
} from "../appsScriptDeployer";
import type { Env } from "../../types";

// Mock googleAuth module
vi.mock("../googleAuth", () => ({
  getGoogleAPIHeaders: vi.fn(async () => ({
    Authorization: "Bearer mock_token",
    "Content-Type": "application/json",
  })),
}));

// Mock log module
vi.mock("../../lib/log", () => ({
  logJSON: vi.fn(),
}));

describe("Apps Script Deployer Service", () => {
  let mockEnv: Env;
  let mockFetch: any;

  beforeEach(() => {
    mockEnv = {
      GOOGLE_SERVICE_ACCOUNT_KEY: "base64_encoded_key",
      APPS_SCRIPT_TEMPLATE_ID: "template_script_id_123",
      BACKEND_URL: "https://backend.example.com",
    } as Env;

    mockFetch = vi.fn();
    global.fetch = mockFetch;

    vi.clearAllMocks();
  });

  describe("AppsScriptDeployer class", () => {
    describe("deployForTenant", () => {
      it("should successfully deploy script for tenant", async () => {
        // Mock all API calls in sequence
        mockFetch
          // Get template content
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              files: [
                { name: "Code", type: "SERVER_JS", source: "function main() {}" },
                {
                  name: "config",
                  type: "SERVER_JS",
                  source: "const TENANT_ID: 'PLACEHOLDER';",
                },
              ],
            }),
          })
          // Create project
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ scriptId: "new_script_id_456" }),
          })
          // Update content (copy template)
          .mockResolvedValueOnce({ ok: true })
          // Get content for config
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              files: [
                {
                  name: "config",
                  type: "SERVER_JS",
                  source: "const TENANT_ID: 'PLACEHOLDER';",
                },
              ],
            }),
          })
          // Update content (configure)
          .mockResolvedValueOnce({ ok: true })
          // Execute function
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
          })
          // Create version
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ versionNumber: 1 }),
          })
          // Deploy as web app
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ deploymentId: "deployment_xyz" }),
          });

        const deployer = new AppsScriptDeployer(mockEnv);
        const result = await deployer.deployForTenant(
          "demo",
          "Demo FC",
          "jwt_token_abc",
          "https://backend.example.com"
        );

        expect(result.success).toBe(true);
        expect(result.scriptId).toBe("new_script_id_456");
        expect(result.scriptUrl).toBe(
          "https://script.google.com/d/new_script_id_456/edit"
        );
        expect(result.webAppUrl).toBe(
          "https://script.google.com/macros/s/deployment_xyz/exec"
        );
      });

      it("should return error on deployment failure", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => "Permission denied",
        });

        const deployer = new AppsScriptDeployer(mockEnv);
        const result = await deployer.deployForTenant(
          "demo",
          "Demo FC",
          "jwt_token",
          "https://backend.example.com"
        );

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.scriptId).toBeUndefined();
      });

      it("should handle missing GOOGLE_SERVICE_ACCOUNT_KEY", async () => {
        const envWithoutKey = { ...mockEnv };
        delete (envWithoutKey as any).GOOGLE_SERVICE_ACCOUNT_KEY;

        const deployer = new AppsScriptDeployer(envWithoutKey);
        const result = await deployer.deployForTenant(
          "demo",
          "Demo FC",
          "jwt_token",
          "https://backend.example.com"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("GOOGLE_SERVICE_ACCOUNT_KEY");
      });

      it("should handle missing APPS_SCRIPT_TEMPLATE_ID", async () => {
        const envWithoutTemplate = { ...mockEnv };
        delete (envWithoutTemplate as any).APPS_SCRIPT_TEMPLATE_ID;

        // Mock authentication
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ files: [] }),
        });

        const deployer = new AppsScriptDeployer(envWithoutTemplate);
        const result = await deployer.deployForTenant(
          "demo",
          "Demo FC",
          "jwt_token",
          "https://backend.example.com"
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("APPS_SCRIPT_TEMPLATE_ID");
      });
    });

    describe("createProjectFromTemplate", () => {
      it("should create project with correct title", async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              files: [{ name: "Code", type: "SERVER_JS", source: "" }],
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ scriptId: "new_id" }),
          })
          .mockResolvedValueOnce({ ok: true });

        const deployer = new AppsScriptDeployer(mockEnv);
        await (deployer as any).authenticate();
        await (deployer as any).createProjectFromTemplate("demo", "Demo FC");

        const createProjectCall = mockFetch.mock.calls.find((call: any) =>
          call[0].includes("/v1/projects") && call[1]?.method === "POST"
        );

        const body = JSON.parse(createProjectCall[1].body);
        expect(body.title).toBe("Demo FC - Football Automation");
      });

      it("should throw error on project creation failure", async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ files: [] }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 400,
            text: async () => "Bad request",
          });

        const deployer = new AppsScriptDeployer(mockEnv);
        await (deployer as any).authenticate();

        await expect(
          (deployer as any).createProjectFromTemplate("demo", "Demo FC")
        ).rejects.toThrow("Failed to create project");
      });
    });

    describe("configureScript", () => {
      it("should inject tenant configuration", async () => {
        const mockContent = {
          files: [
            {
              name: "config",
              type: "SERVER_JS",
              source: "const TENANT_ID: 'PLACEHOLDER';\nconst API_URL: 'https://old.url';",
            },
          ],
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockContent,
          })
          .mockResolvedValueOnce({ ok: true })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
          });

        const deployer = new AppsScriptDeployer(mockEnv);
        await (deployer as any).authenticate();
        await (deployer as any).configureScript(
          "script_123",
          "demo",
          "jwt_abc",
          "https://backend.example.com"
        );

        const updateCall = mockFetch.mock.calls.find((call: any) =>
          call[0].includes("/content") && call[1]?.method === "PUT"
        );

        const body = JSON.parse(updateCall[1].body);
        const configFile = body.files.find((f: any) => f.name === "config");

        expect(configFile.source).toContain("TENANT_ID: 'demo'");
        expect(configFile.source).toContain("API_URL: 'https://backend.example.com'");
      });

      it("should add auto-init file", async () => {
        const mockContent = {
          files: [
            { name: "Code", type: "SERVER_JS", source: "function main() {}" },
          ],
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockContent,
          })
          .mockResolvedValueOnce({ ok: true })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
          });

        const deployer = new AppsScriptDeployer(mockEnv);
        await (deployer as any).authenticate();
        await (deployer as any).configureScript(
          "script_123",
          "demo",
          "jwt_abc",
          "https://backend.example.com"
        );

        const updateCall = mockFetch.mock.calls.find((call: any) =>
          call[0].includes("/content") && call[1]?.method === "PUT"
        );

        const body = JSON.parse(updateCall[1].body);
        const autoInitFile = body.files.find((f: any) => f.name === "auto_init");

        expect(autoInitFile).toBeDefined();
        expect(autoInitFile.type).toBe("SERVER_JS");
        expect(autoInitFile.source).toContain("_autoInitTenant");
        expect(autoInitFile.source).toContain("demo");
      });
    });

    describe("createVersion", () => {
      it("should create version and return version number", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ versionNumber: 5 }),
        });

        const deployer = new AppsScriptDeployer(mockEnv);
        await (deployer as any).authenticate();
        const version = await (deployer as any).createVersion("script_123");

        expect(version).toBe(5);
        expect(mockFetch).toHaveBeenCalledWith(
          "https://script.googleapis.com/v1/projects/script_123/versions",
          expect.objectContaining({ method: "POST" })
        );
      });

      it("should throw error on version creation failure", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => "Invalid project",
        });

        const deployer = new AppsScriptDeployer(mockEnv);
        await (deployer as any).authenticate();

        await expect(
          (deployer as any).createVersion("invalid_script")
        ).rejects.toThrow("Failed to create version");
      });
    });

    describe("deployAsWebApp", () => {
      it("should deploy and return web app URL", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ deploymentId: "AKfycby123xyz" }),
        });

        const deployer = new AppsScriptDeployer(mockEnv);
        await (deployer as any).authenticate();
        const url = await (deployer as any).deployAsWebApp("script_123", 1);

        expect(url).toBe("https://script.google.com/macros/s/AKfycby123xyz/exec");
        expect(mockFetch).toHaveBeenCalledWith(
          "https://script.googleapis.com/v1/projects/script_123/deployments",
          expect.objectContaining({ method: "POST" })
        );
      });

      it("should include version number in deployment", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ deploymentId: "deploy_abc" }),
        });

        const deployer = new AppsScriptDeployer(mockEnv);
        await (deployer as any).authenticate();
        await (deployer as any).deployAsWebApp("script_123", 3);

        const deployCall = mockFetch.mock.calls[0];
        const body = JSON.parse(deployCall[1].body);

        expect(body.versionNumber).toBe(3);
      });

      it("should throw error on deployment failure", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: async () => "Permission denied",
        });

        const deployer = new AppsScriptDeployer(mockEnv);
        await (deployer as any).authenticate();

        await expect(
          (deployer as any).deployAsWebApp("script_123", 1)
        ).rejects.toThrow("Failed to deploy");
      });
    });

    describe("executeFunction", () => {
      it("should execute function successfully", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: "success" }),
        });

        const deployer = new AppsScriptDeployer(mockEnv);
        await (deployer as any).authenticate();
        const result = await (deployer as any).executeFunction(
          "script_123",
          "_autoInitTenant"
        );

        expect(result.result).toBe("success");
        expect(mockFetch).toHaveBeenCalledWith(
          "https://script.googleapis.com/v1/scripts/script_123:run",
          expect.objectContaining({ method: "POST" })
        );
      });

      it("should not throw on function execution failure", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => "Function error",
        });

        const deployer = new AppsScriptDeployer(mockEnv);
        await (deployer as any).authenticate();

        // Should not throw - just log warning
        await expect(
          (deployer as any).executeFunction("script_123", "_autoInitTenant")
        ).resolves.not.toThrow();
      });
    });
  });

  describe("deployAppsScriptForTenant", () => {
    it("should deploy script with default backend URL", async () => {
      const envWithoutBackendUrl = { ...mockEnv };
      delete (envWithoutBackendUrl as any).BACKEND_URL;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ files: [{ name: "Code", type: "SERVER_JS", source: "" }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ scriptId: "new_script" }),
        })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ files: [] }),
        })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ versionNumber: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ deploymentId: "deploy_id" }),
        });

      const result = await deployAppsScriptForTenant(
        envWithoutBackendUrl,
        "demo",
        "Demo FC",
        "jwt_token"
      );

      expect(result.success).toBe(true);
    });

    it("should use provided backend URL", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ files: [{ name: "Code", type: "SERVER_JS", source: "" }] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ scriptId: "new_script" }),
        })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ files: [] }),
        })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ versionNumber: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ deploymentId: "deploy_id" }),
        });

      const result = await deployAppsScriptForTenant(
        mockEnv,
        "demo",
        "Demo FC",
        "jwt_token"
      );

      expect(result.success).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long tenant names", async () => {
      const longName = "A".repeat(200);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ files: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ scriptId: "new_script" }),
        })
        .mockResolvedValueOnce({ ok: true });

      const deployer = new AppsScriptDeployer(mockEnv);
      await (deployer as any).authenticate();
      const scriptId = await (deployer as any).createProjectFromTemplate(
        "demo",
        longName
      );

      expect(scriptId).toBe("new_script");
    });

    it("should handle special characters in tenant data", async () => {
      const mockContent = {
        files: [
          {
            name: "config",
            type: "SERVER_JS",
            source: "const TENANT_ID: 'PLACEHOLDER';",
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockContent,
        })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const deployer = new AppsScriptDeployer(mockEnv);
      await (deployer as any).authenticate();

      // Should not throw with special characters
      await expect(
        (deployer as any).configureScript(
          "script_123",
          "demo-tenant_123",
          "jwt_with_special.chars+abc",
          "https://backend.example.com/api/v1"
        )
      ).resolves.not.toThrow();
    });
  });
});
