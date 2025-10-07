/**
 * @fileoverview Security utilities for SystonAutomationLib
 * @version 1.0.0
 * @description Basic security functions and input validation
 */

/**
 * Validate and sanitize user input
 * @param {*} input - Input to validate
 * @param {string} type - Type of validation (text, email, number, date)
 * @param {Object} options - Validation options
 * @return {Object} Validation result
 */
function SA_validateInput_(input, type = 'text', options = {}) {
  const result = {
    valid: false,
    sanitized: null,
    errors: []
  };

  try {
    if (SA_isEmpty_(input) && !options.required) {
      result.valid = true;
      result.sanitized = '';
      return result;
    }

    if (SA_isEmpty_(input) && options.required) {
      result.errors.push('Field is required');
      return result;
    }

    switch (type) {
      case 'text':
        result.sanitized = SA_sanitizeText_(input, options.maxLength || 500);
        result.valid = true;
        break;

      case 'email':
        result.sanitized = String(input).trim().toLowerCase();
        result.valid = SA_isValidEmail_(result.sanitized);
        if (!result.valid) {
          result.errors.push('Invalid email format');
        }
        break;

      case 'number':
        const num = Number(input);
        if (isNaN(num)) {
          result.errors.push('Invalid number');
        } else {
          result.sanitized = num;
          result.valid = true;

          if (options.min !== undefined && num < options.min) {
            result.errors.push(`Number must be at least ${options.min}`);
            result.valid = false;
          }
          if (options.max !== undefined && num > options.max) {
            result.errors.push(`Number must be at most ${options.max}`);
            result.valid = false;
          }
        }
        break;

      case 'date':
        result.sanitized = SA_parseDate_(input);
        result.valid = result.sanitized !== null;
        if (!result.valid) {
          result.errors.push('Invalid date format');
        }
        break;

      case 'player_name':
        // Special validation for player names
        const cleanName = SA_sanitizeText_(input, 50);
        if (cleanName.length < 2) {
          result.errors.push('Player name must be at least 2 characters');
        } else if (!/^[a-zA-Z\s\-'\.]+$/.test(cleanName)) {
          result.errors.push('Player name contains invalid characters');
        } else {
          result.sanitized = cleanName;
          result.valid = true;
        }
        break;

      case 'url':
        const urlString = String(input).trim();
        try {
          new URL(urlString);
          result.sanitized = urlString;
          result.valid = true;
        } catch (urlError) {
          result.errors.push('Invalid URL format');
        }
        break;

      case 'color':
        const colorString = String(input).trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(colorString)) {
          result.sanitized = colorString.toUpperCase();
          result.valid = true;
        } else {
          result.errors.push('Color must be in hex format (#RRGGBB)');
        }
        break;

      default:
        result.sanitized = SA_sanitizeText_(input);
        result.valid = true;
    }

    return result;

  } catch (error) {
    SA_log_('ERROR', 'Input validation failed', {
      type, input, error: error.toString()
    });
    result.errors.push('Validation error: ' + error.toString());
    return result;
  }
}

/**
 * Check if user has required permissions
 * @param {string} requiredRole - Required role (admin, editor, viewer)
 * @return {Object} Permission check result
 */
