/**
 * @fileoverview Version management for SystonAutomationLib
 * @version 1.0.0
 */

// Update on each release
const LIB_VERSION = '1.0.0';

/**
 * Get the current library version
 * @return {string} Current version number
 */
function getLibraryVersion() {
  return LIB_VERSION;
}

/**
 * Get version info with metadata
 * @return {Object} Version information
 */
function SA_getVersionInfo() {
  return {
    version: LIB_VERSION,
    releaseDate: '2025-01-27',
    features: [
      'Configuration management',
      'Privacy compliance (GDPR)',
      'Monitoring and health checks',
      'Security and caching',
      'Automated posting pipeline',
      'Setup wizard integration'
    ],
    compatibility: {
      minGoogleAppsScript: '2023.01',
      requiredScopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/script.projects'
      ]
    }
  };
}