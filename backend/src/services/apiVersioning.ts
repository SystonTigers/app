/**
 * API Versioning Service
 * Implements version management, deprecation warnings, and migration paths
 *
 * Versioning Strategy:
 * - URL-based versioning: /api/v1/*, /api/v2/*
 * - Header-based versioning: Accept: application/vnd.api+json;version=1
 * - Graceful deprecation with warnings
 * - Sunset headers for deprecated versions
 *
 * Best Practices:
 * - Never break existing versions
 * - Provide migration guide for each version
 * - Give 6+ months notice before sunset
 * - Support at least 2 versions simultaneously
 */

import { logJSON } from '../lib/log';

/**
 * API Version definition
 */
export interface APIVersion {
  version: string;           // e.g., "1", "2"
  status: 'active' | 'deprecated' | 'sunset';
  releaseDate: string;       // ISO date
  deprecationDate?: string;  // ISO date when deprecated
  sunsetDate?: string;       // ISO date when removed
  changelog: string;         // URL to changelog
  migrationGuide?: string;   // URL to migration guide
}

/**
 * Current API versions
 */
export const API_VERSIONS: Record<string, APIVersion> = {
  'v1': {
    version: '1',
    status: 'active',
    releaseDate: '2025-01-01',
    changelog: '/docs/api/v1/changelog',
  },
  'v2': {
    version: '2',
    status: 'active',
    releaseDate: '2025-06-01',
    changelog: '/docs/api/v2/changelog',
    migrationGuide: '/docs/api/v1-to-v2-migration',
  },
};

/**
 * Current default/latest version
 */
export const CURRENT_VERSION = 'v1';
export const LATEST_VERSION = 'v2';

/**
 * Extract API version from request
 * Checks URL path, Accept header, and X-API-Version header
 *
 * @param req - Request object
 * @returns Version string (e.g., "v1")
 */
export function extractAPIVersion(req: Request): string {
  const url = new URL(req.url);

  // 1. Check URL path: /api/v1/* or /api/v2/*
  const pathMatch = url.pathname.match(/^\/api\/(v\d+)\//);
  if (pathMatch) {
    return pathMatch[1];
  }

  // 2. Check X-API-Version header
  const versionHeader = req.headers.get('X-API-Version');
  if (versionHeader) {
    return versionHeader.startsWith('v') ? versionHeader : `v${versionHeader}`;
  }

  // 3. Check Accept header for version
  const acceptHeader = req.headers.get('Accept');
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/version=(\d+)/);
    if (versionMatch) {
      return `v${versionMatch[1]}`;
    }
  }

  // 4. Default to current version
  return CURRENT_VERSION;
}

/**
 * Validate API version is supported
 *
 * @param version - Version to validate
 * @returns true if valid and supported
 */
export function isVersionSupported(version: string): boolean {
  const versionInfo = API_VERSIONS[version];
  return versionInfo && versionInfo.status !== 'sunset';
}

/**
 * Get version information
 */
export function getVersionInfo(version: string): APIVersion | null {
  return API_VERSIONS[version] || null;
}

/**
 * Add deprecation headers to response
 * Includes Sunset header (RFC 8594) and custom deprecation warnings
 *
 * @param response - Response to add headers to
 * @param version - API version being used
 * @returns Response with deprecation headers
 */