function SA_checkPermissions_(requiredRole = 'viewer') {
  try {
    const userEmail = Session.getActiveUser().getEmail();

    // If no user email, they're not authenticated
    if (!userEmail) {
      return {
        allowed: false,
        reason: 'Not authenticated',
        userEmail: null
      };
    }

    // For now, simple permission model
    // In production, this would check against a permissions sheet or config
    const cfg = SA_cfg_();
    const adminEmails = (cfg.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

    const isAdmin = adminEmails.includes(userEmail.toLowerCase());

    switch (requiredRole) {
      case 'admin':
        return {
          allowed: isAdmin,
          reason: isAdmin ? 'Admin access granted' : 'Admin access required',
          userEmail: userEmail,
          role: isAdmin ? 'admin' : 'user'
        };

      case 'editor':
        // For now, treat editor same as admin
        return {
          allowed: isAdmin,
          reason: isAdmin ? 'Editor access granted' : 'Editor access required',
          userEmail: userEmail,
          role: isAdmin ? 'editor' : 'user'
        };

      case 'viewer':
        // Anyone authenticated can view
        return {
          allowed: true,
          reason: 'Viewer access granted',
          userEmail: userEmail,
          role: isAdmin ? 'admin' : 'viewer'
        };

      default:
        return {
          allowed: false,
          reason: 'Unknown role: ' + requiredRole,
          userEmail: userEmail
        };
    }

  } catch (error) {
    SA_log_('ERROR', 'Permission check failed', {
      requiredRole, error: error.toString()
    });
    return {
      allowed: false,
      reason: 'Permission check error',
      error: error.toString()
    };
  }
}

/**
 * Rate limiting check (simple implementation)
 * @param {string} key - Rate limit key (e.g., user email or action)
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMinutes - Time window in minutes
 * @return {Object} Rate limit result
 */
function SA_checkRateLimit_(key, maxRequests = 60, windowMinutes = 60) {
  try {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const rateLimitKey = `ratelimit_${key}`;

    // Get current rate limit data
    const cached = SA_Cache_.get(rateLimitKey);
    let requests = cached ? cached.requests || [] : [];

    // Remove old requests outside the window
    requests = requests.filter(timestamp => (now - timestamp) < windowMs);

    // Check if limit exceeded
    if (requests.length >= maxRequests) {
      SA_log_('WARN', 'Rate limit exceeded', {
        key, requests: requests.length, maxRequests, windowMinutes
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(Math.min(...requests) + windowMs),
        total: maxRequests
      };
    }

    // Add current request
    requests.push(now);

    // Update cache
    SA_Cache_.set(rateLimitKey, { requests }, windowMinutes);

    return {
      allowed: true,
      remaining: maxRequests - requests.length,
      resetTime: new Date(now + windowMs),
      total: maxRequests
    };

  } catch (error) {
    SA_log_('ERROR', 'Rate limit check failed', {
      key, error: error.toString()
    });
    // Fail open - allow the request if rate limiting fails
    return {
      allowed: true,
      remaining: maxRequests,
      error: error.toString()
    };
  }
}

/**
 * Generate secure session token
 * @return {string} Session token
 */
function SA_generateSessionToken_() {
  try {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const uuid = Utilities.getUuid();

    return `${timestamp}_${random}_${uuid}`.replace(/-/g, '');
  } catch (error) {
    // Fallback
    return `${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

/**
 * Hash a password or sensitive data (simple implementation)
 * @param {string} data - Data to hash
 * @param {string} salt - Optional salt
 * @return {string} Hashed data
 */
function SA_hashData_(data, salt = '') {
  try {
    const combined = data + salt + 'syston_automation_lib';
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, combined);

    return digest.map(byte => (byte & 0xFF).toString(16).padStart(2, '0')).join('');
  } catch (error) {
    SA_log_('ERROR', 'Data hashing failed', { error: error.toString() });
    throw error;
  }
}

/**
 * Verify webhook signature (basic implementation)
 * @param {string} payload - Webhook payload
 * @param {string} signature - Received signature
 * @param {string} secret - Webhook secret
 * @return {boolean} Signature valid
 */
function SA_verifyWebhookSignature_(payload, signature, secret) {
  try {
    if (!payload || !signature || !secret) {
      return false;
    }

    const expectedSignature = SA_hashData_(payload, secret);
    return signature === expectedSignature;

  } catch (error) {
    SA_log_('ERROR', 'Webhook signature verification failed', {
      error: error.toString()
    });
    return false;
  }
}

/**
 * Audit log security event
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 */
function SA_auditSecurityEvent_(event, details = {}) {
  try {
    const auditData = {
      timestamp: new Date(),
      event: event,
      user: Session.getActiveUser().getEmail() || 'anonymous',
      details: details,
      sessionId: Session.getTemporaryActiveUserKey() || 'unknown'
    };

    SA_log_('INFO', `Security event: ${event}`, auditData);

    // Could also log to a separate security audit sheet
    // For now, regular logging is sufficient

  } catch (error) {
    // Silent fail - don't break security operations
    console.error('Security audit logging failed:', error);
  }
}

/**
 * Check for suspicious activity patterns
 * @param {string} userEmail - User email
 * @return {Object} Suspicion check result
 */
function SA_checkSuspiciousActivity_(userEmail) {
  try {
    if (!userEmail) {
      return { suspicious: true, reason: 'No user identification' };
    }

    // Simple checks for suspicious patterns
    const rateLimitCheck = SA_checkRateLimit_(`suspicious_${userEmail}`, 100, 60);

    if (!rateLimitCheck.allowed) {
      return {
        suspicious: true,
        reason: 'Excessive activity rate',
        details: rateLimitCheck
      };
    }

    // Additional checks could be added here:
    // - Unusual access patterns
    // - Failed authentication attempts
    // - Suspicious input patterns

    return {
      suspicious: false,
      reason: 'Activity appears normal'
    };

  } catch (error) {
    SA_log_('ERROR', 'Suspicious activity check failed', {
      userEmail, error: error.toString()
    });
    return {
      suspicious: false,
      reason: 'Check failed, allowing activity',
      error: error.toString()
    };
  }
}