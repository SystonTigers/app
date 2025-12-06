import { describe, it, expect, beforeEach } from "vitest";
import {
  validateSecrets,
  validateBindings,
  validateDeployment,
  createStartupValidation,
  handleHealthCheck,
  REQUIRED_SECRETS_PRODUCTION,
  REQUIRED_BINDINGS,
} from "../deploymentValidation";

describe("Deployment Validation", () => {
  let validProductionEnv: any;

  beforeEach(() => {
    // Create a valid production environment
    validProductionEnv = {
      ENVIRONMENT: "production",
      JWT_SECRET: "this-is-a-very-secure-secret-key-at-least-32-chars",
      SENTRY_DSN: "https://sentry.example.com/123",
      RESEND_API_KEY: "re_abc123",
      DB: {},
      KV_IDEMP: {},
      TENANTS: {},
      RATE_LIMIT_KV: {},
      R2_UPLOADS: {},
    };
  });

  describe("validateSecrets", () => {
    it("passes with all required secrets", () => {
      const result = validateSecrets(validProductionEnv, "production");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails when JWT_SECRET is missing", () => {
      delete validProductionEnv.JWT_SECRET;
      const result = validateSecrets(validProductionEnv, "production");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required secret: JWT_SECRET");
    });

    it("fails when JWT_SECRET is empty", () => {
      validProductionEnv.JWT_SECRET = "";
      const result = validateSecrets(validProductionEnv, "production");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required secret: JWT_SECRET");
    });

    it("fails when JWT_SECRET is too short", () => {
      validProductionEnv.JWT_SECRET = "short";
      const result = validateSecrets(validProductionEnv, "production");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("JWT_SECRET is too short (minimum 32 characters)");
    });

    it("fails when JWT_SECRET contains placeholder value", () => {
      validProductionEnv.JWT_SECRET = "your-secret-key-here-replace-me-now";
      const result = validateSecrets(validProductionEnv, "production");

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("placeholder"))).toBe(true);
    });

    it("warns about missing recommended secrets", () => {
      delete validProductionEnv.SENTRY_DSN;
      delete validProductionEnv.RESEND_API_KEY;
      const result = validateSecrets(validProductionEnv, "production");

      expect(result.valid).toBe(true); // Still valid
      expect(result.warnings).toContain("Recommended secret not configured: SENTRY_DSN");
      expect(result.warnings).toContain("Recommended secret not configured: RESEND_API_KEY");
    });
  });

  describe("validateBindings", () => {
    it("passes with all required bindings", () => {
      const result = validateBindings(validProductionEnv);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails when DB binding is missing", () => {
      delete validProductionEnv.DB;
      const result = validateBindings(validProductionEnv);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required binding: DB");
    });

    it("fails when KV_IDEMP binding is missing", () => {
      delete validProductionEnv.KV_IDEMP;
      const result = validateBindings(validProductionEnv);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Missing required binding: KV_IDEMP");
    });

    it("warns about missing recommended bindings", () => {
      delete validProductionEnv.RATE_LIMIT_KV;
      delete validProductionEnv.R2_UPLOADS;
      const result = validateBindings(validProductionEnv);

      expect(result.valid).toBe(true); // Still valid
      expect(result.warnings).toContain("Recommended binding not configured: RATE_LIMIT_KV");
      expect(result.warnings).toContain("Recommended binding not configured: R2_UPLOADS");
    });
  });

  describe("validateDeployment", () => {
    it("skips validation in development", () => {
      const devEnv = { ENVIRONMENT: "development" };
      const result = validateDeployment(devEnv);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("skips validation in test", () => {
      const testEnv = { ENVIRONMENT: "test" };
      const result = validateDeployment(testEnv);

      expect(result.valid).toBe(true);
    });

    it("validates fully in production", () => {
      const result = validateDeployment(validProductionEnv);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("validates fully in preview", () => {
      validProductionEnv.ENVIRONMENT = "preview";
      const result = validateDeployment(validProductionEnv);

      expect(result.valid).toBe(true);
    });

    it("warns when DRY_RUN is enabled in production", () => {
      validProductionEnv.DRY_RUN = "true";
      const result = validateDeployment(validProductionEnv);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain("DRY_RUN is enabled in production");
    });

    it("collects all errors and warnings", () => {
      delete validProductionEnv.JWT_SECRET;
      delete validProductionEnv.DB;
      delete validProductionEnv.SENTRY_DSN;
      delete validProductionEnv.RATE_LIMIT_KV;

      const result = validateDeployment(validProductionEnv);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("createStartupValidation", () => {
    it("returns null for valid deployment", () => {
      const result = createStartupValidation(validProductionEnv);
      expect(result).toBeNull();
    });

    it("returns 503 response for invalid deployment", async () => {
      delete validProductionEnv.JWT_SECRET;
      const result = createStartupValidation(validProductionEnv);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(503);

      const data: any = await result?.json();
      expect(data.error.code).toBe("DEPLOYMENT_INVALID");
      expect(data.error.details.length).toBeGreaterThan(0);
    });

    it("returns null for development environment", () => {
      const devEnv = { ENVIRONMENT: "development" };
      const result = createStartupValidation(devEnv);
      expect(result).toBeNull();
    });
  });

  describe("handleHealthCheck", () => {
    it("returns healthy status for valid deployment", async () => {
      const response = await handleHealthCheck(validProductionEnv);

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(data.status).toBe("healthy");
      expect(data.checks.secrets).toBe("pass");
      expect(data.checks.bindings).toBe("pass");
    });

    it("returns unhealthy status for invalid deployment", async () => {
      delete validProductionEnv.JWT_SECRET;
      const response = await handleHealthCheck(validProductionEnv);

      expect(response.status).toBe(503);
      const data: any = await response.json();
      expect(data.status).toBe("unhealthy");
    });

    it("hides error details in production", async () => {
      validProductionEnv.ENVIRONMENT = "production";
      delete validProductionEnv.JWT_SECRET;
      const response = await handleHealthCheck(validProductionEnv);

      expect(response.status).toBe(503);
      const data: any = await response.json();
      expect(data.status).toBe("unhealthy");
      expect(data.message).toBe("Configuration error - check logs");
      expect(data.checks).toBeUndefined();
    });

    it("includes warning count in healthy response", async () => {
      delete validProductionEnv.SENTRY_DSN;
      const response = await handleHealthCheck(validProductionEnv);

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(data.status).toBe("healthy");
      expect(data.warnings).toBeGreaterThan(0);
    });
  });

  describe("Placeholder Detection", () => {
    it("detects common placeholder patterns", () => {
      const placeholders = [
        "your-secret-key",
        "my-api-key",
        "test-token",
        "example-secret",
        "placeholder-value",
        "xxx123",
        "TODO-replace-me",
        "REPLACE_ME",
        "https://example.com/api",
        "prod-ebay-client-key",
        "AIzaSyREPLACE",
      ];

      for (const placeholder of placeholders) {
        const env = {
          ...validProductionEnv,
          JWT_SECRET: placeholder,
        };
        const result = validateSecrets(env, "production");
        expect(result.errors.some(e => e.includes("placeholder") || e.includes("too short")),
          `Expected "${placeholder}" to be detected as placeholder`
        ).toBe(true);
      }
    });

    it("accepts valid secrets", () => {
      const validSecrets = [
        "a-really-secure-random-secret-key-12345678",
        "8f14e45f-ceea-367a-a714-d7c6f9a8a1b0",
        "valid_api_key_format_1234567890abcdef",
      ];

      for (const secret of validSecrets) {
        const env = {
          ...validProductionEnv,
          JWT_SECRET: secret,
        };
        const result = validateSecrets(env, "production");
        expect(result.valid, `Expected "${secret}" to be valid`).toBe(true);
      }
    });
  });
});
