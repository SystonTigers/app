/**
 * Mock DOMPurify for tests
 * Since isomorphic-dompurify requires DOM/window which isn't available in test environment
 */

interface SanitizeConfig {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  ALLOW_DATA_ATTR?: boolean;
  ALLOWED_URI_REGEXP?: RegExp;
  RETURN_DOM?: boolean;
  RETURN_DOM_FRAGMENT?: boolean;
}

/**
 * Simple mock sanitizer that removes script tags and dangerous attributes
 * This is a basic mock for testing - production uses real DOMPurify
 */
function sanitize(dirty: string, config?: SanitizeConfig): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  let clean = dirty;

  // Remove script tags
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  clean = clean.replace(/javascript:/gi, '');

  // If no tags allowed, strip all HTML
  if (config?.ALLOWED_TAGS && config.ALLOWED_TAGS.length === 0) {
    clean = clean.replace(/<[^>]*>/g, '');
  }

  return clean;
}

const DOMPurify = {
  sanitize,
};

export default DOMPurify;