export function addVersionHeaders(response: Response, version: string): Response {
  const versionInfo = API_VERSIONS[version];
  if (!versionInfo) {
    return response;
  }

  const headers = new Headers(response.headers);

  // Add X-API-Version header to all responses
  headers.set('X-API-Version', version);

  // Add deprecation warnings for deprecated versions
  if (versionInfo.status === 'deprecated') {
    headers.set('Deprecation', 'true');

    if (versionInfo.sunsetDate) {
      // Sunset header (RFC 8594)
      headers.set('Sunset', new Date(versionInfo.sunsetDate).toUTCString());
    }

    // Link to migration guide
    if (versionInfo.migrationGuide) {
      headers.set('Link', `<${versionInfo.migrationGuide}>; rel="migration-guide"`);
    }

    // Warning header (RFC 7234)
    const warningMessage = versionInfo.sunsetDate
      ? `API version ${version} is deprecated and will sunset on ${versionInfo.sunsetDate}`
      : `API version ${version} is deprecated`;
    headers.set('Warning', `299 - "${warningMessage}"`);
  }

  // Add Link header to changelog
  if (versionInfo.changelog) {
    const existingLink = headers.get('Link');
    const changelogLink = `<${versionInfo.changelog}>; rel="changelog"`;
    headers.set('Link', existingLink ? `${existingLink}, ${changelogLink}` : changelogLink);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Middleware to validate API version
 * Returns 400 if version is sunset, adds headers if deprecated
 *
 * @param req - Request object
 * @returns null if valid, Response with error if invalid
 */
export function validateAPIVersionMiddleware(req: Request): Response | null {
  const version = extractAPIVersion(req);
  const versionInfo = API_VERSIONS[version];

  // Version not found
  if (!versionInfo) {
    logJSON({
      level: 'warn',
      msg: 'api_version_not_found',
      version,
      path: new URL(req.url).pathname,
    });

    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'UNSUPPORTED_API_VERSION',
        message: `API version ${version} does not exist`,
        supportedVersions: Object.keys(API_VERSIONS),
        currentVersion: CURRENT_VERSION,
        latestVersion: LATEST_VERSION,
      }
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Version sunset
  if (versionInfo.status === 'sunset') {
    logJSON({
      level: 'warn',
      msg: 'api_version_sunset',
      version,
      path: new URL(req.url).pathname,
      sunsetDate: versionInfo.sunsetDate,
    });

    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'API_VERSION_SUNSET',
        message: `API version ${version} has been sunset and is no longer available`,
        sunsetDate: versionInfo.sunsetDate,
        migrationGuide: versionInfo.migrationGuide,
        currentVersion: CURRENT_VERSION,
        latestVersion: LATEST_VERSION,
      }
    }), {
      status: 410, // Gone
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Version deprecated - log warning but allow request
  if (versionInfo.status === 'deprecated') {
    logJSON({
      level: 'info',
      msg: 'api_version_deprecated_usage',
      version,
      path: new URL(req.url).pathname,
      sunsetDate: versionInfo.sunsetDate,
    });
  }

  return null; // Valid version
}

/**
 * Get API version info endpoint response
 * Use for /api/versions or /api/v1/version
 */
export function getAPIVersionsResponse(): Response {
  const versions = Object.entries(API_VERSIONS).map(([key, info]) => ({
    version: key,
    status: info.status,
    releaseDate: info.releaseDate,
    deprecationDate: info.deprecationDate,
    sunsetDate: info.sunsetDate,
    changelog: info.changelog,
    migrationGuide: info.migrationGuide,
  }));

  return new Response(JSON.stringify({
    success: true,
    data: {
      versions,
      current: CURRENT_VERSION,
      latest: LATEST_VERSION,
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    }
  });
}

/**
 * Deprecate an API version
 * Updates version status and sets sunset date
 *
 * @param version - Version to deprecate
 * @param sunsetDate - Date when version will be removed (ISO string)
 */
export function deprecateVersion(version: string, sunsetDate: string): void {
  const versionInfo = API_VERSIONS[version];
  if (!versionInfo) {
    throw new Error(`Version ${version} not found`);
  }

  versionInfo.status = 'deprecated';
  versionInfo.deprecationDate = new Date().toISOString();
  versionInfo.sunsetDate = sunsetDate;

  logJSON({
    level: 'info',
    msg: 'api_version_deprecated',
    version,
    deprecationDate: versionInfo.deprecationDate,
    sunsetDate,
  });
}

/**
 * Sunset an API version
 * Marks version as no longer available
 *
 * @param version - Version to sunset
 */
export function sunsetVersion(version: string): void {
  const versionInfo = API_VERSIONS[version];
  if (!versionInfo) {
    throw new Error(`Version ${version} not found`);
  }

  versionInfo.status = 'sunset';

  logJSON({
    level: 'info',
    msg: 'api_version_sunset_activated',
    version,
    sunsetDate: new Date().toISOString(),
  });
}

/**
 * Get deprecation report
 * Shows which versions are deprecated and when they sunset
 */
export function getDeprecationReport(): {
  deprecated: Array<{ version: string; sunsetDate: string | undefined }>;
  sunset: Array<{ version: string; sunsetDate: string | undefined }>;
  active: string[];
} {
  const deprecated: Array<{ version: string; sunsetDate: string | undefined }> = [];
  const sunset: Array<{ version: string; sunsetDate: string | undefined }> = [];
  const active: string[] = [];

  for (const [version, info] of Object.entries(API_VERSIONS)) {
    if (info.status === 'deprecated') {
      deprecated.push({ version, sunsetDate: info.sunsetDate });
    } else if (info.status === 'sunset') {
      sunset.push({ version, sunsetDate: info.sunsetDate });
    } else {
      active.push(version);
    }
  }

  return { deprecated, sunset, active };
}
