/**
 * API Configuration
 * Contains API URLs, keys, and external service settings
 */

// ============================================================================
// API ENDPOINTS
// ============================================================================

const API_CONFIG = {
  CLOUDFLARE_WORKER: {
    baseUrl: 'https://syston-postbus.team-platform-2025.workers.dev',
    apiVersion: 'v1',
    timeout: 30000
  },

  ADMIN_CONSOLE: {
    baseUrl: 'https://admin-console.team-platform-2025.workers.dev'
  },

  FA_FULL_TIME: {
    baseUrl: 'https://fulltime.thefa.com',
    // Add specific league/team URLs as needed
  }
};

/**
 * Get API endpoint URL
 */
function getApiEndpoint(service, path) {
  const config = API_CONFIG[service];
  if (!config) {
    throw new Error(`Unknown API service: ${service}`);
  }

  let url = config.baseUrl;

  if (service === 'CLOUDFLARE_WORKER' && path) {
    url += `/api/${config.apiVersion}${path}`;
  } else if (path) {
    url += path;
  }

  return url;
}

/**
 * Get API timeout for a service
 */
function getApiTimeout(service) {
  const config = API_CONFIG[service];
  return config?.timeout || 30000; // Default 30s
}
