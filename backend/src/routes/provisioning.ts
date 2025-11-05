/**
 * Provisioning Routes
 *
 * Internal endpoints for tenant provisioning and status tracking
 */

import type { Env } from '../types';
import { verifyServiceJWT, generateServiceJWT } from '../services/jwt';
import { retryWithBackoff } from '../lib/retry';
import { requireTenantAdminOrPlatform } from '../services/auth';

/**
 * POST /internal/provision/queue
 * Queue provisioning for a tenant (called after signup)
 * Requires service JWT authorization
 */
export async function handleProvisionQueue(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Verify service JWT (internal only)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Service authorization required' },
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const isValid = await verifyServiceJWT(env, token);

    if (!isValid) {
      return Response.json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid service token' },
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json<{ tenantId: string }>();

    if (!body.tenantId) {
      return Response.json({
        success: false,
        error: { code: 'MISSING_TENANT_ID', message: 'Tenant ID is required' },
      }, { status: 400 });
    }

    // Get tenant info
    const tenant = await env.DB.prepare(
      `SELECT id, plan FROM tenants WHERE id = ?`
    ).bind(body.tenantId).first<{ id: string; plan: string }>();

    if (!tenant) {
      return Response.json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' },
      }, { status: 404 });
    }

    // Get Provisioner Durable Object for this tenant
    const provisionerId = env.PROVISIONER.idFromName(tenant.id);
    const provisioner = env.PROVISIONER.get(provisionerId);

    // Queue and run provisioning with retry logic (handles transient DO failures)
    const retryResult = await retryWithBackoff(
      async () => {
        // Queue provisioning
        await provisioner.fetch(new Request('https://provisioner/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: tenant.id,
            plan: tenant.plan,
          }),
        }));

        // Trigger run
        const response = await provisioner.fetch(new Request('https://provisioner/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId: tenant.id,
            plan: tenant.plan,
          }),
        }));

        const result = await response.json<{
          success: boolean;
          message: string;
          state?: unknown;
        }>();

        if (!result.success) {
          throw new Error(result.message || 'Provisioning failed');
        }

        return result;
      },
      {
        maxAttempts: 3,
        initialDelayMs: 2000,
        maxDelayMs: 10000,
        retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE'],
      }
    );

    if (!retryResult.success) {
      console.error(`[Provision Queue] Failed after ${retryResult.attempts} attempts:`, retryResult.error);
      return Response.json({
        success: false,
        error: {
          code: 'PROVISIONING_FAILED',
          message: retryResult.error || 'Provisioning failed after retries',
          attempts: retryResult.attempts,
        },
      }, { status: 500 });
    }

    console.log(`[Provision Queue] Succeeded after ${retryResult.attempts} attempts (${retryResult.totalDuration}ms)`);
    return Response.json(retryResult.data);
  } catch (error) {
    console.error('[Provision Queue] Error:', error);
    return Response.json({
      success: false,
      error: {
        code: 'QUEUE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/tenants/:id/provision-status
 * Get provisioning status for a tenant
 * Requires owner session or admin JWT
 */
export async function handleProvisionStatus(
  request: Request,
  env: Env,
  tenantId: string
): Promise<Response> {
  try {
    // Allow either tenant/platform admin OR service JWT (for internal provisioning system)
    const authHeader = request.headers.get('authorization');
    let isServiceAuth = false;

    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (token) {
        // Check if it's a service JWT
        const isService = await verifyServiceJWT(env, token);
        if (isService) {
          isServiceAuth = true;
        }
      }
    }

    // If not service JWT, require tenant/platform admin
    if (!isServiceAuth) {
      await requireTenantAdminOrPlatform(request, env, tenantId);
    }

    // Get tenant provision state from DB
    const tenant = await env.DB.prepare(
      `SELECT id, plan, status, provisioned_at, provision_state, provision_reason, provision_updated_at
       FROM tenants WHERE id = ?`
    ).bind(tenantId).first<{
      id: string;
      plan: string;
      status: string;
      provisioned_at: number | null;
      provision_state: string | null;
      provision_reason: string | null;
      provision_updated_at: string | null;
    }>();

    if (!tenant) {
      return Response.json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' },
      }, { status: 404 });
    }

    // Return provision state from DB (set by Provisioner DO)
    return Response.json({
      success: true,
      data: {
        status: tenant.provision_state || 'pending',
        step: null, // Kept for backward compatibility
        checkpoints: {}, // Kept for backward compatibility
        reason: tenant.provision_reason,
        updatedAt: tenant.provision_updated_at,
      },
    });
  } catch (error) {
    console.error('[Provision Status] Error:', error);
    return Response.json({
      success: false,
      error: {
        code: 'STATUS_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    }, { status: 500 });
  }
}

/**
 * GET /api/v1/tenants/:id/overview
 * Get admin overview stats for a tenant
 * Requires owner session or admin JWT
 */
export async function handleTenantOverview(
  request: Request,
  env: Env,
  tenantId: string
): Promise<Response> {
  try {
    await requireTenantAdminOrPlatform(request, env, tenantId);

    // Overview for a single tenant (fixes tenant_id reference)
    // Note: fixtures table is legacy single-tenant, so excluded from counts
    const row = await env.DB.prepare(
      `
      SELECT
        t.id,
        t.slug,
        t.name,
        t.plan,
        t.status,
        t.route_ready,
        t.provisioned_at,
        -- counts (feed_posts has tenant_id)
        (SELECT COUNT(*) FROM feed_posts p WHERE p.tenant_id = t.id)         AS posts_count,
        -- webhook validation (starter)
        (SELECT COUNT(*)
           FROM make_connections mc
          WHERE mc.tenant_id = t.id
            AND mc.validated_at IS NOT NULL
        ) AS webhooks_validated
      FROM tenants t
      WHERE t.id = ?
      `
    ).bind(tenantId).first();

    return Response.json({
      success: true,
      data: row || null,
    });
  } catch (error) {
    // Re-throw Response errors (like 401/403 from auth checks)
    if (error instanceof Response) {
      return error;
    }
    console.error('[Tenant Overview] Error:', error);
    return Response.json({
      success: false,
      error: {
        code: 'OVERVIEW_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    }, { status: 500 });
  }
}

/**
 * POST /internal/provision/retry
 * Retry failed provisioning steps
 * Requires service JWT authorization
 */
export async function handleProvisionRetry(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    // Verify service JWT
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Service authorization required' },
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const isValid = await verifyServiceJWT(env, token);

    if (!isValid) {
      return Response.json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid service token' },
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json<{ tenantId: string }>();

    if (!body.tenantId) {
      return Response.json({
        success: false,
        error: { code: 'MISSING_TENANT_ID', message: 'Tenant ID is required' },
      }, { status: 400 });
    }

    // Get tenant info
    const tenant = await env.DB.prepare(
      `SELECT id, plan FROM tenants WHERE id = ?`
    ).bind(body.tenantId).first<{ id: string; plan: string }>();

    if (!tenant) {
      return Response.json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' },
      }, { status: 404 });
    }

    // Get Provisioner Durable Object
    const provisionerId = env.PROVISIONER.idFromName(tenant.id);
    const provisioner = env.PROVISIONER.get(provisionerId);

    // Retry provisioning
    await provisioner.fetch(new Request('https://provisioner/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: tenant.id,
        plan: tenant.plan,
      }),
    }));

    // Trigger run
    const response = await provisioner.fetch(new Request('https://provisioner/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: tenant.id,
        plan: tenant.plan,
      }),
    }));

    const result = await response.json<{
      success: boolean;
      message: string;
      state?: unknown;
    }>();

    return Response.json(result);
  } catch (error) {
    console.error('[Provision Retry] Error:', error);
    return Response.json({
      success: false,
      error: {
        code: 'RETRY_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    }, { status: 500 });
  }
}
