/**
 * Tenant Configuration
 * Contains tenant IDs, sheet IDs, and tenant-specific settings
 */

// ============================================================================
// TENANT IDS
// ============================================================================

const TENANT_CONFIGS = {
  'syston-tigers': {
    tenantId: 'syston-tigers',
    name: 'Syston Tigers',

    // Sheet IDs
    SHEETS: {
      FIXTURES: '1ABC...',  // TODO: Add actual sheet IDs
      RESULTS: '1XYZ...',
      PLAYERS: '1DEF...',
      ATTENDANCE: '1GHI...',
      VOTES: '1JKL...'
    },

    // Google Drive folder IDs
    FOLDERS: {
      VIDEOS: '1FOLDER_ID_VIDEOS',
      HIGHLIGHTS: '1FOLDER_ID_HIGHLIGHTS',
      GRAPHICS: '1FOLDER_ID_GRAPHICS'
    },

    // YouTube channel
    YOUTUBE: {
      CHANNEL_ID: 'UCxxx...',
      PLAYLIST_ID: 'PLxxx...'
    }
  }

  // Add more tenants as needed
};

/**
 * Get tenant configuration by tenant ID
 */
function getTenantConfigByKey(tenantId) {
  return TENANT_CONFIGS[tenantId] || null;
}

/**
 * Get all tenant IDs
 */
function getAllTenantIds() {
  return Object.keys(TENANT_CONFIGS);
}
