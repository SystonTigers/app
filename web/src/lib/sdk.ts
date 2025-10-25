// lib/sdk.ts
// SDK singleton for server and client components

import { TeamPlatformSDK } from '@team-platform/sdk';

// Server-side SDK instance (cached)
let serverSDK: TeamPlatformSDK | null = null;

/**
 * Get SDK instance for server components
 * Safe to cache as it doesn't hold tenant-specific state
 */
export function getServerSDK(tenantId: string): TeamPlatformSDK {
  if (!serverSDK) {
    serverSDK = new TeamPlatformSDK({
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8787',
      tenantId,
    });
  } else {
    serverSDK.setTenant(tenantId);
  }
  return serverSDK;
}

/**
 * Create SDK instance for client components
 * Each instance should be scoped to component lifecycle
 */
export function createClientSDK(tenantId: string): TeamPlatformSDK {
  return new TeamPlatformSDK({
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8787',
    tenantId,
  });
}
