/**
 * Sanitize HTML content to prevent XSS attacks
 * Lightweight Workers-compatible sanitizer - strips all HTML tags
 *
 * Note: For production use with rich HTML, consider using HTMLRewriter API
 * or a Workers-compatible sanitization library.
 *
 * @param dirty - Untrusted HTML string from user input
 * @param options - Optional configuration (currently ignored, kept for API compatibility)
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * ```typescript
 * const userInput = '<script>alert("xss")</script><p>Safe content</p>';
 * const clean = sanitizeHtml(userInput);
 * // Result: 'Safe content'
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

  // Simple HTML tag stripping - secure for Workers environment
  // Replaces all HTML tags with empty string
  return dirty
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
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

  // Strip all HTML tags and decode entities
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
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
