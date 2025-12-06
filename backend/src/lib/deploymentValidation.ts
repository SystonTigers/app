// Deployment Validation
// Validates that required configuration is present before allowing requests

import { logJSON } from "./log";

/**
 * Required secrets for production deployment
 */
export const REQUIRED_SECRETS_PRODUCTION = [
  "JWT_SECRET",
] as const;

/**
 * Recommended secrets (warning if missing)
 */
export const RECOMMENDED_SECRETS = [
  "SENTRY_DSN",
  "RESEND_API_KEY",
] as const;

/**
 * Required bindings for production
 */
export const REQUIRED_BINDINGS = [
  "DB",           // D1 database
  "KV_IDEMP",     // KV for idempotency
  "TENANTS",      // KV for tenant config
] as const;

/**
 * Required bindings for full functionality
 */
export const RECOMMENDED_BINDINGS = [
  "RATE_LIMIT_KV", // KV for rate limiting
  "R2_UPLOADS",    // R2 for file uploads
] as const;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that required secrets are configured
 */
export function validateSecrets(env: any, environment: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required secrets
  for (const secret of REQUIRED_SECRETS_PRODUCTION) {
    const value = env[secret];
    if (!value || value === "") {
      errors.push(`Missing required secret: ${secret}`);
    } else if (isPlaceholderValue(value)) {
      errors.push(`Secret ${secret} contains placeholder value - set via wrangler secret put`);
    } else if (secret === "JWT_SECRET" && value.length < 32) {
      errors.push(`JWT_SECRET is too short (minimum 32 characters)`);
    }
  }

  // Check recommended secrets
  for (const secret of RECOMMENDED_SECRETS) {
    const value = env[secret];
    if (!value || value === "" || isPlaceholderValue(value)) {
      warnings.push(`Recommended secret not configured: ${secret}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates that required bindings are configured
 */
export function validateBindings(env: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required bindings
  for (const binding of REQUIRED_BINDINGS) {
    if (!env[binding]) {
      errors.push(`Missing required binding: ${binding}`);
    }
  }

  // Check recommended bindings
  for (const binding of RECOMMENDED_BINDINGS) {
    if (!env[binding]) {
      warnings.push(`Recommended binding not configured: ${binding}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Full deployment validation
 */
export function validateDeployment(env: any): ValidationResult {
  const environment = env.ENVIRONMENT || "development";
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Skip validation in development/test
  if (environment === "development" || environment === "test") {
    logJSON({
      level: "debug",
      msg: "deployment_validation_skipped",
      environment,
      reason: "non-production environment"
    });
    return { valid: true, errors: [], warnings: [] };
  }

  // Validate secrets
  const secretsResult = validateSecrets(env, environment);
  allErrors.push(...secretsResult.errors);
  allWarnings.push(...secretsResult.warnings);

  // Validate bindings
  const bindingsResult = validateBindings(env);
  allErrors.push(...bindingsResult.errors);
  allWarnings.push(...bindingsResult.warnings);

  // Environment-specific checks
  if (environment === "production") {
    // Ensure DRY_RUN is not enabled in production
    if (env.DRY_RUN === "true") {
      allWarnings.push("DRY_RUN is enabled in production");
    }

    // Ensure environment is explicitly set
    if (!env.ENVIRONMENT) {
      allWarnings.push("ENVIRONMENT not explicitly set");
    }
  }

  // Log validation result
  if (allErrors.length > 0) {
    logJSON({
      level: "error",
      msg: "deployment_validation_failed",
      environment,
      errors: allErrors,
      warnings: allWarnings,
      alert: true
    });
  } else if (allWarnings.length > 0) {
    logJSON({
      level: "warn",
      msg: "deployment_validation_warnings",
      environment,
      warnings: allWarnings
    });
  } else {
    logJSON({
      level: "info",
      msg: "deployment_validation_passed",
      environment
    });
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Check if a value looks like a placeholder
 */
function isPlaceholderValue(value: string): boolean {
  const placeholderPatterns = [
    /^(your-|my-|test-|example-|placeholder-|xxx|TODO)/i,
    /REPLACE/i,
    /example\.com/i,
    /^(prod-|preview-|dev-)[a-z-]+-key$/i,
    /^AIzaSy[A-Z]+$/i, // Placeholder Google API key pattern
  ];

  return placeholderPatterns.some(pattern => pattern.test(value));
}

/**
 * Creates a startup validation middleware
 * Returns an error response if deployment is invalid
 */
export function createStartupValidation(env: any): Response | null {
  const result = validateDeployment(env);

  if (!result.valid) {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: "DEPLOYMENT_INVALID",
        message: "Worker deployment is misconfigured",
        details: result.errors
      }
    }), {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "60"
      }
    });
  }

  return null;
}

/**
 * Health check endpoint that includes deployment validation
 */
export async function handleHealthCheck(env: any): Promise<Response> {
  const result = validateDeployment(env);
  const environment = env.ENVIRONMENT || "development";

  const health = {
    status: result.valid ? "healthy" : "unhealthy",
    environment,
    timestamp: new Date().toISOString(),
    checks: {
      secrets: result.errors.filter(e => e.includes("secret")).length === 0 ? "pass" : "fail",
      bindings: result.errors.filter(e => e.includes("binding")).length === 0 ? "pass" : "fail",
      configuration: result.errors.length === 0 ? "pass" : "fail",
    },
    warnings: result.warnings.length,
  };

  // Don't expose error details in production
  if (environment === "production" && !result.valid) {
    return new Response(JSON.stringify({
      status: "unhealthy",
      message: "Configuration error - check logs"
    }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify(health), {
    status: result.valid ? 200 : 503,
    headers: { "Content-Type": "application/json" }
  });
}
