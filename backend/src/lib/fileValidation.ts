/**
 * File Upload Validation Utilities
 * Provides security validation for file uploads including:
 * - MIME type validation
 * - Magic bytes verification (file signature)
 * - File size limits
 * - Extension whitelist
 */

/**
 * Magic bytes (file signatures) for common file types
 * Source: https://en.wikipedia.org/wiki/List_of_file_signatures
 */
const FILE_SIGNATURES = {
  // Images
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a, GIF89a
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP container)

  // Videos
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp at offset 4
    [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]
  ],
  'video/quicktime': [[0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74]], // ftypqt
  'video/x-msvideo': [[0x52, 0x49, 0x46, 0x46]], // AVI (RIFF)
  'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // WebM (EBML)

  // Documents (if needed in future)
  'application/pdf': [[0x25, 0x50, 0x44, 0x46, 0x2D]], // %PDF-
};

/**
 * Allowed file extensions for each MIME type
 */
const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4', '.m4v'],
  'video/quicktime': ['.mov', '.qt'],
  'video/x-msvideo': ['.avi'],
  'video/webm': ['.webm'],
};

/**
 * Default file size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024,      // 10 MB
  VIDEO: 500 * 1024 * 1024,     // 500 MB
  DOCUMENT: 25 * 1024 * 1024,   // 25 MB
};

/**
 * File validation error codes
 */
export enum FileValidationError {
  INVALID_TYPE = 'INVALID_FILE_TYPE',
  INVALID_SIGNATURE = 'INVALID_FILE_SIGNATURE',
  INVALID_EXTENSION = 'INVALID_FILE_EXTENSION',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  MIME_MISMATCH = 'MIME_MISMATCH',
}

export interface FileValidationResult {
  valid: boolean;
  error?: {
    code: FileValidationError;
    message: string;
  };
}

/**
 * Verify file magic bytes match expected signature for MIME type
 */
async function verifyMagicBytes(file: File, mimeType: string): Promise<boolean> {
  const signatures = FILE_SIGNATURES[mimeType as keyof typeof FILE_SIGNATURES];
  if (!signatures) {
    // No signature validation available for this type
    return true;
  }

  // Read first 32 bytes to check signature
  const headerSize = 32;
  const arrayBuffer = await file.slice(0, headerSize).arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Check if any signature matches
  for (const signature of signatures) {
    let matches = true;
    for (let i = 0; i < signature.length; i++) {
      if (bytes[i] !== signature[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return true;
    }
  }

  return false;
}

/**
 * Validate file extension matches MIME type
 */
function validateExtension(filename: string, mimeType: string): boolean {
  const allowedExts = ALLOWED_EXTENSIONS[mimeType];
  if (!allowedExts) {
    // No extension validation for this MIME type
    return true;
  }

  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext) {
    return false;
  }

  return allowedExts.includes(ext);
}

/**
 * Comprehensive file validation
 * Validates MIME type, file signature (magic bytes), extension, and size
 */
export async function validateFile(
  file: File,
  options: {
    allowedMimeTypes: string[];
    maxSize: number;
    validateMagicBytes?: boolean;
  }
): Promise<FileValidationResult> {
  const { allowedMimeTypes, maxSize, validateMagicBytes = true } = options;

  // 1. Check MIME type is in whitelist
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: {
        code: FileValidationError.INVALID_TYPE,
        message: `File type ${file.type} not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`
      }
    };
  }

  // 2. Validate file extension matches MIME type
  if (!validateExtension(file.name, file.type)) {
    return {
      valid: false,
      error: {
        code: FileValidationError.INVALID_EXTENSION,
        message: `File extension does not match MIME type ${file.type}`
      }
    };
  }

  // 3. Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: {
        code: FileValidationError.FILE_TOO_LARGE,
        message: `File size ${fileSizeMB}MB exceeds maximum ${maxSizeMB}MB`
      }
    };
  }

  // 4. Verify magic bytes (file signature)
  if (validateMagicBytes) {
    const signatureValid = await verifyMagicBytes(file, file.type);
    if (!signatureValid) {
      return {
        valid: false,
        error: {
          code: FileValidationError.INVALID_SIGNATURE,
          message: `File signature does not match declared type ${file.type}`
        }
      };
    }
  }

  return { valid: true };
}

/**
 * Preset validation configurations for common file types
 */
export const fileValidators = {
  /**
   * Validate image upload (JPEG, PNG, GIF, WebP)
   */
  image: async (file: File): Promise<FileValidationResult> => {
    return validateFile(file, {
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ],
      maxSize: FILE_SIZE_LIMITS.IMAGE,
      validateMagicBytes: true
    });
  },

  /**
   * Validate video upload (MP4, MOV, AVI, WebM)
   */
  video: async (file: File): Promise<FileValidationResult> => {
    return validateFile(file, {
      allowedMimeTypes: [
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm'
      ],
      maxSize: FILE_SIZE_LIMITS.VIDEO,
      validateMagicBytes: true
    });
  },

  /**
   * Validate profile image (stricter - JPEG and PNG only)
   */
  profileImage: async (file: File): Promise<FileValidationResult> => {
    return validateFile(file, {
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      maxSize: 5 * 1024 * 1024, // 5 MB for profile images
      validateMagicBytes: true
    });
  }
};

/**
 * Helper to extract validation error for API responses
 */
export function getValidationErrorResponse(result: FileValidationResult) {
  if (result.valid) {
    return null;
  }

  return {
    success: false,
    error: {
      code: result.error?.code || 'VALIDATION_ERROR',
      message: result.error?.message || 'File validation failed'
    }
  };
}
