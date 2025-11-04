import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOMPurify to strip dangerous HTML/JS while preserving safe formatting
 *
 * @param dirty - Untrusted HTML string from user input
 * @param options - Optional DOMPurify configuration
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * ```typescript
 * const userInput = '<script>alert("xss")</script><p>Safe content</p>';
 * const clean = sanitizeHtml(userInput);
 * // Result: '<p>Safe content</p>'
 * ```
 */
export function sanitizeHtml(
  dirty: string,
  options?: {
    ALLOWED_TAGS?: string[];
    ALLOWED_ATTR?: string[];
    ALLOW_DATA_ATTR?: boolean;
  }
): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  const config = {
    // Default allowed tags for user-generated content
    ALLOWED_TAGS: options?.ALLOWED_TAGS || [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
      'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'pre', 'code', 'hr', 'img'
    ],

    // Default allowed attributes
    ALLOWED_ATTR: options?.ALLOWED_ATTR || [
      'href', 'title', 'alt', 'src', 'class'
    ],

    // Allow data-* attributes if needed (default: false for security)
    ALLOW_DATA_ATTR: options?.ALLOW_DATA_ATTR || false,

    // Disallow unknown protocols (prevent javascript:, data:, etc.)
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,

    // Return a string (not DOM nodes)
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  };

  return DOMPurify.sanitize(dirty, config);
}

/**
 * Sanitize plain text content - strips ALL HTML tags
 * Use for fields that should not contain any HTML (usernames, titles, etc.)
 *
 * @param text - Untrusted text that may contain HTML
 * @returns Plain text with all HTML removed
 */
export function sanitizePlainText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize content for specific contexts
 */
export const sanitizers = {
  /**
   * Sanitize blog post or article content (rich HTML)
   */
  richContent: (html: string) => sanitizeHtml(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
      'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'pre', 'code', 'hr', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'class', 'id'],
  }),

  /**
   * Sanitize comment or chat message (basic HTML only)
   */
  comment: (html: string) => sanitizeHtml(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href', 'title'],
  }),

  /**
   * Sanitize username or display name (no HTML allowed)
   */
  displayName: (text: string) => sanitizePlainText(text),

  /**
   * Sanitize URL to prevent javascript: and data: protocols
   */
  url: (url: string): string => {
    if (!url || typeof url !== 'string') {
      return '';
    }

    // Remove any HTML
    const clean = sanitizePlainText(url);

    // Check for dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerUrl = clean.toLowerCase().trim();

    for (const protocol of dangerousProtocols) {
      if (lowerUrl.startsWith(protocol)) {
        return '';
      }
    }

    return clean;
  }
};
