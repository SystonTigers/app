// Request Size Limits Middleware
// Prevents DOS attacks by limiting request body size

/**
 * Default size limits (in bytes)
 */
export const DEFAULT_LIMITS = {
  // Standard API requests (JSON)
  JSON_BODY: 1024 * 1024, // 1MB max for JSON requests

  // File uploads
  IMAGE_UPLOAD: 10 * 1024 * 1024, // 10MB max for images
  VIDEO_UPLOAD: 100 * 1024 * 1024, // 100MB max for videos
  DOCUMENT_UPLOAD: 25 * 1024 * 1024, // 25MB max for documents

  // Form data
  FORM_DATA: 50 * 1024 * 1024, // 50MB max for multipart form data

  // URL length
  URL_LENGTH: 2048, // Max URL length

  // Headers
  HEADER_SIZE: 16 * 1024, // 16KB max total headers
} as const;

/**
 * Validates request URL length
 */
export function validateUrlLength(req: Request, maxLength = DEFAULT_LIMITS.URL_LENGTH): Response | null {
  if (req.url.length > maxLength) {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: "URI_TOO_LONG",
        message: `URL exceeds maximum length of ${maxLength} characters`
      }
    }), {
      status: 414,
      headers: { "Content-Type": "application/json" }
    });
  }
  return null;
}

/**
 * Validates Content-Length header against limit
 * Returns error response if too large, null if OK
 */
export function validateContentLength(req: Request, maxSize: number): Response | null {
  const contentLength = req.headers.get("Content-Length");

  if (contentLength) {
    const size = parseInt(contentLength, 10);

    if (isNaN(size) || size < 0) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: "INVALID_CONTENT_LENGTH",
          message: "Invalid Content-Length header"
        }
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (size > maxSize) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: `Request body too large. Maximum size is ${formatBytes(maxSize)}`
        }
      }), {
        status: 413,
        headers: {
          "Content-Type": "application/json",
          "X-Max-Size": String(maxSize)
        }
      });
    }
  }

  return null;
}

/**
 * Determines the appropriate size limit based on Content-Type
 */
export function getLimitForContentType(contentType: string | null): number {
  if (!contentType) {
    return DEFAULT_LIMITS.JSON_BODY;
  }

  const ct = contentType.toLowerCase();

  // Multipart form data (file uploads)
  if (ct.includes("multipart/form-data")) {
    return DEFAULT_LIMITS.FORM_DATA;
  }

  // Video uploads
  if (ct.includes("video/")) {
    return DEFAULT_LIMITS.VIDEO_UPLOAD;
  }

  // Image uploads
  if (ct.includes("image/")) {
    return DEFAULT_LIMITS.IMAGE_UPLOAD;
  }

  // PDF and documents
  if (ct.includes("application/pdf") || ct.includes("application/msword") || ct.includes("application/vnd.")) {
    return DEFAULT_LIMITS.DOCUMENT_UPLOAD;
  }

  // Default to JSON body limit
  return DEFAULT_LIMITS.JSON_BODY;
}

/**
 * Main middleware function - validates request size
 * Returns error response if request is too large, null if OK
 */
export function validateRequestSize(req: Request, customLimit?: number): Response | null {
  // Check URL length first
  const urlError = validateUrlLength(req);
  if (urlError) {
    return urlError;
  }

  // Determine limit based on content type
  const contentType = req.headers.get("Content-Type");
  const limit = customLimit ?? getLimitForContentType(contentType);

  // Validate Content-Length
  return validateContentLength(req, limit);
}

/**
 * Reads and validates request body with size limit
 * Throws if body exceeds limit
 */
export async function readBodyWithLimit(req: Request, maxSize: number): Promise<ArrayBuffer> {
  const reader = req.body?.getReader();
  if (!reader) {
    return new ArrayBuffer(0);
  }

  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalSize += value.length;

      if (totalSize > maxSize) {
        reader.cancel();
        throw new PayloadTooLargeError(maxSize);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Combine chunks into single ArrayBuffer
  const combined = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined.buffer;
}

/**
 * Reads and validates JSON body with size limit
 */
export async function readJsonWithLimit<T = any>(req: Request, maxSize = DEFAULT_LIMITS.JSON_BODY): Promise<T> {
  const buffer = await readBodyWithLimit(req, maxSize);
  const text = new TextDecoder().decode(buffer);

  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidJsonError();
  }
}

/**
 * Custom error for payload too large
 */
export class PayloadTooLargeError extends Error {
  status = 413;
  code = "PAYLOAD_TOO_LARGE";

  constructor(public maxSize: number) {
    super(`Request body too large. Maximum size is ${formatBytes(maxSize)}`);
  }

  toResponse(): Response {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: this.code,
        message: this.message
      }
    }), {
      status: this.status,
      headers: {
        "Content-Type": "application/json",
        "X-Max-Size": String(this.maxSize)
      }
    });
  }
}

/**
 * Custom error for invalid JSON
 */
export class InvalidJsonError extends Error {
  status = 400;
  code = "INVALID_JSON";

  constructor() {
    super("Invalid JSON in request body");
  }

  toResponse(): Response {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: this.code,
        message: this.message
      }
    }), {
      status: this.status,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Creates middleware that validates request size
 * Usage: app.use(requestLimitsMiddleware());
 */
export function createRequestLimitsMiddleware(customLimits?: Partial<typeof DEFAULT_LIMITS>) {
  const limits = { ...DEFAULT_LIMITS, ...customLimits };

  return async (req: Request): Promise<Response | null> => {
    const contentType = req.headers.get("Content-Type");
    let limit: number;

    if (contentType?.includes("multipart/form-data")) {
      limit = limits.FORM_DATA;
    } else if (contentType?.includes("video/")) {
      limit = limits.VIDEO_UPLOAD;
    } else if (contentType?.includes("image/")) {
      limit = limits.IMAGE_UPLOAD;
    } else {
      limit = limits.JSON_BODY;
    }

    return validateRequestSize(req, limit);
  };
}
