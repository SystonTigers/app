// src/middleware/killswitch.ts
// KV-based kill switch for signup endpoints
// Set KV flag `signup_enabled=false` to instantly disable signups

import type { Env } from '../types';

/**
 * Check if signups are enabled via KV kill switch
 * Returns true if enabled, false if disabled
 */
export async function isSignupEnabled(env: Env): Promise<boolean> {
  try {
    // Check KV flag (default: enabled if key doesn't exist)
    const flag = await env.FEATURE_FLAGS?.get('signup_enabled');

    // If flag doesn't exist, default to enabled
    if (flag === null || flag === undefined) {
      return true;
    }

    // Parse flag value (supports "true"/"false", "1"/"0", "on"/"off")
    const normalized = flag.toLowerCase().trim();
    return normalized === 'true' || normalized === '1' || normalized === 'on';
  } catch (error) {
    // If KV fails, fail open (allow signups) to avoid blocking users
    console.error('[KillSwitch] Failed to check signup_enabled flag:', error);
    return true;
  }
}

/**
 * Middleware to check kill switch before signup endpoints
 * Returns 503 Service Unavailable if signups are disabled
 */
export async function requireSignupEnabled(
  request: Request,
  env: Env,
  corsHeaders: Headers
): Promise<Response | null> {
  const enabled = await isSignupEnabled(env);

  if (!enabled) {
    console.warn('[KillSwitch] Signup attempt blocked - signups are currently disabled');

    return Response.json(
      {
        success: false,
        error: {
          code: 'SIGNUPS_DISABLED',
          message: 'Signups are temporarily disabled for maintenance. Please try again later.',
        },
      },
      {
        status: 503,
        headers: {
          ...Object.fromEntries(corsHeaders.entries()),
          'Retry-After': '3600', // Suggest retry in 1 hour
        },
      }
    );
  }

  return null; // Continue to route handler
}

/**
 * Emergency disable script:
 * wrangler kv:key put --binding=FEATURE_FLAGS signup_enabled false
 *
 * Re-enable:
 * wrangler kv:key put --binding=FEATURE_FLAGS signup_enabled true
 */
