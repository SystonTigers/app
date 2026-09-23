// lib/sdk.ts
// SDK helpers for server and client components

import { TeamPlatformSDK } from '@team-platform/sdk';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8787';

/**
 * Get an SDK instance scoped to a specific tenant for server components.
 *
 * IMPORTANT: Do NOT cache this as a module-level singleton. Next.js server
 * components can run concurrently, so a mutable shared instance would leak
 * tenant state between requests. A fresh instance is cheap to create.
 */
export function getServerSDK(tenantId: string): TeamPlatformSDK {
  return new TeamPlatformSDK({
    apiBaseUrl: API_BASE_URL,
    tenantId,
  });
}

/**
 * Create an SDK instance for client components.
 * Each instance should be scoped to the component lifecycle.
 */
export function createClientSDK(tenantId: string): TeamPlatformSDK {
  return new TeamPlatformSDK({
    apiBaseUrl: API_BASE_URL,
    tenantId,
  });
}
