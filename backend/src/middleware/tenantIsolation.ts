// Tenant Isolation Middleware
// Ensures all requests are properly scoped to the authenticated tenant

import { getTenantConfig } from "../services/tenantConfig";
import type { Claims } from "../services/jwt";

/**
 * Validates that a tenant exists in the database
 * Returns null if tenant doesn't exist (fail closed)
 */
export async function validateTenantExists(env: any, tenantId: string): Promise<boolean> {
  if (!tenantId) {
    return false;
  }

  // Check KV for tenant config
  const kvConfig = await getTenantConfig(env, tenantId);
  if (kvConfig) {
    return true;
  }

  // Also check D1 database for tenant record
  try {
    const row = await env.DB.prepare("SELECT id FROM tenants WHERE id = ? LIMIT 1")
      .bind(tenantId)
      .first();
    return !!row;
  } catch {
    return false;
  }
}

/**
 * Extracts tenant_id from request (query param, body, or JWT claims)
 * Returns null if no tenant_id found
 */
export function extractTenantId(req: Request, claims?: Claims | null): string | null {
  // Priority 1: JWT claims (most authoritative)
  if (claims?.tenantId) {
    return claims.tenantId;
  }

  // Priority 2: Query parameter
  const url = new URL(req.url);
  const queryTenant = url.searchParams.get("tenant") || url.searchParams.get("tenant_id");
  if (queryTenant) {
    return queryTenant;
  }

  return null;
}

/**
 * Validates that the authenticated user can access the requested tenant
 * Returns a Response error if access is denied, null if access is allowed
 */
export async function validateTenantAccess(
  env: any,
  claims: Claims | null,
  requestedTenantId: string
): Promise<Response | null> {
  // Must be authenticated
  if (!claims) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" }
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Platform admins can access any tenant
  if (claims.roles?.includes("platform_admin")) {
    return null;
  }

  // Regular users can only access their own tenant
  if (claims.tenantId !== requestedTenantId) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: "FORBIDDEN", message: "Access denied to this tenant" }
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Validate tenant exists
  const tenantExists = await validateTenantExists(env, requestedTenantId);
  if (!tenantExists) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: "TENANT_NOT_FOUND", message: "Tenant not found" }
    }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  return null; // Access allowed
}

/**
 * Creates a tenant-scoped SQL query condition
 * Use this to ensure all queries are properly filtered by tenant
 */
export function tenantScopeCondition(tenantId: string): string {
  // Validate tenant_id format to prevent SQL injection
  if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    throw new Error("Invalid tenant_id format");
  }
  return `tenant_id = '${tenantId}'`;
}

/**
 * Validates that a tenant_id in request body matches JWT claims
 * Returns error response if mismatch, null if valid
 */
export function validateBodyTenantId(
  claims: Claims,
  bodyTenantId: string | undefined
): Response | null {
  // If body specifies tenant_id, it must match JWT
  if (bodyTenantId && bodyTenantId !== claims.tenantId) {
    // Platform admins can override
    if (claims.roles?.includes("platform_admin")) {
      return null;
    }

    return new Response(JSON.stringify({
      success: false,
      error: { code: "TENANT_MISMATCH", message: "Tenant ID mismatch" }
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  return null;
}
