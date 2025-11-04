/**
 * RS256 JWT Implementation
 * Asymmetric signing using public/private key pairs
 *
 * Benefits over HS256 (symmetric):
 * - Public key can be shared for verification (no secret exposure)
 * - Better for multi-service architectures
 * - Enhanced security for distributed systems
 * - Enables third-party verification
 *
 * Use Cases:
 * - Microservices architecture
 * - API gateway scenarios
 * - Third-party integrations
 * - Mobile app SDK distribution
 */

import { SignJWT, jwtVerify, importPKCS8, importSPKI } from 'jose';
import type { Claims } from './jwt';
import { logJSON } from '../lib/log';

/**
 * RS256 JWT Configuration
 */
export interface RS256Config {
  privateKey: string;  // PEM-encoded private key
  publicKey: string;   // PEM-encoded public key
  issuer: string;
  audience: string;
}

/**
 * Generate RS256 key pair
 * Run this once to generate keys, then store securely
 *
 * @example
 * ```bash
 * # Generate keys using OpenSSL
 * openssl genrsa -out private_key.pem 2048
 * openssl rsa -in private_key.pem -pubout -out public_key.pem
 * ```
 */
export async function generateRS256KeyPair(): Promise<{
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  privateKeyPEM: string;
  publicKeyPEM: string;
}> {
  // Generate RSA key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // extractable
    ['sign', 'verify']
  );

  // Export private key to PEM
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const privateKeyPEM = bufferToPEM(privateKeyBuffer, 'PRIVATE KEY');

  // Export public key to PEM
  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyPEM = bufferToPEM(publicKeyBuffer, 'PUBLIC KEY');

  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    privateKeyPEM,
    publicKeyPEM,
  };
}

/**
 * Convert buffer to PEM format
 */
