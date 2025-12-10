/**
 * Webhooks Configuration
 * Contains Make.com and other webhook URLs
 */

// ============================================================================
// MAKE.COM WEBHOOKS
// ============================================================================

const WEBHOOK_CONFIG = {
  MAKE: {
    // Match events
    FIXTURE_UPDATED: 'https://hook.eu2.make.com/xxx',
    RESULT_POSTED: 'https://hook.eu2.make.com/xxx',

    // Video processing
    VIDEO_UPLOADED: 'https://hook.eu2.make.com/xxx',
    HIGHLIGHT_READY: 'https://hook.eu2.make.com/xxx',

    // Player events
    ATTENDANCE_RECORDED: 'https://hook.eu2.make.com/xxx',
    VOTE_SUBMITTED: 'https://hook.eu2.make.com/xxx',

    // League sync
    FA_SYNC_COMPLETED: 'https://hook.eu2.make.com/xxx',
    FA_SYNC_FAILED: 'https://hook.eu2.make.com/xxx'
  },

  CLOUDFLARE: {
    // Webhooks back to Cloudflare Worker
    VIDEO_PROCESSING_COMPLETE: 'https://syston-postbus.team-platform-2025.workers.dev/api/v1/webhooks/video-complete'
  },

  // Retry configuration
  RETRY: {
    maxAttempts: 3,
    backoffMs: 1000,
    timeout: 30000
  }
};

/**
 * Get webhook URL by name
 */
function getWebhook(service, webhookName) {
  const serviceConfig = WEBHOOK_CONFIG[service];
  if (!serviceConfig) {
    throw new Error(`Unknown webhook service: ${service}`);
  }

  return serviceConfig[webhookName];
}

/**
 * Send webhook with retry logic
 */
function sendWebhook(url, payload, options = {}) {
  const maxAttempts = options.maxAttempts || WEBHOOK_CONFIG.RETRY.maxAttempts;
  const timeout = options.timeout || WEBHOOK_CONFIG.RETRY.timeout;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        timeout: timeout
      });

      if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
        return { success: true, response: response.getContentText() };
      }

      if (attempt < maxAttempts) {
        Utilities.sleep(WEBHOOK_CONFIG.RETRY.backoffMs * attempt);
      }

    } catch (err) {
      if (attempt === maxAttempts) {
        return { success: false, error: err.message };
      }
      Utilities.sleep(WEBHOOK_CONFIG.RETRY.backoffMs * attempt);
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}
