// web-app/src/lib/sdk.ts
import { TeamPlatformSDK } from '@team-platform/sdk';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:8787';

// Server-side cache per tenant
const serverCache = new Map<string, TeamPlatformSDK>();

export function getSDK(tenant?: string): TeamPlatformSDK {
  if (typeof window === 'undefined') {
    // Server-side
    const key = tenant || '__no_tenant__';
    if (\!serverCache.has(key)) {
      const token = process.env.NEXT_PUBLIC_ADMIN_JWT;
      const sdk = new TeamPlatformSDK(API_BASE, { tenant, token });
      serverCache.set(key, sdk);
    }
    return serverCache.get(key)\!;
  }

  // Client-side
  const token =
    window.localStorage.getItem('admin_jwt') ||
    process.env.NEXT_PUBLIC_ADMIN_JWT ||
    undefined;

  const sdk = new TeamPlatformSDK(API_BASE, { tenant, token });
  return sdk;
}