function bufferToPEM(buffer: ArrayBuffer, type: string): string {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const chunks = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type}-----\n${chunks.join('\n')}\n-----END ${type}-----`;
}

/**
 * Sign JWT using RS256 (private key)
 *
 * @param payload - JWT payload
 * @param config - RS256 configuration
 * @param ttlMinutes - Token lifetime in minutes
 * @returns Signed JWT token
 *
 * @example
 * ```typescript
 * const token = await signRS256JWT({
 *   sub: 'user-123',
 *   tenantId: 'tenant-abc',
 *   roles: ['admin'],
 * }, config, 60);
 * ```
 */
export async function signRS256JWT(
  payload: Record<string, any>,
  config: RS256Config,
  ttlMinutes: number = 60
): Promise<string> {
  try {
    // Import private key
    const privateKey = await importPKCS8(config.privateKey, 'RS256');

    // Create JWT
    const jwt = new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuedAt()
      .setIssuer(config.issuer)
      .setAudience(config.audience)
      .setExpirationTime(`${ttlMinutes}m`);

    // Add jti (JWT ID) for revocation support
    if (!payload.jti) {
      jwt.setJti(crypto.randomUUID());
    }

    // Sign and return
    return await jwt.sign(privateKey);
  } catch (error) {
    logJSON({
      level: 'error',
      msg: 'rs256_jwt_sign_error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to sign RS256 JWT');
  }
}

/**
 * Verify JWT using RS256 (public key)
 *
 * @param token - JWT token to verify
 * @param config - RS256 configuration
 * @returns Verified JWT payload
 *
 * @example
 * ```typescript
 * const claims = await verifyRS256JWT(token, config);
 * console.log(claims.sub); // user-123
 * ```
 */
export async function verifyRS256JWT(
  token: string,
  config: RS256Config
): Promise<Claims> {
  try {
    // Import public key
    const publicKey = await importSPKI(config.publicKey, 'RS256');

    // Verify JWT
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: config.issuer,
      audience: config.audience,
      clockTolerance: 300, // 5 minutes
    });

    // Normalize claims to match existing Claims type
    return normalizeClaims(payload);
  } catch (error) {
    logJSON({
      level: 'warn',
      msg: 'rs256_jwt_verify_error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Invalid or expired RS256 JWT');
  }
}

/**
 * Normalize JWT claims to standard format
 */
function normalizeClaims(payload: any): Claims {
  return {
    sub: payload.sub || '',
    userId: payload.userId || payload.user_id || payload.sub,
    tenantId: payload.tenantId || payload.tenant_id,
    roles: Array.isArray(payload.roles) ? payload.roles :
           payload.role ? [payload.role] : [],
    exp: payload.exp,
    iat: payload.iat,
    iss: payload.iss,
    aud: payload.aud,
  };
}

/**
 * Issue tenant admin JWT with RS256
 */
export async function issueTenantAdminJWTRS256(
  config: RS256Config,
  options: {
    tenant_id: string;
    user_id?: string;
    ttlMinutes?: number;
  }
): Promise<string> {
  const payload = {
    sub: options.user_id || `admin-${options.tenant_id}`,
    userId: options.user_id,
    tenantId: options.tenant_id,
    tenant_id: options.tenant_id,
    roles: ['tenant_admin', 'admin'],
  };

  return signRS256JWT(payload, config, options.ttlMinutes || 60);
}

/**
 * Issue platform admin JWT with RS256
 */
export async function issuePlatformAdminJWTRS256(
  config: RS256Config,
  options: {
    user_id?: string;
    ttlMinutes?: number;
  }
): Promise<string> {
  const payload = {
    sub: options.user_id || 'platform-admin',
    userId: options.user_id,
    roles: ['platform_admin', 'admin'],
  };

  return signRS256JWT(payload, config, options.ttlMinutes || 60);
}

/**
 * Issue tenant member JWT with RS256
 */
export async function issueTenantMemberJWTRS256(
  config: RS256Config,
  options: {
    tenant_id: string;
    user_id: string;
    roles?: string[];
    ttlMinutes?: number;
  }
): Promise<string> {
  const payload = {
    sub: options.user_id,
    userId: options.user_id,
    tenantId: options.tenant_id,
    tenant_id: options.tenant_id,
    roles: options.roles || ['tenant_member'],
  };

  return signRS256JWT(payload, config, options.ttlMinutes || 60);
}

/**
 * Hybrid JWT Service - Supports both HS256 and RS256
 */
export class HybridJWTService {
  private hs256Secret?: string;
  private rs256Config?: RS256Config;
  private preferRS256: boolean;

  constructor(options: {
    hs256Secret?: string;
    rs256Config?: RS256Config;
    preferRS256?: boolean;
  }) {
    this.hs256Secret = options.hs256Secret;
    this.rs256Config = options.rs256Config;
    this.preferRS256 = options.preferRS256 ?? false;
  }

  /**
   * Sign JWT using preferred algorithm
   */
  async sign(payload: Record<string, any>, ttlMinutes: number = 60): Promise<string> {
    if (this.preferRS256 && this.rs256Config) {
      return signRS256JWT(payload, this.rs256Config, ttlMinutes);
    }

    // Fall back to HS256
    if (!this.hs256Secret) {
      throw new Error('No JWT signing method configured');
    }

    // Use existing HS256 implementation
    throw new Error('HS256 implementation should be used from existing jwt.ts');
  }

  /**
   * Verify JWT - auto-detects algorithm from header
   */
  async verify(token: string): Promise<Claims> {
    // Decode header to determine algorithm
    const [headerB64] = token.split('.');
    const header = JSON.parse(atob(headerB64));

    if (header.alg === 'RS256' && this.rs256Config) {
      return verifyRS256JWT(token, this.rs256Config);
    }

    if (header.alg === 'HS256' && this.hs256Secret) {
      // Use existing HS256 implementation
      throw new Error('HS256 verification should be used from existing jwt.ts');
    }

    throw new Error(`Unsupported JWT algorithm: ${header.alg}`);
  }
}

/**
 * Get JWT public key for verification (JWKS endpoint)
 * Use this to expose public key for third-party verification
 *
 * @param config - RS256 configuration
 * @returns JWKS format public key
 */
export async function getJWKS(config: RS256Config): Promise<{
  keys: Array<{
    kty: string;
    use: string;
    alg: string;
    kid: string;
    n: string;
    e: string;
  }>;
}> {
  // Import public key
  const publicKey = await importSPKI(config.publicKey, 'RS256');

  // Export to JWK format
  const jwk = await crypto.subtle.exportKey('jwk', publicKey);

  return {
    keys: [
      {
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: 'rs256-key-1',
        n: jwk.n!,
        e: jwk.e!,
      },
    ],
  };
}
