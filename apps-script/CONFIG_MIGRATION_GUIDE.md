# Configuration Migration Guide

## Overview

The monolithic `config.gs` (78KB) has been split into modular files for better maintainability.

## New Structure

```
apps-script/
└── config/
    ├── index.gs         # Central export point & helper functions
    ├── tenant.gs        # Tenant IDs, sheet IDs, folder IDs
    ├── features.gs      # Feature flags
    ├── api.gs           # API endpoints and URLs
    ├── youtube.gs       # YouTube settings
    └── webhooks.gs      # Make.com webhook URLs
```

## Migration Steps

### 1. Immediate (No Breaking Changes)

The old `config.gs` has been updated with forwarding logic. Your existing code will continue to work.

### 2. Gradual Migration (Over Next 2 Weeks)

Update your code to use the new helper functions:

#### OLD WAY:
```javascript
// Direct access to global constants
const sheetId = SYSTON_TIGERS_SHEETS.FIXTURES;
const workerUrl = CLOUDFLARE_WORKER_BASE_URL;
const webhookUrl = MAKE_WEBHOOK_RESULT_POSTED;
```

#### NEW WAY:
```javascript
// Use helper functions from config/index.gs
const tenant = getTenantConfig('syston-tigers');
const sheetId = tenant.SHEETS.FIXTURES;

const workerUrl = getApiEndpoint('CLOUDFLARE_WORKER', '/results');

const webhookUrl = getWebhook('MAKE', 'RESULT_POSTED');
```

### 3. Key Helper Functions

#### `getTenantConfig(tenantId)`
Get all configuration for a tenant:
```javascript
const tenant = getTenantConfig('syston-tigers');
console.log(tenant.SHEETS.FIXTURES);
console.log(tenant.FOLDERS.VIDEOS);
console.log(tenant.YOUTUBE.CHANNEL_ID);
```

#### `getApiEndpoint(service, path)`
Get API URLs:
```javascript
const url = getApiEndpoint('CLOUDFLARE_WORKER', '/videos/upload');
// Returns: https://syston-postbus.team-platform-2025.workers.dev/api/v1/videos/upload
```

#### `isFeatureEnabled(feature, subFeature)`
Check feature flags:
```javascript
if (isFeatureEnabled('VIDEO_PROCESSING', 'highlightGeneration')) {
  // Generate highlights
}
```

#### `getWebhook(service, name)`
Get webhook URLs:
```javascript
const url = getWebhook('MAKE', 'VIDEO_UPLOADED');
sendWebhook(url, payload);
```

### 4. Environment Validation

Add to your initialization code:
```javascript
function onOpen() {
  const validation = validateEnvironment();
  if (!validation.valid) {
    Logger.log('Configuration errors:');
    validation.errors.forEach(err => Logger.log(`  - ${err}`));
  }
}
```

### 5. Configuration Summary

Debug configuration:
```javascript
function debugConfig() {
  logConfigSummary();
  // Logs:
  // - All tenant IDs
  // - Enabled features
  // - Available API endpoints
  // - Configured webhooks
  // - Environment validation results
}
```

## Migration Checklist

- [ ] **Week 1**: Update high-traffic functions (fixture updates, result posting)
- [ ] **Week 2**: Update video processing functions
- [ ] **Week 3**: Update attendance and voting functions
- [ ] **Week 4**: Remove old `config.gs` after all references are updated

## File-by-File Migration Example

### Before (`Code.gs`):
```javascript
function updateFixture(fixtureData) {
  const sheetId = SYSTON_TIGERS_SHEETS.FIXTURES;
  const workerUrl = CLOUDFLARE_WORKER_BASE_URL + '/api/v1/fixtures';
  const webhookUrl = MAKE_WEBHOOK_FIXTURE_UPDATED;

  // ... rest of function
}
```

### After (`Code.gs`):
```javascript
function updateFixture(fixtureData) {
  const tenant = getTenantConfig('syston-tigers');
  const sheetId = tenant.SHEETS.FIXTURES;
  const workerUrl = getApiEndpoint('CLOUDFLARE_WORKER', '/fixtures');
  const webhookUrl = getWebhook('MAKE', 'FIXTURE_UPDATED');

  // ... rest of function (unchanged)
}
```

## Benefits

1. **Smaller files**: Easier to navigate and edit
2. **Clear separation**: Each config type has its own file
3. **Type safety**: Helper functions provide validation
4. **Environment checks**: `validateEnvironment()` catches missing config early
5. **Easier testing**: Mock individual config modules instead of the entire config
6. **Better version control**: Git diffs show exactly what config changed

## Rollback Plan

If you encounter issues:

1. The old `config.gs` still exists with forwarding logic
2. Your existing code will continue to work
3. You can revert individual functions back to the old approach
4. No need to rollback everything at once

## Questions?

If you're unsure how to migrate a specific piece of code:

1. Check this guide for examples
2. Look at `config/index.gs` for available helper functions
3. Use `logConfigSummary()` to see what configuration is available
4. Test in a development environment first

## Timeline

- **Today**: New config files deployed, old `config.gs` has forwarding logic
- **Week 1-2**: Gradually migrate references to use new helper functions
- **Week 3**: Test thoroughly, verify all functions work
- **Week 4**: Remove old `config.gs` if all migrations complete

Target completion: 2 weeks from deployment
