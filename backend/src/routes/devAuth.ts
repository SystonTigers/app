// backend/src/routes/devAuth.ts
// Development-only authentication endpoints for local testing

import type { Env } from '../types';
import { json } from '../lib/validate';
import { SignJWT } from 'jose';

/**
 * DEV ONLY: Generate admin JWT for testing
 * POST /dev/auth/admin-jwt
 * Body: { tenantId: string, email?: string }
 *
 * SECURITY: This endpoint is ONLY available when ENVIRONMENT=development
 */
export async function handleDevAdminJWT(req: Request, env: Env): Promise<Response> {
  // CRITICAL: Only allow in development environment
  if (env.ENVIRONMENT !== 'development') {
    return json({
      success: false,
      error: 'This endpoint is only available in development mode'
    }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const tenantId = (body.tenantId || 'test-tenant').toString().trim();
  const email = (body.email || 'dev@localhost').toString().trim();

  // Generate admin JWT (7 day expiry)
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    roles: ['owner', 'admin'],
    tenantId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(env.JWT_ISSUER || 'syston.app')
    .setAudience('syston-admin')
    .setSubject(email)
    .setIssuedAt(now)
    .setExpirationTime(now + 7 * 24 * 3600)
    .sign(new TextEncoder().encode(env.JWT_SECRET));

  console.log('[DEV] Generated admin JWT for:', { tenantId, email });

  return json({
    success: true,
    token,
    tenantId,
    email,
    expiresIn: '7 days',
    warning: 'DEV MODE ONLY - Do not use in production',
  });
}

/**
 * DEV ONLY: Generate magic link for testing
 * POST /dev/auth/magic-link
 * Body: { tenantId: string, email: string }
 */
export async function handleDevMagicLink(req: Request, env: Env): Promise<Response> {
  // CRITICAL: Only allow in development environment
  if (env.ENVIRONMENT !== 'development') {
    return json({
      success: false,
      error: 'This endpoint is only available in development mode'
    }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const tenantId = (body.tenantId || 'test-tenant').toString().trim();
  const email = (body.email || 'dev@localhost').toString().trim();

  // Generate magic link token (24h expiry)
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    type: 'magic_link',
    roles: ['owner', 'admin'],
    tenantId,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(env.JWT_ISSUER || 'syston.app')
    .setAudience('syston-admin')
    .setSubject(email)
    .setIssuedAt(now)
    .setExpirationTime(now + 24 * 3600)
    .sign(new TextEncoder().encode(env.JWT_SECRET));

  const link = `${env.ADMIN_CONSOLE_URL}/admin/onboard?token=${token}`;

  console.log('[DEV] Generated magic link for:', { tenantId, email, link });

  return json({
    success: true,
    magicLink: link,
    token,
    tenantId,
    email,
    expiresIn: '24 hours',
    warning: 'DEV MODE ONLY - Do not use in production',
  });
}

/**
 * DEV ONLY: Get current environment info
 * GET /dev/info
 */
export async function handleDevInfo(req: Request, env: Env): Promise<Response> {
  return json({
    environment: env.ENVIRONMENT || 'unknown',
    isDevelopment: env.ENVIRONMENT === 'development',
    backendUrl: env.BACKEND_URL || 'not set',
    adminConsoleUrl: env.ADMIN_CONSOLE_URL || 'not set',
    jwtIssuer: env.JWT_ISSUER || 'not set',
    devEndpointsEnabled: env.ENVIRONMENT === 'development',
  });
}
